package com.salonqueue.controller;

import com.salonqueue.dto.response.ApiResponse;
import com.salonqueue.security.UserPrincipal;
import com.salonqueue.service.SalonOwnerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/owner")
@RequiredArgsConstructor
@Slf4j
public class SalonOwnerController {

    private final SalonOwnerService salonOwnerService;

    /** GET /api/owner/salon/{salonId}/status */
    @GetMapping("/salon/{salonId}/status")
    public ResponseEntity<?> getStatus(
            @PathVariable Long salonId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Status fetched",
                    salonOwnerService.getShopStatus(salonId, currentUser.getId())));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** PUT /api/owner/salon/{salonId}/toggle */
    @PutMapping("/salon/{salonId}/toggle")
    public ResponseEntity<?> toggleShop(
            @PathVariable Long salonId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Status updated",
                    salonOwnerService.toggleShopStatus(salonId, currentUser.getId())));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** GET /api/owner/salon/{salonId}/analytics/today */
    @GetMapping("/salon/{salonId}/analytics/today")
    public ResponseEntity<?> getToday(
            @PathVariable Long salonId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Today analytics",
                    salonOwnerService.getTodayAnalytics(salonId, currentUser.getId())));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * GET /api/owner/salon/{salonId}/analytics/range
     *     ?from=2026-03-01&to=2026-03-20
     */
    @GetMapping("/salon/{salonId}/analytics/range")
    public ResponseEntity<?> getRange(
            @PathVariable Long salonId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            if (from.isAfter(to)) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse(false, "From date must be before to date"));
            }
            return ResponseEntity.ok(new ApiResponse(true, "Range analytics",
                    salonOwnerService.getAnalyticsByRange(salonId, currentUser.getId(), from, to)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }
}