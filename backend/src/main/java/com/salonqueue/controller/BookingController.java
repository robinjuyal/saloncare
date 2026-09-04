package com.salonqueue.controller;

import com.salonqueue.dto.response.ApiResponse;
import com.salonqueue.dto.response.BookingResponse;
import com.salonqueue.security.UserPrincipal;
import com.salonqueue.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // Note: there used to be a POST / here (createBooking) that created a
    // CONFIRMED booking directly with no payment involved at all. It was
    // dead code — the frontend never called it, real bookings always go
    // through PaymentService.createPaymentOrder() → Razorpay → webhook/
    // verify — but keeping an unused endpoint that bypasses payment
    // entirely wasn't worth preserving just to also make it multi-service
    // compatible. Removed rather than updated.

    @GetMapping("/customer")
    public ResponseEntity<?> getMyBookings(@AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            List<BookingResponse> bookings = bookingService.getCustomerBookingsAsResponse(currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Bookings retrieved", bookings));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
}