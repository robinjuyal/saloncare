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
     * NEW — used by the no-show scheduler.
     *
     * Finds all WAITING entries at position 1 (first in queue) that have been
     * waiting longer than the given cutoff time, BUT only for salons where
     * nobody is currently IN_PROGRESS.
     *
     * The subquery ensures we don't auto-expire someone while a service is
     * actively running — that would mean the barber is busy and the wait is
     * legitimately continuing.
     */
    @Query("""
            SELECT q FROM QueueEntry q
            WHERE q.status = 'WAITING'
              AND q.position = 1
              AND q.createdAt < :cutoffTime
              AND q.salon.id NOT IN (
                  SELECT q2.salon.id FROM QueueEntry q2
                  WHERE q2.status = 'IN_PROGRESS'
              )
            """)
    List<QueueEntry> findStaleFirstPositionEntries(@Param("cutoffTime") LocalDateTime cutoffTime);

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
