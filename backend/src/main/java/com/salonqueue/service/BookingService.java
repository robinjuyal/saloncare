package com.salonqueue.service;

import com.salonqueue.dto.response.BookingResponse;
import com.salonqueue.entity.*;
import com.salonqueue.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final SalonRepository salonRepository;
    private final ServiceRepository serviceRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final QueueService queueService;

    @Transactional(readOnly = true)
    public List<Booking> getCustomerBookings(Long customerId) {
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getCustomerBookingsAsResponse(Long customerId) {
        // PaymentCleanupScheduler now flips abandoned PENDING_PAYMENT bookings to
        // CANCELLED (reason: PAYMENT_TIMEOUT) after payment.pending-timeout-minutes,
        // so we no longer need to hide stale ones here — the customer sees a clear
        // "Cancelled — payment timed out" state instead of the booking just
        // disappearing from their list.
        List<Booking> bookings = bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        return bookings.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BookingResponse mapToResponse(Booking booking) {
        // BookingResponse has estimatedStartTime/queuePosition fields, but
        // until now nothing ever set them — they were always null, silently
        // forcing the frontend to re-simulate wait time itself from a raw
        // queue snapshot instead of just reading the value QueueService
        // already computed correctly. Looking the linked QueueEntry up here
        // closes that gap at the source, for every caller of mapToResponse.
        QueueEntry linkedEntry = queueEntryRepository.findByBookingId(booking.getId()).orElse(null);

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customerId(booking.getCustomer().getId())
                .customerName(booking.getCustomer().getName())
                .salonId(booking.getSalon().getId())
                .salonName(booking.getSalon().getName())
                .salonAddress(booking.getSalon().getAddress())
                .serviceName(booking.getCombinedServiceName())
                .serviceDuration(booking.getTotalDurationMinutes())
                .scheduledTime(booking.getScheduledTime())
                .status(booking.getStatus().toString())
                .amount(booking.getAmount())
                .paymentCompleted(booking.getPaymentCompleted())
                .queuePosition(linkedEntry != null ? linkedEntry.getPosition() : null)
                .estimatedStartTime(linkedEntry != null ? linkedEntry.getEstimatedStartTime() : null)
                .createdAt(booking.getCreatedAt())
                .cancellationReason(booking.getCancellationReason())
                .cancelledBy(booking.getCancelledBy())
                .cancelledAt(booking.getCancelledAt())
                .build();
    }
}