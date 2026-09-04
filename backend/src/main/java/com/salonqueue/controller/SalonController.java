package com.salonqueue.controller;

import com.salonqueue.dto.request.SalonRequest;
import com.salonqueue.dto.response.ApiResponse;
import com.salonqueue.dto.response.SalonResponse;
import com.salonqueue.security.UserPrincipal;
import com.salonqueue.service.SalonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salons")
@RequiredArgsConstructor
public class SalonController {

    private final SalonService salonService;

    @PostMapping
    public ResponseEntity<?> createSalon(
            @Valid @RequestBody SalonRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            SalonResponse salon = salonService.createSalon(request, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Salon created successfully", salon));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @GetMapping("/my-salon")
    public ResponseEntity<?> getMySalon(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            SalonResponse response = salonService.mySalon(currentUser);
            if (response == null) {
                return ResponseEntity.ok(new ApiResponse(true, "No salon found", null));
            }
            return ResponseEntity.ok(new ApiResponse(true, "Salon retrieved successfully", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSalon(@PathVariable Long id) {
        try {
            SalonResponse salon = salonService.getSalonById(id);
            return ResponseEntity.ok(new ApiResponse(true, "Salon retrieved successfully", salon));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * Original endpoint — kept exactly as it was.
     * GET /api/salons/search/nearby?latitude=28.6&longitude=77.2&radiusKm=10
     *
     * Your existing salonAPI.searchNearby() in the frontend calls this URL
     * so it must stay unchanged.
     */
    @GetMapping("/search/nearby")
    public ResponseEntity<?> searchNearbySalons(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "10.0") Double radiusKm) {
        try {
            // Cap radius at 50km to prevent querying the entire database
            double cappedRadius = Math.min(radiusKm, 50.0);
            List<SalonResponse> salons = salonService.searchNearbySalons(
                    latitude, longitude, cappedRadius
            );
            return ResponseEntity.ok(new ApiResponse(true, "Salons found", salons));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * NEW — search salons by name for the search bar in CustomerHome.
     * GET /api/salons/search/name?query=sharma
     *
     * Case-insensitive partial match on salon name.
     * Only returns active + verified salons.
     */
    @GetMapping("/search/name")
    public ResponseEntity<?> searchByName(@RequestParam String query) {
        try {
            if (query == null || query.trim().length() < 2) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse(false, "Query must be at least 2 characters"));
            }
            List<SalonResponse> salons = salonService.searchByName(query.trim());
            return ResponseEntity.ok(new ApiResponse(true, "Salons found", salons));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * NEW — lets the salon owner set today's active chair count (1 or 2).
     * PATCH /api/salons/{id}/chairs   body: { "totalChairs": 2 }
     *
     * Owner-only — verified against the salon's owner_id inside the service.
     */
    @PatchMapping("/{id}/chairs")
    public ResponseEntity<?> updateChairs(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Integer> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            Integer totalChairs = body.get("totalChairs");
            SalonResponse response = salonService.updateChairCount(id, currentUser.getId(), totalChairs);
            return ResponseEntity.ok(new ApiResponse(true, "Chair count updated", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
}
