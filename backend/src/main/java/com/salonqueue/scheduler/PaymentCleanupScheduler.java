package com.salonqueue.scheduler;

import com.salonqueue.entity.Booking;
import com.salonqueue.entity.Payment;
import com.salonqueue.repository.BookingRepository;
import com.salonqueue.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Cleans up bookings that got stuck in PENDING_PAYMENT and never completed
 * checkout — e.g. the customer closed the Razorpay popup, lost signal, or
 * the payment silently failed without Razorpay ever sending a webhook.
 *
 * Without this, those bookings (and their linked Payment rows, stuck in
 * CREATED) sit in the database forever with no resolution: never added to
 * the queue, never shown as failed to the customer, and never excluded from
 * admin-side counts.
 *
 * This is the payment-side counterpart to NoShowScheduler — same pattern,
 * different table.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentCleanupScheduler {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    /**
     * How long (minutes) a booking can sit in PENDING_PAYMENT before we
     * give up on it and mark it CANCELLED.
     *
     * Configurable in application.properties:
     *   payment.pending-timeout-minutes=20
     *
     * Defaults to 20 if not set. Kept shorter than the old 30-minute
     * "hide from My Bookings" window so customers get a clear CANCELLED
     * status with a reason instead of the booking just disappearing.
     */
    @Value("${payment.pending-timeout-minutes:20}")
    private int pendingTimeoutMinutes;

    /**
     * Runs on a fixed delay (default every 5 minutes). Finds every booking
     * still in PENDING_PAYMENT whose createdAt is older than the timeout,
     * and for each one:
     *   - Marks the Booking as CANCELLED with cancellationReason=PAYMENT_TIMEOUT
     *     and cancelledBy=SYSTEM, so the customer sees a clear reason instead
     *     of the booking silently vanishing.
     *   - Marks the linked Payment as FAILED if it's still sitting in CREATED
     *     (idempotent — if the webhook or frontend already confirmed it as
     *     CAPTURED, findByStatusAndCreatedAtBefore(PENDING_PAYMENT, ...) won't
     *     even return that booking, since confirmPayment() already moved it
     *     to CONFIRMED).
     *
     * No queue interaction needed — PENDING_PAYMENT bookings are never added
     * to the queue in the first place (see PaymentService.confirmPayment).
     */
    @Scheduled(fixedDelayString = "${payment.cleanup-interval-ms:300000}")
    @Transactional
    public void cleanupAbandonedPayments() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(pendingTimeoutMinutes);

        List<Booking> staleBookings = bookingRepository
                .findByStatusAndCreatedAtBefore(Booking.BookingStatus.PENDING_PAYMENT, cutoffTime);

        if (staleBookings.isEmpty()) {
            return; // nothing to do — skip logging noise
        }

        log.info("PaymentCleanupScheduler: found {} abandoned PENDING_PAYMENT bookings to expire",
                staleBookings.size());

        for (Booking booking : staleBookings) {
            booking.setStatus(Booking.BookingStatus.CANCELLED);
            booking.setCancellationReason("PAYMENT_TIMEOUT");
            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancelledBy("SYSTEM");
            bookingRepository.save(booking);

            paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {
                if (payment.getStatus() == Payment.PaymentStatus.CREATED) {
                    payment.setStatus(Payment.PaymentStatus.FAILED);
                    paymentRepository.save(payment);
                }
            });

            log.info("Expired abandoned booking {} (pending since {})",
                    booking.getBookingCode(), booking.getCreatedAt());
        }
    }
}
