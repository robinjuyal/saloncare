package com.salonqueue.repository;

import com.salonqueue.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByBookingId(Long bookingId);
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);

    /**
     * Locks the payment row for the duration of the calling transaction.
     * Used by PaymentService.confirmPayment() — the webhook and the
     * frontend's own verify call are both expected to potentially fire for
     * the same payment (that's the whole reason both paths exist), so
     * checking payment.status and then writing to it needs to be atomic
     * with respect to a second concurrent call doing the same check. Without
     * this lock, both calls could read "not yet captured" before either
     * commits and both proceed — creating two QueueEntry rows for the one
     * booking, not just a duplicate log line.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.razorpayOrderId = :orderId")
    Optional<Payment> findByRazorpayOrderIdForUpdate(@Param("orderId") String orderId);

    /**
     * Same locking pattern as findByRazorpayOrderIdForUpdate, keyed by
     * booking instead. Used by PaymentCleanupScheduler so that cancelling
     * an abandoned PENDING_PAYMENT booking and confirmPayment() capturing
     * that same booking's payment can never interleave: whichever one
     * acquires the row lock first forces the other to wait and then see
     * its committed result, instead of both reading a stale CREATED status
     * and racing to write conflicting outcomes.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.booking.id = :bookingId")
    Optional<Payment> findByBookingIdForUpdate(@Param("bookingId") Long bookingId);

    long countByStatus(Payment.PaymentStatus status);
    List<Payment> findByStatus(Payment.PaymentStatus status);

    @Query("SELECT COALESCE(SUM(p.amountPaise), 0) FROM Payment p WHERE p.status = 'CAPTURED'")
    BigDecimal sumCapturedRevenue();

    @Query("SELECT COALESCE(SUM(p.amountPaise), 0) FROM Payment p WHERE p.status = 'CAPTURED' AND p.booking.salon.id = :salonId")
    BigDecimal sumCapturedRevenueBySalonId(@Param("salonId") Long salonId);

    @Query("SELECT COALESCE(SUM(p.amountPaise), 0) FROM Payment p " +
            "WHERE p.status = 'CAPTURED' " +
            "AND p.booking.salon.id = :salonId " +
            "AND p.capturedAt BETWEEN :start AND :end")
    BigDecimal sumCapturedRevenueBySalonIdAndDateRange(
            @Param("salonId") Long salonId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}