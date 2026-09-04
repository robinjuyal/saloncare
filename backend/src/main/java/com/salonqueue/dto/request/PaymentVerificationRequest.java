package com.salonqueue.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Sent by frontend AFTER Razorpay popup completes successfully.
 * Contains the three IDs Razorpay gives back on payment success.
 *
 * We verify these against our stored order and the HMAC-SHA256 signature
 * before confirming the booking. This is a secondary safety check —
 * the webhook is the primary confirmation.
 */
@Data
public class PaymentVerificationRequest {
    @NotBlank
    private String razorpayOrderId;
    @NotBlank
    private String razorpayPaymentId;
    @NotBlank
    private String razorpaySignature;
}