package com.salonqueue.controller;

import com.salonqueue.dto.response.ApiResponse;
import com.salonqueue.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * All endpoints here require ADMIN role.
 * SecurityConfig locks /api/admin/** to ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // ─────────────────────────────────────────────────────────────────────────
    // ANALYTICS
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/admin/analytics/summary */
    @GetMapping("/analytics/summary")
    public ResponseEntity<?> getAnalyticsSummary() {
        try {

            return ResponseEntity.ok(new ApiResponse(true, "Summary fetched", adminService.getAnalyticsSummary()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SALON MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/salons?status=pending|active|inactive|all
     * Returns all salons, optionally filtered by status.
     */
    @GetMapping("/salons")
    public ResponseEntity<?> getAllSalons(@RequestParam(required = false) String status) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Salons fetched", adminService.getAllSalons(status)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** GET /api/admin/salons/{id} */
    @GetMapping("/salons/{id}")
    public ResponseEntity<?> getSalonDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Salon detail", adminService.getSalonDetail(id)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** POST /api/admin/salons — admin registers a new salon */
    @PostMapping("/salons")
    public ResponseEntity<?> registerSalon(@RequestBody Map<String, Object> request) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Salon registered", adminService.registerSalon(request)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** PUT /api/admin/salons/{id}/approve */
    @PutMapping("/salons/{id}/approve")
    public ResponseEntity<?> approveSalon(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Salon approved", adminService.approveSalon(id)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** PUT /api/admin/salons/{id}/reject */
    @PutMapping("/salons/{id}/reject")
    public ResponseEntity<?> rejectSalon(@PathVariable Long id,
                                         @RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = body != null ? body.get("reason") : null;
            return ResponseEntity.ok(new ApiResponse(true, "Salon rejected", adminService.rejectSalon(id, reason)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** PUT /api/admin/salons/{id}/toggle — activate or deactivate */
    @PutMapping("/salons/{id}/toggle")
    public ResponseEntity<?> toggleSalon(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Salon status updated", adminService.toggleSalonActive(id)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** PUT /api/admin/salons/{id}/coords */
    @PutMapping("/salons/{id}/coords")
    public ResponseEntity<?> updateCoords(@PathVariable Long id,
                                          @RequestBody Map<String, Double> body) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Coords updated",
                    adminService.updateSalonCoords(id, body.get("latitude"), body.get("longitude"))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/admin/users?role=CUSTOMER|SALON_OWNER */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) String role) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Users fetched", adminService.getAllUsers(role)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** PUT /api/admin/users/{id}/toggle */
    @PutMapping("/users/{id}/toggle")
    public ResponseEntity<?> toggleUser(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "User status updated", adminService.toggleUserActive(id)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BOOKING MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/admin/bookings?status=CONFIRMED&salonId=1 */
    @GetMapping("/bookings")
    public ResponseEntity<?> getAllBookings(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long salonId) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Bookings fetched",
                    adminService.getAllBookings(status, salonId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/admin/payments?status=CAPTURED */
    @GetMapping("/payments")
    public ResponseEntity<?> getAllPayments(@RequestParam(required = false) String status) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Payments fetched", adminService.getAllPayments(status)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** POST /api/admin/payments/{id}/refund */
    @PostMapping("/payments/{id}/refund")
    public ResponseEntity<?> initiateRefund(@PathVariable Long id,
                                            @RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = body != null ? body.get("reason") : null;
            return ResponseEntity.ok(new ApiResponse(true, "Refund initiated", adminService.initiateRefund(id, reason)));
        } catch (Exception e) {
            log.error("Refund failed for payment {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIVE QUEUE MONITOR
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/admin/queue/live */
    @GetMapping("/queue/live")
    public ResponseEntity<?> getLiveQueues() {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Live queues fetched", adminService.getLiveQueues()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PLATFORM CONFIG
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/admin/config */
    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Config fetched", adminService.getConfig()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }

    /** PUT /api/admin/config/{key} */
    @PutMapping("/config/{key}")
    public ResponseEntity<?> updateConfig(@PathVariable String key,
                                          @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(new ApiResponse(true, "Config updated",
                    adminService.updateConfig(key, body.get("value"))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage()));
        }
    }
}