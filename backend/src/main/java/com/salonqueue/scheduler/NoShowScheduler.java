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

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class NoShowScheduler {

    private final QueueEntryRepository queueEntryRepository;
    private final BookingRepository bookingRepository;
    private final QueueService queueService;

    /**
     * How long (minutes) a customer can sit on an available chair with no
     * service started, past their promised arrival time, before being
     * marked NO_SHOW.
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
     * Delegates to QueueService.findOverdueWaitingEntries, which finds
     * every WAITING entry where:
     *   1. Its promised estimatedStartTime is more than noShowTimeoutMinutes
     *      in the past, AND
     *   2. There's actually a free chair available for it right now (not
     *      just "it's at position 1" — with more than one chair, several
     *      positions can have an open chair simultaneously; see that
     *      method's Javadoc for why this matters)
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
        List<QueueEntry> staleEntries = queueService.findOverdueWaitingEntries(noShowTimeoutMinutes);

        if (staleEntries.isEmpty()) {
            return; // nothing to do — skip logging noise
        }

        log.info("NoShowScheduler: found {} stale queue entries to expire", staleEntries.size());

        for (QueueEntry entry : staleEntries) {
            Long salonId = entry.getSalon().getId();
            log.info("Auto-expiring no-show: customer='{}', salon={}, was promised arrival by={}",
                    entry.getCustomerName(), salonId, entry.getEstimatedStartTime());

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