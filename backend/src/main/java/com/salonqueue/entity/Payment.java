package com.salonqueue.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Stores every Razorpay payment attempt for a booking.
 *
 * One Booking → One Payment (OneToOne).
 * A payment starts as CREATED when we get a Razorpay order_id,
 * then moves to CAPTURED once the webhook confirms success,
 * or FAILED if the customer abandons / card declines.
 *
 * We store both razorpayOrderId (from order creation) and
 * razorpayPaymentId (from webhook) so we can verify the signature
 * and have a full audit trail.
 */
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Link to booking ───────────────────────────────────────────────────────
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    // ── Razorpay identifiers ──────────────────────────────────────────────────
    /**
     * Razorpay order ID — created by us when customer clicks "Pay".
     * Format: order_XXXXXXXXXXXXXXXX
     * Used to open the Razorpay checkout popup on the frontend.
     */
    @Column(nullable = false, unique = true)
    private String razorpayOrderId;

    /**
     * Razorpay payment ID — set by webhook after customer completes payment.
     * Format: pay_XXXXXXXXXXXXXXXX
     * Null until payment is captured.
     */
    @Column(unique = true)
    private String razorpayPaymentId;

    /**
     * Razorpay signature — sent by webhook, verified by us using HMAC-SHA256.
     * Stored for audit purposes after verification.
     */
    @Column(columnDefinition = "TEXT")
    private String razorpaySignature;

    // ── Payment details ───────────────────────────────────────────────────────
    /**
     * Amount in PAISE (Razorpay uses smallest currency unit).
     * ₹150 → 15000 paise. Always store and send in paise.
     */
    @Column(nullable = false)
    private Long amountPaise;

    @Column(nullable = false)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    /**
     * Razorpay receipt ID — a short identifier we send when creating the order.
     * We use the booking code for easy tracing.
     */
    @Column(nullable = false)
    private String receipt;

    // ── Timestamps ────────────────────────────────────────────────────────────
    private LocalDateTime capturedAt;   // when webhook confirmed success

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column
    private String refundId;

    @Column
    private LocalDateTime refundedAt;

    // Also add REFUNDED to Payment.PaymentStatus enum:
    public enum PaymentStatus {
        CREATED, CAPTURED, FAILED, REFUNDED
    }
}