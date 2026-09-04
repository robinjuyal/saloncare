package com.salonqueue.controller;

import com.salonqueue.dto.response.ApiResponse;
import com.salonqueue.security.UserPrincipal;
import com.salonqueue.service.ReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Slf4j
public class ReviewController {

    private final ReviewService reviewService;

    /**
     * GET /api/reviews/salon/{salonId}
     * Public — anyone can see reviews for a salon (used in SalonDetails page)
     */
    @GetMapping("/salon/{salonId}")
    public ResponseEntity<?> getSalonReviews(@PathVariable Long salonId) {
        try {
            return ResponseEntity.ok(
                    new ApiResponse(true, "Reviews fetched", reviewService.getSalonReviews(salonId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * GET /api/reviews/status/{salonId}
     * Returns whether logged-in customer can review this salon.
     * Response: "can_review" | "already_reviewed" | "no_completed_booking"
     */
    @GetMapping("/status/{salonId}")
    public ResponseEntity<?> getReviewStatus(
            @PathVariable Long salonId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            String status = reviewService.getReviewStatus(salonId, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Status fetched", status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * POST /api/reviews/salon/{salonId}
     * Submit a review. Requires CUSTOMER role + completed booking.
     * Body: { rating: 1-5, comment: "..." }
     */
    @PostMapping("/salon/{salonId}")
    public ResponseEntity<?> submitReview(
            @PathVariable Long salonId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            Integer rating  = (Integer) body.get("rating");
            String  comment = (String)  body.get("comment");

            if (rating == null) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse(false, "Rating is required"));
            }

            return ResponseEntity.ok(new ApiResponse(true, "Review submitted",
                    reviewService.submitReview(salonId, currentUser.getId(), rating, comment)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }
}