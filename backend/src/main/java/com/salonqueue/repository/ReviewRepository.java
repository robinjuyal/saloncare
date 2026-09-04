package com.salonqueue.repository;

import com.salonqueue.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findBySalonIdOrderByCreatedAtDesc(Long salonId);
    List<Review> findByCustomerId(Long customerId);
    Boolean existsBySalonIdAndCustomerId(Long salonId, Long customerId);

    long countBySalonId(Long salonId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Review r WHERE r.salon.id = :salonId")
    double averageRatingBySalonId(@Param("salonId") Long salonId);
}
