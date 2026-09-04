package com.salonqueue.service;

import com.salonqueue.entity.*;
import com.salonqueue.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalonOwnerService {

    private final SalonRepository      salonRepository;
    private final BookingRepository    bookingRepository;
    private final PaymentRepository    paymentRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final ReviewRepository     reviewRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // OPEN / CLOSE TOGGLE
    // Uses the existing `active` field on Salon.
    // When active=false the salon disappears from customer search.
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> toggleShopStatus(Long salonId, Long ownerId) {
        Salon salon = getOwnedSalon(salonId, ownerId);
        salon.setActive(!salon.getActive());
        salonRepository.save(salon);
        log.info("Salon {} toggled active={} by owner {}", salonId, salon.getActive(), ownerId);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("salonId", salon.getId());
        res.put("isOpen",  salon.getActive());
        res.put("message", salon.getActive() ? "Salon is now OPEN" : "Salon is now CLOSED");
        return res;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getShopStatus(Long salonId, Long ownerId) {
        Salon salon = getOwnedSalon(salonId, ownerId);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("salonId", salon.getId());
        res.put("isOpen",  salon.getActive());
        return res;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANALYTICS — TODAY SUMMARY
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getTodayAnalytics(Long salonId, Long ownerId) {
        getOwnedSalon(salonId, ownerId); // ownership check

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay   = startOfDay.plusDays(1);

        return buildAnalytics(salonId, startOfDay, endOfDay);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANALYTICS — CUSTOM DATE RANGE
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getAnalyticsByRange(Long salonId, Long ownerId,
                                                   LocalDate from, LocalDate to) {
        getOwnedSalon(salonId, ownerId); // ownership check

        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end   = to.plusDays(1).atStartOfDay(); // inclusive end date

        return buildAnalytics(salonId, start, end);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHARED BUILDER
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Object> buildAnalytics(Long salonId,
                                               LocalDateTime start,
                                               LocalDateTime end) {
        Map<String, Object> m = new LinkedHashMap<>();

        // Bookings
        long totalBookings     = bookingRepository.countBySalonIdAndScheduledTimeBetween(salonId, start, end);
        long completedBookings = bookingRepository.countBySalonIdAndStatusAndScheduledTimeBetween(
                salonId, Booking.BookingStatus.COMPLETED, start, end);
        long cancelledBookings = bookingRepository.countBySalonIdAndStatusAndScheduledTimeBetween(
                salonId, Booking.BookingStatus.CANCELLED, start, end);
        long noShowBookings    = bookingRepository.countBySalonIdAndStatusAndScheduledTimeBetween(
                salonId, Booking.BookingStatus.NO_SHOW, start, end);

        m.put("totalBookings",     totalBookings);
        m.put("completedBookings", completedBookings);
        m.put("cancelledBookings", cancelledBookings);
        m.put("noShowBookings",    noShowBookings);

        // Revenue — only from captured payments in the date range
        BigDecimal revenue = paymentRepository.sumCapturedRevenueBySalonIdAndDateRange(salonId, start, end);
        m.put("revenuePaise",  revenue != null ? revenue : BigDecimal.ZERO);
        m.put("revenueRupees", revenue != null
                ? revenue.divide(BigDecimal.valueOf(100)) : BigDecimal.ZERO);

        // Queue stats — completed entries (walk-ins + online) in range
        long totalServed   = queueEntryRepository.countBySalonIdAndStatusAndCreatedAtBetween(
                salonId, QueueEntry.QueueStatus.COMPLETED, start, end);
        long walkInsServed = queueEntryRepository.countBySalonIdAndTypeAndStatusAndCreatedAtBetween(
                salonId, QueueEntry.QueueType.WALK_IN, QueueEntry.QueueStatus.COMPLETED, start, end);
        long onlineServed  = queueEntryRepository.countBySalonIdAndTypeAndStatusAndCreatedAtBetween(
                salonId, QueueEntry.QueueType.ONLINE_BOOKING, QueueEntry.QueueStatus.COMPLETED, start, end);

        m.put("totalServed",   totalServed);
        m.put("walkInsServed", walkInsServed);
        m.put("onlineServed",  onlineServed);

        // Reviews
        long totalReviews   = reviewRepository.countBySalonId(salonId);
        double avgRating    = reviewRepository.averageRatingBySalonId(salonId);
        m.put("totalReviews", totalReviews);
        m.put("averageRating", Math.round(avgRating * 10.0) / 10.0);

        // Date range info for display
        m.put("from", start.toLocalDate().toString());
        m.put("to",   end.minusDays(1).toLocalDate().toString());

        return m;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER — verify ownership
    // ─────────────────────────────────────────────────────────────────────────

    private Salon getOwnedSalon(Long salonId, Long ownerId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));
        if (!salon.getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Access denied — not your salon");
        }
        return salon;
    }
}