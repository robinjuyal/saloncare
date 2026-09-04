package com.salonqueue.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Returned to frontend after we create a Razorpay order.
 * Frontend uses razorpayOrderId + razorpayKeyId to open the checkout popup.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderResponse {
    private String bookingCode;       // our internal booking reference
    private Long bookingId;           // our DB booking ID
    private String razorpayOrderId;   // order_XXXXXXXX — passed to Razorpay popup
    private String razorpayKeyId;     // rzp_test_XXXXX — public key, safe to send to frontend
    private Long amountPaise;         // amount in paise for Razorpay popup
    private String currency;          // "INR"
    private String salonName;
    private String serviceName;
    private BigDecimal amount;        // human-readable ₹ amount for display
}