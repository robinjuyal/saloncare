package com.salonqueue.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.salonqueue.dto.request.CreatePaymentOrderRequest;
import com.salonqueue.dto.response.PaymentOrderResponse;
import com.salonqueue.entity.*;
import com.salonqueue.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingServiceItemRepository bookingServiceItemRepository;
    private final SalonRepository salonRepository;
    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;
    private final QueueService queueService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Customer clicks "Pay Now"
    // Creates a Booking (PENDING_PAYMENT) + Razorpay Order
    // Returns order details to frontend to open the checkout popup
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public PaymentOrderResponse createPaymentOrder(CreatePaymentOrderRequest request,
                                                   Long customerId) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Salon salon = salonRepository.findById(request.getSalonId())
                .orElseThrow(() -> new RuntimeException("Salon not found"));

        List<com.salonqueue.entity.Service> services = serviceRepository.findAllById(request.getServiceIds());

        if (services.size() != request.getServiceIds().size()) {
            throw new RuntimeException("One or more selected services could not be found");
        }
        // Every selected service must belong to the salon being booked —
        // without this check, a crafted request could mix services from
        // two different salons into one booking (wrong salon gets paid,
        // wrong salon's queue gets the entry).
        boolean allBelongToSalon = services.stream()
                .allMatch(s -> s.getSalon().getId().equals(salon.getId()));
        if (!allBelongToSalon) {
            throw new RuntimeException("Selected services do not all belong to this salon");
        }

        BigDecimal totalAmount = services.stream()
                .map(com.salonqueue.entity.Service::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        String combinedServiceName = services.stream()
                .map(com.salonqueue.entity.Service::getName)
                .collect(Collectors.joining(" + "));

        // Create booking in PENDING_PAYMENT state — NOT added to queue yet
        String bookingCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .customer(customer)
                .salon(salon)
                .scheduledTime(LocalDateTime.now())
                .status(Booking.BookingStatus.PENDING_PAYMENT)
                .amount(totalAmount)
                .paymentCompleted(false)
                .notes(request.getNotes())
                .build();
        booking = bookingRepository.save(booking);

        // One BookingServiceItem per selected service — see that entity for
        // why each snapshots its own name/price/duration rather than
        // referencing the live Service row.
        for (com.salonqueue.entity.Service service : services) {
            BookingServiceItem item = BookingServiceItem.builder()
                    .booking(booking)
                    .service(service)
                    .serviceName(service.getName())
                    .price(service.getPrice())
                    .durationMinutes(service.getDurationMinutes())
                    .build();
            bookingServiceItemRepository.save(item);
        }

        // Convert ₹ to paise (Razorpay uses smallest currency unit)
        // ₹150 → 15000 paise
        long amountPaise = totalAmount
                .multiply(BigDecimal.valueOf(100))
                .longValue();

        // Create Razorpay order
        String razorpayOrderId;
        try {
            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", bookingCode);  // our reference
            orderRequest.put("payment_capture", 1);     // auto-capture on payment

            Order order = razorpay.orders.create(orderRequest);
            razorpayOrderId = order.get("id");
            log.info("Razorpay order created: {} for booking: {}", razorpayOrderId, bookingCode);
        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order for booking {}: {}", bookingCode, e.getMessage());
            throw new RuntimeException("Payment gateway error. Please try again.");
        }

        // Save payment record
        Payment payment = Payment.builder()
                .booking(booking)
                .razorpayOrderId(razorpayOrderId)
                .amountPaise(amountPaise)
                .currency("INR")
                .status(Payment.PaymentStatus.CREATED)
                .receipt(bookingCode)
                .build();
        paymentRepository.save(payment);

        return PaymentOrderResponse.builder()
                .bookingCode(bookingCode)
                .bookingId(booking.getId())
                .razorpayOrderId(razorpayOrderId)
                .razorpayKeyId(razorpayKeyId)   // public key — safe to send
                .amountPaise(amountPaise)
                .currency("INR")
                .salonName(salon.getName())
                .serviceName(combinedServiceName)
                .amount(totalAmount)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2A: Webhook from Razorpay (PRIMARY confirmation path)
    // Razorpay POSTs to /api/payments/webhook after payment is captured.
    // We verify the webhook signature, then confirm the booking.
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void handleWebhook(String payload, String razorpaySignatureHeader) {
        // Verify webhook signature
        // Razorpay signs webhooks with: HMAC-SHA256(payload, webhook_secret)
        if (!verifyWebhookSignature(payload, razorpaySignatureHeader)) {
            log.warn("Invalid webhook signature received — ignoring");
            throw new SecurityException("Invalid webhook signature");
        }

        JSONObject event = new JSONObject(payload);
        String eventType = event.getString("event");
        log.info("Razorpay webhook received: {}", eventType);

        if ("payment.captured".equals(eventType)) {
            JSONObject paymentEntity = event
                    .getJSONObject("payload")
                    .getJSONObject("payment")
                    .getJSONObject("entity");

            String razorpayPaymentId = paymentEntity.getString("id");
            String razorpayOrderId   = paymentEntity.getString("order_id");

            confirmPayment(razorpayOrderId, razorpayPaymentId, null);
        }

        // payment.failed event — mark payment as failed
        if ("payment.failed".equals(eventType)) {
            JSONObject paymentEntity = event
                    .getJSONObject("payload")
                    .getJSONObject("payment")
                    .getJSONObject("entity");

            String razorpayOrderId = paymentEntity.getString("order_id");
            paymentRepository.findByRazorpayOrderId(razorpayOrderId).ifPresent(payment -> {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                paymentRepository.save(payment);
                log.info("Payment failed for order: {}", razorpayOrderId);
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2B: Frontend verification (SECONDARY safety check)
    // After Razorpay popup succeeds, frontend sends the 3 IDs to us.
    // We verify the signature and confirm if not already confirmed by webhook.
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void verifyAndConfirmPayment(String razorpayOrderId,
                                        String razorpayPaymentId,
                                        String razorpaySignature) {
        // Verify frontend signature
        // Razorpay signs payment success with: HMAC-SHA256(orderId|paymentId, key_secret)
        String payload = razorpayOrderId + "|" + razorpayPaymentId;
        if (!verifyPaymentSignature(payload, razorpaySignature)) {
            log.warn("Invalid payment signature from frontend for order: {}", razorpayOrderId);
            throw new SecurityException("Payment signature verification failed");
        }

        confirmPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHARED: Mark booking as CONFIRMED + add to queue
    // Called by both webhook and frontend verification.
    // Idempotent — safe to call twice (webhook + frontend race condition).
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void confirmPayment(String razorpayOrderId,
                               String razorpayPaymentId,
                               String razorpaySignature) {
        // Locking fetch — this is the fix. The webhook and the frontend's
        // verify call are expected to potentially both fire for the same
        // payment; if they land close enough together, this makes the
        // second one wait until the first has fully committed before it
        // reads payment.status, so the idempotency check below actually
        // sees CAPTURED instead of both racing past it.
        Payment payment = paymentRepository.findByRazorpayOrderIdForUpdate(razorpayOrderId)
                .orElseThrow(() -> new RuntimeException("Payment not found for order: " + razorpayOrderId));

        // IDEMPOTENCY: if already captured (webhook beat frontend), skip
        if (payment.getStatus() == Payment.PaymentStatus.CAPTURED) {
            log.info("Payment {} already captured — skipping duplicate confirmation", razorpayOrderId);
            return;
        }

        // Record that Razorpay actually captured the money BEFORE we look
        // at what state the booking is in. This can never be skipped: even
        // if the booking below turns out to already be cancelled, real
        // money moved and that must never go unrecorded.
        payment.setRazorpayPaymentId(razorpayPaymentId);
        if (razorpaySignature != null) {
            payment.setRazorpaySignature(razorpaySignature);
        }
        payment.setStatus(Payment.PaymentStatus.CAPTURED);
        payment.setCapturedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        Booking booking = payment.getBooking();

        // Guards against a real (if rare) race with PaymentCleanupScheduler:
        // if Razorpay's webhook is delayed past payment.pending-timeout-minutes
        // (webhook retry delay, an outage on our endpoint, etc.), the cleanup
        // job may have already cancelled this booking as PAYMENT_TIMEOUT
        // before this confirmation arrived. The findByRazorpayOrderIdForUpdate
        // lock above and the matching findByBookingIdForUpdate lock in the
        // cleanup job make sure these two never interleave mid-write — but
        // if cleanup's transaction committed first, we land here and see it.
        //
        // We must NOT silently flip this back to CONFIRMED and drop the
        // customer into a live queue: they were already told the booking
        // was cancelled, and nobody at the salon is expecting them. But we
        // also must not lose the fact that they were genuinely charged.
        // Recording it as CAPTURED above (not FAILED) and logging loudly
        // here is what lets an admin find and resolve this — refund or
        // manual re-booking — rather than it disappearing into logs as an
        // ordinary success.
        if (booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            log.error("PAYMENT CAPTURED FOR ALREADY-CANCELLED BOOKING — needs manual reconciliation: " +
                            "booking={}, razorpayPaymentId={}, amountPaise={}. The booking was auto-cancelled " +
                            "(reason={}) before this confirmation arrived, most likely because the webhook " +
                            "was delayed past the payment timeout window. NOT adding to queue automatically.",
                    booking.getBookingCode(), razorpayPaymentId, payment.getAmountPaise(),
                    booking.getCancellationReason());
            return;
        }

        // Confirm booking
        booking.setStatus(Booking.BookingStatus.CONFIRMED);
        booking.setPaymentCompleted(true);
        booking.setPaymentId(razorpayPaymentId);
        booking.setPaymentTime(LocalDateTime.now());
        bookingRepository.save(booking);

        // NOW add to queue — only after payment confirmed
        queueService.addOnlineBookingToQueue(booking);

        log.info("Payment confirmed for booking: {} | Razorpay: {}",
                booking.getBookingCode(), razorpayPaymentId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SIGNATURE VERIFICATION HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Verify Razorpay webhook signature.
     * Algorithm: HMAC-SHA256(rawPayload, webhookSecret)
     * Webhook secret is set in your Razorpay dashboard and stored separately
     * from the API key secret in application.properties.
     */
    private boolean verifyWebhookSignature(String payload, String signature) {
        try {
            String expected = hmacSha256(payload, razorpayWebhookSecret);
            return constantTimeEquals(expected, signature);
        } catch (Exception e) {
            log.error("Webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    @Value("${razorpay.webhook.secret}")
    private String razorpayWebhookSecret;

    /**
     * Verify Razorpay payment signature from frontend.
     * Algorithm: HMAC-SHA256("orderId|paymentId", keySecret)
     */
    private boolean verifyPaymentSignature(String payload, String signature) {
        try {
            String expected = hmacSha256(payload, razorpayKeySecret);
            return constantTimeEquals(expected, signature);
        } catch (Exception e) {
            log.error("Payment signature verification error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Compares two hex-encoded signatures in constant time.
     *
     * A plain String.equals() short-circuits on the first mismatched
     * character, so how long the comparison takes leaks how many leading
     * characters of a forged signature were already correct — a classic
     * timing side-channel that lets an attacker recover a valid signature
     * one byte at a time across many requests. MessageDigest.isEqual always
     * compares every byte regardless of where the first mismatch is, so the
     * response time doesn't reveal anything. Signatures verify money
     * movement here, so this is worth doing properly rather than relying on
     * network jitter to make the timing attack impractical.
     */
    private boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Compute HMAC-SHA256 and return hex string.
     */
    private String hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"
        );
        mac.init(secretKeySpec);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT STATUS CHECK (for frontend polling)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    // Minor, low-severity gap compared to the queue/service issues (Razorpay
    // order IDs are opaque generated strings, not easily guessable/enumerable
    // like sequential integer IDs) — but cheap to close properly rather than
    // leaving any authenticated user able to poll another customer's payment
    // status if they ever learned an order ID.
    public Payment.PaymentStatus getPaymentStatus(String razorpayOrderId, Long callerId) {
        Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
        if (!payment.getBooking().getCustomer().getId().equals(callerId)) {
            throw new RuntimeException("You do not have permission to view this payment");
        }
        return payment.getStatus();
    }
}