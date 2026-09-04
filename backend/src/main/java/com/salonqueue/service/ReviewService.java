package com.salonqueue.service;

import com.salonqueue.dto.response.ReviewResponse;
import com.salonqueue.entity.*;
import com.salonqueue.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final SalonRepository salonRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // SUBMIT REVIEW
    // Customer can only review a salon if:
    //   1. They have a COMPLETED booking at that salon
    //   2. They haven't already reviewed that salon
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public ReviewResponse submitReview(Long salonId, Long customerId,
                                       Integer rating, String comment) {
        // Validate rating range
        if (rating < 1 || rating > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }

        // Check customer has a completed booking at this salon
        boolean hasCompletedBooking = bookingRepository
                .existsBySalonIdAndCustomerIdAndStatus(
                        salonId, customerId, Booking.BookingStatus.COMPLETED);

        if (!hasCompletedBooking) {
            throw new RuntimeException(
                    "You can only review a salon after your service is completed");
        }

        // Check not already reviewed
        if (reviewRepository.existsBySalonIdAndCustomerId(salonId, customerId)) {
            throw new RuntimeException("You have already reviewed this salon");
        }

        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));

        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Save review
        Review review = Review.builder()
                .salon(salon)
                .customer(customer)
                .rating(rating)
                .comment(comment)
                .build();
        review = reviewRepository.save(review);

        // Recalculate salon's average rating
        recalculateSalonRating(salon);

        log.info("Review submitted: customer={} salon={} rating={}", customerId, salonId, rating);
        return mapToResponse(review);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET REVIEWS FOR A SALON
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getSalonReviews(Long salonId) {
        return reviewRepository.findBySalonIdOrderByCreatedAtDesc(salonId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK IF CUSTOMER CAN REVIEW
    // Returns: "can_review" | "already_reviewed" | "no_completed_booking"
    // Frontend uses this to decide what to show
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public String getReviewStatus(Long salonId, Long customerId) {
        if (reviewRepository.existsBySalonIdAndCustomerId(salonId, customerId)) {
            return "already_reviewed";
        }
        boolean hasCompleted = bookingRepository
                .existsBySalonIdAndCustomerIdAndStatus(
                        salonId, customerId, Booking.BookingStatus.COMPLETED);
        return hasCompleted ? "can_review" : "no_completed_booking";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECALCULATE SALON RATING
    // Called after every new review — recomputes average from all reviews
    // ─────────────────────────────────────────────────────────────────────────

    private void recalculateSalonRating(Salon salon) {
        List<Review> allReviews = reviewRepository.findBySalonIdOrderByCreatedAtDesc(salon.getId());
        int total = allReviews.size();

        if (total == 0) {
            salon.setRating(BigDecimal.ZERO);
            salon.setTotalReviews(0);
        } else {
            double avg = allReviews.stream()
                    .mapToInt(Review::getRating)
                    .average()
                    .orElse(0.0);
            salon.setRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
            salon.setTotalReviews(total);
        }

        salonRepository.save(salon);
        log.info("Salon {} rating updated to {} ({} reviews)",
                salon.getId(), salon.getRating(), salon.getTotalReviews());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAPPER
    // ─────────────────────────────────────────────────────────────────────────

    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .salonId(review.getSalon().getId())
                .salonName(review.getSalon().getName())
                .customerId(review.getCustomer().getId())
                .customerName(review.getCustomer().getName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }
}