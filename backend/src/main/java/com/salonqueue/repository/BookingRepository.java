package com.salonqueue.repository;

import com.salonqueue.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    Optional<Booking> findByBookingCode(String bookingCode);
    List<Booking> findByCustomerId(Long customerId);
    List<Booking> findBySalonId(Long salonId);
    List<Booking> findBySalonIdAndStatus(Long salonId, Booking.BookingStatus status);
    List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Booking> findBySalonIdAndScheduledTimeBetween(Long salonId, LocalDateTime start, LocalDateTime end);

    long countByStatus(Booking.BookingStatus status);
    long countByScheduledTimeAfter(LocalDateTime time);
    long countBySalonId(Long salonId);
    long countBySalonIdAndStatus(Long salonId, Booking.BookingStatus status);

    List<Booking> findByStatus(Booking.BookingStatus status);
    List<Booking> findBySalonIdOrderByScheduledTimeDesc(Long salonId);

    // ReviewService needs to check if a customer has a completed booking
    // at a salon before allowing them to review.
    boolean existsBySalonIdAndCustomerIdAndStatus(
            Long salonId, Long customerId, Booking.BookingStatus status);

    long countBySalonIdAndScheduledTimeBetween(
            Long salonId, LocalDateTime start, LocalDateTime end);

    long countBySalonIdAndStatusAndScheduledTimeBetween(
            Long salonId, Booking.BookingStatus status, LocalDateTime start, LocalDateTime end);

    // Used by PaymentCleanupScheduler to find abandoned PENDING_PAYMENT bookings
    // that never completed checkout (customer closed the Razorpay popup, etc.)
    List<Booking> findByStatusAndCreatedAtBefore(Booking.BookingStatus status, LocalDateTime cutoff);
}
