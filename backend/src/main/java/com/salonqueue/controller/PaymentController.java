package com.salonqueue.controller;

import com.salonqueue.dto.request.CreatePaymentOrderRequest;
import com.salonqueue.dto.request.PaymentVerificationRequest;
import com.salonqueue.dto.response.ApiResponse;
import com.salonqueue.dto.response.PaymentOrderResponse;
import com.salonqueue.entity.Payment;
import com.salonqueue.security.UserPrincipal;
import com.salonqueue.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * STEP 1 — Customer clicks "Pay Now"
     * POST /api/payments/create-order
     *
     * Creates a Booking (PENDING_PAYMENT) + Razorpay order.
     * Returns order details for the frontend to open Razorpay checkout popup.
     * Requires authentication (customer must be logged in).
     */
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(
            @Valid @RequestBody CreatePaymentOrderRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            PaymentOrderResponse response = paymentService.createPaymentOrder(request, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Payment order created", response));
        } catch (Exception e) {
            log.error("Error creating payment order: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * STEP 2A — Razorpay webhook (PRIMARY confirmation)
     * POST /api/payments/webhook
     *
     * Called by Razorpay servers after payment is captured.
     * NO authentication — Razorpay doesn't send JWT tokens.
     * Security via HMAC-SHA256 signature verification inside PaymentService.
     *
     * IMPORTANT: This endpoint must be in SecurityConfig permitAll list.
     * In production: set this URL in your Razorpay dashboard under Webhooks.
     * In dev: use ngrok to expose localhost (see README).
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("X-Razorpay-Signature") String signature) {
        try {
            paymentService.handleWebhook(payload, signature);
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            log.warn("Webhook rejected — invalid signature");
            return ResponseEntity.status(400).body("Invalid signature");
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage());
            // Return 200 to Razorpay even on processing error
            // so it doesn't keep retrying — we'll reconcile manually
            return ResponseEntity.ok().build();
        }
    }

    /**
     * STEP 2B — Frontend verification (SECONDARY safety check)
     * POST /api/payments/verify
     *
     * Called by frontend after Razorpay popup succeeds.
     * Verifies signature and confirms booking if not already confirmed by webhook.
     * This handles the case where webhook hasn't arrived yet (network delay).
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @Valid @RequestBody PaymentVerificationRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            paymentService.verifyAndConfirmPayment(
                    request.getRazorpayOrderId(),
                    request.getRazorpayPaymentId(),
                    request.getRazorpaySignature()
            );
            return ResponseEntity.ok(new ApiResponse(true, "Payment verified successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(400)
                    .body(new ApiResponse(false, "Payment verification failed"));
        } catch (Exception e) {
            log.error("Payment verification error: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * GET /api/payments/status/{razorpayOrderId}
     *
     * Frontend polls this after Razorpay popup closes to check if
     * webhook has confirmed the payment. Used for the success screen.
     */
    @GetMapping("/status/{razorpayOrderId}")
    public ResponseEntity<?> getPaymentStatus(
            @PathVariable String razorpayOrderId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            Payment.PaymentStatus status = paymentService.getPaymentStatus(razorpayOrderId, currentUser.getId());
            return ResponseEntity.ok(new ApiResponse(true, "Status retrieved", status.toString()));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
}