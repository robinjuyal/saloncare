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
 * different table. It shares a locking handshake with
 * PaymentService.confirmPayment(): both take a pessimistic lock on the same
 * Payment row before deciding what to do with it, so a webhook/frontend
 * confirmation landing at the same moment this scheduler is about to give up
 * on a booking can never interleave with it — see findByBookingIdForUpdate.
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
     *     after re-checking under lock (see the per-booking lock/skip logic
     *     below — this is what actually guards against a webhook confirming
     *     the same booking at the same moment, not just the coarse query
     *     above).
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
            // Lock this booking's payment row before touching anything.
            // confirmPayment() takes the same lock (findByRazorpayOrderIdForUpdate
            // / findByBookingIdForUpdate both lock the same Payment row) when a
            // webhook or frontend confirmation is landing for this exact booking
            // at the same moment. Whichever of the two gets here first forces
            // the other to wait — so if confirmPayment already committed
            // CAPTURED just before we got the lock, the re-check below sees
            // that committed result instead of the stale CREATED status we
            // read in the coarse query above, and we back off instead of
            // cancelling a booking that was, in fact, just successfully paid.
            var paymentOpt = paymentRepository.findByBookingIdForUpdate(booking.getId());
            if (paymentOpt.isPresent() && paymentOpt.get().getStatus() != Payment.PaymentStatus.CREATED) {
                log.info("Skipping cleanup for booking {} — payment status is now {} " +
                                "(confirmed concurrently, no longer abandoned)",
                        booking.getBookingCode(), paymentOpt.get().getStatus());
                continue;
            }

            booking.setStatus(Booking.BookingStatus.CANCELLED);
            booking.setCancellationReason("PAYMENT_TIMEOUT");
            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancelledBy("SYSTEM");
            bookingRepository.save(booking);

            paymentOpt.ifPresent(payment -> {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                paymentRepository.save(payment);
            });

            log.info("Expired abandoned booking {} (pending since {})",
                    booking.getBookingCode(), booking.getCreatedAt());
        }
    }
}
