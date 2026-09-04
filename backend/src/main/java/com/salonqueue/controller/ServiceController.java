package com.salonqueue.controller;

import com.salonqueue.dto.response.ApiResponse;
import com.salonqueue.dto.response.ServiceResponse;
import com.salonqueue.entity.Service;
import com.salonqueue.security.UserPrincipal;
import com.salonqueue.service.ServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceController {
    
    private final ServiceService serviceService;

    // Read-only — public, customers need to browse a salon's services.
    @GetMapping("/salon/{salonId}")
    public ResponseEntity<?> getServicesBySalon(@PathVariable Long salonId) {
        try {
            List<ServiceResponse> services = serviceService.getServicesBySalon(salonId);
            return ResponseEntity.ok(new ApiResponse(true, "Services retrieved successfully", services));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getService(@PathVariable Long id) {
        try {
            ServiceResponse service = serviceService.getServiceById(id);
            return ResponseEntity.ok(new ApiResponse(true, "Service retrieved successfully", service));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
    
    @PostMapping("/salon/{salonId}")
    public ResponseEntity<?> createService(@PathVariable Long salonId,
                                          @RequestBody Service serviceRequest,
                                          @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            ServiceResponse service = serviceService.createService(salonId, serviceRequest, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Service created successfully", service));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateService(@PathVariable Long id,
                                          @RequestBody Service serviceRequest,
                                          @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            ServiceResponse service = serviceService.updateService(id, serviceRequest, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Service updated successfully", service));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteService(@PathVariable Long id,
                                            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            serviceService.deleteService(id, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Service deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
}
