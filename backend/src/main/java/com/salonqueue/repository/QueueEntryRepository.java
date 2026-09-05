package com.salonqueue.repository;

import com.salonqueue.entity.QueueEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface QueueEntryRepository extends JpaRepository<QueueEntry, Long> {
    List<QueueEntry> findBySalonIdAndStatusOrderByPositionAsc(Long salonId, QueueEntry.QueueStatus status);
    List<QueueEntry> findBySalonIdAndStatusInOrderByPositionAsc(Long salonId, List<QueueEntry.QueueStatus> statuses);
    Optional<QueueEntry> findBySalonIdAndStatus(Long salonId, QueueEntry.QueueStatus status);
    
    @Query("SELECT COALESCE(MAX(q.position), 0) FROM QueueEntry q WHERE q.salon.id = :salonId AND q.status IN :statuses")
    Integer findMaxPositionBySalonIdAndStatuses(Long salonId, List<QueueEntry.QueueStatus> statuses);
    
    List<QueueEntry> findBySalonIdOrderByPositionAsc(Long salonId);
    Optional<QueueEntry> findByBookingId(Long bookingId);

    long countByStatus(QueueEntry.QueueStatus status);

    /**
     * Every currently-WAITING entry whose promised estimatedStartTime is
     * more than the no-show cutoff in the past, across all salons, ordered
     * by salon then position. This is filtered further in QueueService —
     * see findOverdueWaitingEntries — to only the entries that actually
     * have a free chair available to them right now, since with more than
     * one chair, "position 1" and "a chair is free for you" are not the
     * same thing.
     */
    @Query("""
            SELECT q FROM QueueEntry q
            WHERE q.status = 'WAITING'
              AND q.estimatedStartTime < :cutoffTime
            ORDER BY q.salon.id ASC, q.position ASC
            """)
    List<QueueEntry> findStaleWaitingEntriesOrderedBySalonAndPosition(@Param("cutoffTime") LocalDateTime cutoffTime);

    /**
     * NEW — used by the scheduler to check if any IN_PROGRESS entry exists
     * for a given salon before deciding to expire a waiting entry.
     * (Optional helper — the subquery above already handles this,
     *  but useful if you ever want to call it separately.)
     */
    boolean existsBySalonIdAndStatus(Long salonId, QueueEntry.QueueStatus status);

    long countBySalonIdAndStatusAndCreatedAtBetween(
            Long salonId, QueueEntry.QueueStatus status,
            LocalDateTime start, LocalDateTime end);

    long countBySalonIdAndTypeAndStatusAndCreatedAtBetween(
            Long salonId, QueueEntry.QueueType type,
            QueueEntry.QueueStatus status,
            LocalDateTime start, LocalDateTime end);
}
