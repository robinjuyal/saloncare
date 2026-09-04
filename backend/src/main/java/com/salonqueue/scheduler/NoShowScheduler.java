package com.salonqueue.scheduler;

import com.salonqueue.entity.Booking;
import com.salonqueue.entity.QueueEntry;
import com.salonqueue.repository.BookingRepository;
import com.salonqueue.repository.QueueEntryRepository;
import com.salonqueue.service.QueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class NoShowScheduler {

    private final QueueEntryRepository queueEntryRepository;
    private final BookingRepository bookingRepository;
    private final QueueService queueService;

    /**
     * How long (minutes) a customer can sit at position 1 with no service
     * started before being marked NO_SHOW.
     *
     * Configurable in application.properties:
     *   queue.noshow.timeout-minutes=15
     *
     * Defaults to 15 if not set.
     */
    @Value("${queue.noshow.timeout-minutes:15}")
    private int noShowTimeoutMinutes;

    /**
     * Runs every 2 minutes.
     *
     * Finds every WAITING entry at position 1 where:
     *   1. The entry has been waiting longer than noShowTimeoutMinutes
     *   2. No service is currently IN_PROGRESS at that salon
     *      (meaning the barber is free but hasn't started — customer is absent)
     *
     * For each stale entry:
     *   - Marks the QueueEntry as NO_SHOW
     *   - Marks the linked Booking (if online) as NO_SHOW
     *   - Advances all remaining WAITING positions by calling updateQueuePositions
     *   - Broadcasts the updated queue via WebSocket so all clients update instantly
     *
     * fixedDelay means each run starts 2 minutes after the previous one finishes,
     * avoiding overlap if a run somehow takes longer than expected.
     */
    @Scheduled(fixedDelayString = "${queue.noshow.check-interval-ms:60000}")
    @Transactional
    public void autoExpireNoShows() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(noShowTimeoutMinutes);

        List<QueueEntry> staleEntries = queueEntryRepository
                .findStaleFirstPositionEntries(cutoffTime);

        if (staleEntries.isEmpty()) {
            return; // nothing to do — skip logging noise
        }

        log.info("NoShowScheduler: found {} stale queue entries to expire", staleEntries.size());

        for (QueueEntry entry : staleEntries) {
            Long salonId = entry.getSalon().getId();
            log.info("Auto-expiring no-show: customer='{}', salon={}, waited since={}",
                    entry.getCustomerName(), salonId, entry.getCreatedAt());

            // Mark queue entry as NO_SHOW
            entry.setStatus(QueueEntry.QueueStatus.NO_SHOW);
            entry.setPosition(null);
            queueEntryRepository.save(entry);

            // Mark linked booking as NO_SHOW (online bookings only)
            if (entry.getBooking() != null) {
                Booking booking = entry.getBooking();
                booking.setStatus(Booking.BookingStatus.NO_SHOW);
                bookingRepository.save(booking);
                log.info("  → Booking {} marked NO_SHOW", booking.getBookingCode());
            }

            // Reorder remaining WAITING entries and broadcast to all WebSocket clients
            // This is the key step — it unblocks the queue for everyone waiting behind
            queueService.advanceQueueAfterNoShow(salonId);
        }
    }
}