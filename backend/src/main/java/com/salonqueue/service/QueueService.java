package com.salonqueue.service;

import com.salonqueue.dto.request.WalkInRequest;
import com.salonqueue.dto.response.QueueEntryResponse;
import com.salonqueue.entity.*;
import com.salonqueue.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QueueService {

    private final QueueEntryRepository queueEntryRepository;
    private final SalonRepository salonRepository;
    private final ServiceRepository serviceRepository;
    private final BookingRepository bookingRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns WAITING + IN_PROGRESS entries as response DTOs (includes bookingCode).
     * Used by QueueController and WebSocket broadcast.
     */
    @Transactional(readOnly = true)
    public List<QueueEntryResponse> getQueueForSalon(Long salonId) {
        return queueEntryRepository
                .findBySalonIdAndStatusInOrderByPositionAsc(
                        salonId,
                        Arrays.asList(QueueEntry.QueueStatus.WAITING, QueueEntry.QueueStatus.IN_PROGRESS)
                )
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public QueueEntryResponse addWalkInToQueue(WalkInRequest request, Long callerId) {
        // Locks the salon row for this transaction — if an online booking's
        // payment is confirming for the same salon at the same instant,
        // that transaction blocks here until this one commits, so they
        // can never both read the same max position. See findByIdForUpdate.
        Salon salon = salonRepository.findByIdForUpdate(request.getSalonId())
                .orElseThrow(() -> new RuntimeException("Salon not found"));

        verifySalonOwnership(salon, callerId);

        com.salonqueue.entity.Service service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new RuntimeException("Service not found"));

        Integer maxPosition = queueEntryRepository.findMaxPositionBySalonIdAndStatuses(
                request.getSalonId(),
                Arrays.asList(QueueEntry.QueueStatus.WAITING, QueueEntry.QueueStatus.IN_PROGRESS)
        );

        QueueEntry queueEntry = QueueEntry.builder()
                .salon(salon)
                .position(maxPosition != null ? maxPosition + 1 : 1)
                .type(QueueEntry.QueueType.WALK_IN)
                .status(QueueEntry.QueueStatus.WAITING)
                .customerName(request.getCustomerName())
                .serviceName(service.getName())
                .estimatedDurationMinutes(service.getDurationMinutes())
                .estimatedStartTime(calculateEstimatedStartTime(request.getSalonId()))
                .chairNumber(1)
                .build();

        queueEntry = queueEntryRepository.save(queueEntry);
        broadcastQueueUpdate(request.getSalonId());
        return mapToResponse(queueEntry);
    }

    @Transactional
    public QueueEntryResponse addOnlineBookingToQueue(Booking booking) {
        // Same lock as addWalkInToQueue, same reason — this is the other
        // side of the exact race being guarded against: a walk-in and a
        // payment confirming for the same salon at the same instant.
        salonRepository.findByIdForUpdate(booking.getSalon().getId());

        Integer maxPosition = queueEntryRepository.findMaxPositionBySalonIdAndStatuses(
                booking.getSalon().getId(),
                Arrays.asList(QueueEntry.QueueStatus.WAITING, QueueEntry.QueueStatus.IN_PROGRESS)
        );

        QueueEntry queueEntry = QueueEntry.builder()
                .salon(booking.getSalon())
                .booking(booking)
                .position(maxPosition != null ? maxPosition + 1 : 1)
                .type(QueueEntry.QueueType.ONLINE_BOOKING)
                .status(QueueEntry.QueueStatus.WAITING)
                .customerName(booking.getCustomer().getName())
                // Combined name ("Men's Haircut + Men's Beard") and total
                // duration across every service in the booking — the
                // chair-assignment/wait-time math below doesn't need to
                // know a booking has multiple services, it just consumes
                // this one summed duration like it always has.
                .serviceName(booking.getCombinedServiceName())
                .estimatedDurationMinutes(booking.getTotalDurationMinutes())
                .estimatedStartTime(calculateEstimatedStartTime(booking.getSalon().getId()))
                .chairNumber(1)
                .build();

        queueEntry = queueEntryRepository.save(queueEntry);
        broadcastQueueUpdate(booking.getSalon().getId());
        return mapToResponse(queueEntry);
    }

    /**
     * Verifies the calling user actually owns the salon they're trying to
     * manage. Previously missing from every mutating endpoint in this
     * class — any authenticated user (not just that salon's owner) could
     * start/complete/remove/cancel queue entries or add walk-ins for ANY
     * salon just by knowing or guessing IDs, entirely bypassing the UI.
     * Mirrors the getOwnedSalon() pattern already used correctly in
     * SalonOwnerService.
     */
    private void verifySalonOwnership(Salon salon, Long callerId) {
        if (!salon.getOwner().getId().equals(callerId)) {
            throw new RuntimeException("You do not have permission to manage this salon's queue");
        }
    }

    @Transactional
    public void startService(Long queueEntryId, Long callerId) {
        QueueEntry queueEntry = queueEntryRepository.findById(queueEntryId)
                .orElseThrow(() -> new RuntimeException("Queue entry not found"));

        verifySalonOwnership(queueEntry.getSalon(), callerId);

        // Guards against a double-click (or retried request) re-running
        // chair assignment on an entry that's already IN_PROGRESS — without
        // this, a second call would see this entry's own already-assigned
        // chair as "occupied" and could reassign it to a different chair,
        // or throw a confusing "no chairs available" if none are left.
        if (queueEntry.getStatus() != QueueEntry.QueueStatus.WAITING) {
            throw new RuntimeException("This customer is no longer waiting — cannot start service");
        }

        Long salonId = queueEntry.getSalon().getId();

        // Same read-then-write race as position assignment, different field:
        // two "Start Service" calls for this salon overlapping in time could
        // both read the same set of occupied chairs before either commits,
        // and both conclude the same chair is free — assigning two different
        // customers to the same chair simultaneously. That's worse than the
        // position duplicate: the barber dashboard renders one card per
        // chair number, so the second customer assigned to an
        // already-occupied chair slot would become invisible in the UI
        // while still marked IN_PROGRESS (and, for an online booking,
        // already charged). Locking the salon row here forces a second
        // concurrent call to wait until this one commits, so it always
        // reads the up-to-date occupied-chairs set.
        salonRepository.findByIdForUpdate(salonId);

        int totalChairs = getTotalChairs(salonId);

        // Figure out which chairs (1..totalChairs) are currently occupied,
        // and hand this customer the lowest-numbered free one.
        java.util.Set<Integer> occupiedChairs = queueEntryRepository
                .findBySalonIdAndStatusInOrderByPositionAsc(
                        salonId, Arrays.asList(QueueEntry.QueueStatus.IN_PROGRESS))
                .stream()
                .map(QueueEntry::getChairNumber)
                .collect(Collectors.toSet());

        Integer freeChair = null;
        for (int chair = 1; chair <= totalChairs; chair++) {
            if (!occupiedChairs.contains(chair)) {
                freeChair = chair;
                break;
            }
        }

        if (freeChair == null) {
            // All active chairs are busy — frontend should prevent this by only
            // showing "Start" when a chair is free, but guard against it here too.
            throw new RuntimeException("No chairs available right now");
        }

        queueEntry.setStatus(QueueEntry.QueueStatus.IN_PROGRESS);
        queueEntry.setActualStartTime(LocalDateTime.now());
        queueEntry.setChairNumber(freeChair);
        queueEntry.setPosition(null);

        if (queueEntry.getBooking() != null) {
            Booking booking = queueEntry.getBooking();
            booking.setStatus(Booking.BookingStatus.IN_PROGRESS);
            booking.setServiceStartTime(LocalDateTime.now());
            bookingRepository.save(booking);
        }

        queueEntryRepository.save(queueEntry);
        updateQueuePositions(salonId);
        broadcastQueueUpdate(salonId);
    }

    @Transactional
    public void completeService(Long queueEntryId, Long callerId) {
        QueueEntry queueEntry = queueEntryRepository.findById(queueEntryId)
                .orElseThrow(() -> new RuntimeException("Queue entry not found"));

        verifySalonOwnership(queueEntry.getSalon(), callerId);

        // Same reasoning as the WAITING guard in startService — without
        // this, double-clicking "Finish" (or a retried request after a
        // slow network response) would re-run completion on an entry
        // that's already COMPLETED: harmless-looking, but it would also
        // re-set completedTime and, for an online booking, re-fire the
        // booking-completion update a second time.
        if (queueEntry.getStatus() != QueueEntry.QueueStatus.IN_PROGRESS) {
            throw new RuntimeException("This customer's service is not in progress — cannot complete");
        }

        queueEntry.setStatus(QueueEntry.QueueStatus.COMPLETED);
        queueEntry.setCompletedTime(LocalDateTime.now());
        queueEntry.setPosition(null);

        if (queueEntry.getBooking() != null) {
            Booking booking = queueEntry.getBooking();
            booking.setStatus(Booking.BookingStatus.COMPLETED);
            booking.setServiceEndTime(LocalDateTime.now());
            bookingRepository.save(booking);
        }

        queueEntryRepository.save(queueEntry);
        updateQueuePositions(queueEntry.getSalon().getId());
        broadcastQueueUpdate(queueEntry.getSalon().getId());
    }

    @Transactional
    public void removeFromQueue(Long queueEntryId, Long callerId) {
        QueueEntry queueEntry = queueEntryRepository.findById(queueEntryId)
                .orElseThrow(() -> new RuntimeException("Queue entry not found"));

        verifySalonOwnership(queueEntry.getSalon(), callerId);

        // Lighter version of the same guard as start/complete — only blocks
        // re-processing an entry that's already in a terminal state (which
        // would otherwise silently re-run the "cancel linked booking" logic
        // a second time). Deliberately still allows removing an
        // IN_PROGRESS entry, since a walk-in leaving mid-service is a real
        // scenario this app doesn't have a dedicated "cancel mid-service"
        // action for yet.
        if (queueEntry.getStatus() == QueueEntry.QueueStatus.COMPLETED
                || queueEntry.getStatus() == QueueEntry.QueueStatus.CANCELLED
                || queueEntry.getStatus() == QueueEntry.QueueStatus.NO_SHOW) {
            throw new RuntimeException("This entry has already been " + queueEntry.getStatus().toString().toLowerCase());
        }

        Long salonId = queueEntry.getSalon().getId();
        queueEntry.setStatus(QueueEntry.QueueStatus.CANCELLED);
        queueEntry.setPosition(null);
        queueEntryRepository.save(queueEntry);

        // Also cancel linked booking so customer sees CANCELLED in MyBookings
        if (queueEntry.getBooking() != null) {
            Booking booking = queueEntry.getBooking();
            booking.setStatus(Booking.BookingStatus.CANCELLED);
            bookingRepository.save(booking);
        }

        updateQueuePositions(salonId);
        broadcastQueueUpdate(salonId);
    }

    /**
     * Called when barber cancels an online booking customer from the queue.
     * Unlike removeFromQueue (walk-ins), this records the cancellation reason
     * on the booking so the customer can see why they were removed.
     *
     * Reasons: SALON_EMERGENCY, RUNNING_TOO_LATE, OVERBOOKING, OTHER
     */
    @Transactional
    public void cancelOnlineBookingFromQueue(Long queueEntryId, String reason, Long callerId) {
        QueueEntry queueEntry = queueEntryRepository.findById(queueEntryId)
                .orElseThrow(() -> new RuntimeException("Queue entry not found"));

        verifySalonOwnership(queueEntry.getSalon(), callerId);

        if (queueEntry.getBooking() == null) {
            throw new RuntimeException("This is not an online booking");
        }

        Long salonId = queueEntry.getSalon().getId();

        // Cancel queue entry
        queueEntry.setStatus(QueueEntry.QueueStatus.CANCELLED);
        queueEntry.setPosition(null);
        queueEntryRepository.save(queueEntry);

        // Cancel booking with reason so customer knows what happened
        Booking booking = queueEntry.getBooking();
        booking.setStatus(Booking.BookingStatus.CANCELLED);
        booking.setCancellationReason(reason);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelledBy("SALON");
        bookingRepository.save(booking);

        log.info("Online booking {} cancelled by salon. Reason: {}",
                booking.getBookingCode(), reason);

        updateQueuePositions(salonId);
        broadcastQueueUpdate(salonId);
    }

    @Transactional
    public void markNoShow(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        booking.setStatus(Booking.BookingStatus.NO_SHOW);
        bookingRepository.save(booking);

        QueueEntry queueEntry = queueEntryRepository.findByBookingId(bookingId).orElse(null);
        if (queueEntry != null) {
            queueEntry.setStatus(QueueEntry.QueueStatus.NO_SHOW);
            queueEntry.setPosition(null);
            queueEntryRepository.save(queueEntry);

            updateQueuePositions(booking.getSalon().getId());
            broadcastQueueUpdate(booking.getSalon().getId());
        }
    }

    /**
     * Called by NoShowScheduler after auto-expiring a no-show entry.
     * Re-numbers all remaining WAITING entries and broadcasts the updated
     * queue to all WebSocket subscribers so every client updates instantly.
     *
     * Kept separate from markNoShow() because the scheduler handles the
     * entity updates itself (in bulk) and just needs the reorder + broadcast.
     */
    @Transactional
    public void advanceQueueAfterNoShow(Long salonId) {
        updateQueuePositions(salonId);
        broadcastQueueUpdate(salonId);
        log.info("Queue advanced after no-show for salon {}", salonId);
    }

    /**
     * Wait time (minutes) a brand-new arrival would face right now, given
     * the salon's currently active chair count. Used for the customer-facing
     * "estimated wait" shown before someone even joins the queue.
     */
    public Integer getEstimatedWaitTime(Long salonId) {
        int totalChairs = getTotalChairs(salonId);
        int[] chairFreeInMinutes = simulateChairFreeMinutes(salonId, totalChairs);
        List<QueueEntry> waiting = queueEntryRepository.findBySalonIdAndStatusInOrderByPositionAsc(
                salonId, Arrays.asList(QueueEntry.QueueStatus.WAITING));

        for (QueueEntry entry : waiting) {
            int idx = argMinIndex(chairFreeInMinutes);
            chairFreeInMinutes[idx] += entry.getEstimatedDurationMinutes();
        }

        return argMinValue(chairFreeInMinutes);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Maps a QueueEntry entity to a QueueEntryResponse DTO.
     * Crucially populates bookingCode so the frontend can match
     * a booking to its queue entry without guessing by name.
     */
    private QueueEntryResponse mapToResponse(QueueEntry entry) {
        return QueueEntryResponse.builder()
                .id(entry.getId())
                .salonId(entry.getSalon().getId())
                .salonName(entry.getSalon().getName())
                .position(entry.getPosition())
                .type(entry.getType().toString())
                .status(entry.getStatus().toString())
                .customerName(entry.getCustomerName())
                .serviceName(entry.getServiceName())
                .estimatedDurationMinutes(entry.getEstimatedDurationMinutes())
                .estimatedStartTime(entry.getEstimatedStartTime())
                .actualStartTime(entry.getActualStartTime())
                .completedTime(entry.getCompletedTime())
                .chairNumber(entry.getChairNumber())
                // ← KEY: exposes bookingCode for frontend matching
                .bookingCode(entry.getBooking() != null
                        ? entry.getBooking().getBookingCode()
                        : null)
                // Walk-ins are just a name typed in at the counter — no user
                // account, so no phone to show. Online bookings are linked
                // to a real customer account that has one.
                .customerPhone(entry.getBooking() != null
                        ? entry.getBooking().getCustomer().getPhone()
                        : null)
                .build();
    }

    /**
     * Reassigns 1..N positions to WAITING entries in queue order.
     *
     * IMPORTANT: this does NOT recompute estimatedStartTime for entries
     * that already have one. estimatedStartTime is the arrival/start time
     * we actually promised the customer, set once when they joined the
     * queue (see calculateEstimatedStartTime). It must not be recalculated
     * here — every time this method runs (e.g. because someone ahead of
     * you got cancelled or finished early), the chair-simulation below
     * would otherwise recompute everyone's estimate from "right now,"
     * which silently overwrites an online customer's booked 10:00 AM slot
     * with "now" the instant the queue clears ahead of them — and then the
     * no-show check (which compares against estimatedStartTime) would
     * treat them as instantly overdue. The queue moving faster than
     * expected is good news for the customer, not a reason to move their
     * promised time earlier or start their no-show clock sooner.
     *
     * Only position numbers are reassigned here. estimatedStartTime is
     * set once, at creation, and never modified again while WAITING.
     */
    /**
     * Every WAITING entry that's actually eligible to be auto-expired right
     * now: its promised estimatedStartTime is more than timeoutMinutes in
     * the past, AND there's a free chair available for it at its current
     * position.
     *
     * "Free chair available for it" matters because this app supports more
     * than one chair, and startService lets the barber start any waiting
     * entry, not only position 1 — so with 2 chairs, position 1 and
     * position 2 can both have an open chair waiting for them at the same
     * time. Only ever checking position 1 (the old approach) meant that on
     * a 2-chair salon, someone at position 2 sitting on a genuinely free
     * chair, long past their own promised time, would never be expired
     * until position 1 was resolved first — however long that took, even
     * if position 1 wasn't overdue at all yet.
     *
     * Concretely: an entry at position P is eligible if P <= the number of
     * chairs not currently occupied by an IN_PROGRESS entry at that salon.
     */
    @Transactional(readOnly = true)
    public List<QueueEntry> findOverdueWaitingEntries(int timeoutMinutes) {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(timeoutMinutes);
        List<QueueEntry> staleCandidates =
                queueEntryRepository.findStaleWaitingEntriesOrderedBySalonAndPosition(cutoffTime);

        List<QueueEntry> eligible = new java.util.ArrayList<>();
        Long currentSalonId = null;
        int freeChairs = 0;

        for (QueueEntry entry : staleCandidates) {
            Long salonId = entry.getSalon().getId();
            if (!salonId.equals(currentSalonId)) {
                currentSalonId = salonId;
                int totalChairs = getTotalChairs(salonId);
                int inProgressCount = queueEntryRepository
                        .findBySalonIdAndStatusInOrderByPositionAsc(
                                salonId, Arrays.asList(QueueEntry.QueueStatus.IN_PROGRESS))
                        .size();
                freeChairs = Math.max(0, totalChairs - inProgressCount);
            }

            if (entry.getPosition() != null && entry.getPosition() <= freeChairs) {
                eligible.add(entry);
            }
        }

        return eligible;
    }

    private void updateQueuePositions(Long salonId) {
        List<QueueEntry> waitingEntries = queueEntryRepository.findBySalonIdAndStatusInOrderByPositionAsc(
                salonId,
                Arrays.asList(QueueEntry.QueueStatus.WAITING)
        );

        int position = 1;
        for (QueueEntry entry : waitingEntries) {
            entry.setPosition(position++);
        }

        queueEntryRepository.saveAll(waitingEntries);
    }

    private LocalDateTime calculateEstimatedStartTime(Long salonId) {
        // A brand-new arrival's wait is exactly "how long until the earliest-
        // freeing chair, after everyone currently waiting has been assigned."
        int waitMinutes = getEstimatedWaitTime(salonId);
        return LocalDateTime.now().plusMinutes(waitMinutes);
    }

    /**
     * Returns one "chair frees up in N minutes" entry per active chair,
     * seeded from whoever is currently IN_PROGRESS on that chair (0 if the
     * chair is free right now). This is the starting state for the queue
     * simulation used everywhere wait time is calculated.
     *
     * If totalChairs was just reduced (e.g. 2 → 1) while someone is still
     * mid-service on the now-inactive chair, that chair's remaining time is
     * folded into chair 1's array slot so the simulation doesn't just ignore
     * a service that's genuinely still running — it stays accurate until
     * that service completes naturally.
     */
    private int[] simulateChairFreeMinutes(Long salonId, int totalChairs) {
        int[] chairFreeInMinutes = new int[totalChairs];

        List<QueueEntry> inProgress = queueEntryRepository.findBySalonIdAndStatusInOrderByPositionAsc(
                salonId, Arrays.asList(QueueEntry.QueueStatus.IN_PROGRESS));

        for (QueueEntry entry : inProgress) {
            int remaining = remainingMinutes(entry);
            int chairIndex = clampChairIndex(entry.getChairNumber(), totalChairs);
            chairFreeInMinutes[chairIndex] = Math.max(chairFreeInMinutes[chairIndex], remaining);
        }

        return chairFreeInMinutes;
    }

    private int remainingMinutes(QueueEntry entry) {
        if (entry.getActualStartTime() != null) {
            long elapsedMinutes = java.time.Duration.between(
                    entry.getActualStartTime(), LocalDateTime.now()
            ).toMinutes();
            return Math.max(0, entry.getEstimatedDurationMinutes() - (int) elapsedMinutes);
        }
        return entry.getEstimatedDurationMinutes();
    }

    /** Clamps a 1-indexed chair number into a valid array index for the current chair count. */
    private int clampChairIndex(Integer chairNumber, int totalChairs) {
        int chair = (chairNumber == null) ? 1 : chairNumber;
        return Math.min(Math.max(chair, 1), totalChairs) - 1;
    }

    private int getTotalChairs(Long salonId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));
        Integer chairs = salon.getTotalChairs();
        return (chairs == null || chairs < 1) ? 1 : Math.min(chairs, 2);
    }

    private int argMinIndex(int[] values) {
        int minIndex = 0;
        for (int i = 1; i < values.length; i++) {
            if (values[i] < values[minIndex]) minIndex = i;
        }
        return minIndex;
    }

    private int argMinValue(int[] values) {
        return values[argMinIndex(values)];
    }

    private void broadcastQueueUpdate(Long salonId) {
        List<QueueEntryResponse> queue = getQueueForSalon(salonId);
        messagingTemplate.convertAndSend("/topic/queue/" + salonId, queue);
    }
}