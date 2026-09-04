package com.salonqueue.controller;

import com.salonqueue.dto.request.WalkInRequest;
import com.salonqueue.dto.response.ApiResponse;
import com.salonqueue.dto.response.QueueEntryResponse;
import com.salonqueue.security.UserPrincipal;
import com.salonqueue.service.QueueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/queue")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    // Read-only — deliberately public to any authenticated user (not just
    // the owner). The live queue is meant to be visible to customers
    // browsing a salon, same as estimatedWaitMinutes below.
    @GetMapping("/salon/{salonId}")
    public ResponseEntity<?> getQueue(@PathVariable Long salonId) {
        try {
            // ← FIX: now returns List<QueueEntryResponse> (includes bookingCode)
            List<QueueEntryResponse> queue = queueService.getQueueForSalon(salonId);
            return ResponseEntity.ok(new ApiResponse(true, "Queue retrieved successfully", queue));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/walkin")
    public ResponseEntity<?> addWalkIn(@Valid @RequestBody WalkInRequest request,
                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            QueueEntryResponse queueEntry = queueService.addWalkInToQueue(request, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Walk-in added to queue", queueEntry));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/{queueEntryId}/start")
    public ResponseEntity<?> startService(@PathVariable Long queueEntryId,
                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            queueService.startService(queueEntryId, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Service started"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/{queueEntryId}/complete")
    public ResponseEntity<?> completeService(@PathVariable Long queueEntryId,
                                              @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            queueService.completeService(queueEntryId, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Service completed"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @DeleteMapping("/{queueEntryId}")
    public ResponseEntity<?> removeFromQueue(@PathVariable Long queueEntryId,
                                              @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            queueService.removeFromQueue(queueEntryId, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Entry removed from queue"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * POST /api/queue/{queueEntryId}/cancel-booking
     * Body: { "reason": "SALON_EMERGENCY" }
     *
     * Used when barber cancels an online booking customer.
     * Records the reason on the booking so the customer can see why.
     * Different from DELETE /{id} which is for walk-ins only.
     */
    @PostMapping("/{queueEntryId}/cancel-booking")
    public ResponseEntity<?> cancelOnlineBooking(
            @PathVariable Long queueEntryId,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            String reason = body.getOrDefault("reason", "OTHER");
            queueService.cancelOnlineBookingFromQueue(queueEntryId, reason, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Booking cancelled"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    // Read-only, deliberately public — same reasoning as getQueue above.
    @GetMapping("/salon/{salonId}/wait-time")
    public ResponseEntity<?> getEstimatedWaitTime(@PathVariable Long salonId) {
        try {
            Integer waitTime = queueService.getEstimatedWaitTime(salonId);
            return ResponseEntity.ok(new ApiResponse(true, "Wait time retrieved", waitTime));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
}