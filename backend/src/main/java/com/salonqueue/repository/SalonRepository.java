package com.salonqueue.repository;

import com.salonqueue.entity.Salon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalonRepository extends JpaRepository<Salon, Long> {

    // ── Your original methods — unchanged ────────────────────────────────────
    List<Salon> findByOwnerId(Long ownerId);
    List<Salon> findByActiveTrue();
    List<Salon> findByCityAndActiveTrue(String city);

    /**
     * Your original nearby query — kept as JPQL (not native SQL).
     * Added verified = true so unverified salons never show up in
     * customer search results. Also added s.latitude IS NOT NULL guard
     * so salons registered without coordinates don't cause math errors.
     */
    @Query("SELECT s FROM Salon s WHERE s.active = true AND s.verified = true " +
            "AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND " +
            "(6371 * acos(cos(radians(:latitude)) * cos(radians(s.latitude)) * " +
            "cos(radians(s.longitude) - radians(:longitude)) + " +
            "sin(radians(:latitude)) * sin(radians(s.latitude)))) <= :radiusKm " +
            "ORDER BY (6371 * acos(cos(radians(:latitude)) * cos(radians(s.latitude)) * " +
            "cos(radians(s.longitude) - radians(:longitude)) + " +
            "sin(radians(:latitude)) * sin(radians(s.latitude))))")
    List<Salon> findNearbySalons(@Param("latitude") Double latitude,
                                 @Param("longitude") Double longitude,
                                 @Param("radiusKm") Double radiusKm);

    // ── NEW — used by /api/salons/search/name endpoint ────────────────────────
    /**
     * Case-insensitive partial name search for the customer search bar.
     * Only returns active + verified salons.
     * Matches against salon name — extend to address/city if needed.
     */
    @Query("SELECT s FROM Salon s WHERE s.active = true AND s.verified = true " +
            "AND LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Salon> searchByName(@Param("query") String query);

    long countByActiveTrue();
    long countByVerifiedFalseAndActiveTrue();
    long countByVerifiedTrueAndActiveTrue();

    List<Salon> findByVerifiedFalseAndActiveTrue();
    List<Salon> findByVerifiedTrueAndActiveTrue();
    List<Salon> findByActiveFalse();

    /**
     * Locks the salon row for the duration of the calling transaction.
     * Used by QueueService before assigning a new queue position, so that
     * a walk-in being added and an online booking's payment confirming at
     * the same moment can't both read the same "current max position" and
     * insert with the same number — the second transaction blocks here
     * until the first commits, then reads the now-updated max.
     *
     * This is the standard "lock the parent row to serialize child
     * inserts" pattern — it works correctly even if this app is ever
     * scaled to multiple backend instances, since the lock lives in the
     * database, not in this JVM's memory.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Salon s WHERE s.id = :id")
    java.util.Optional<Salon> findByIdForUpdate(@Param("id") Long id);
}