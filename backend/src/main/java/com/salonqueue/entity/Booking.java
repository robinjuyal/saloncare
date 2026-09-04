package com.salonqueue.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String bookingCode;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    @JsonIgnore
    private User customer;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    @JsonIgnore
    private Salon salon;

    // Was a single @ManyToOne Service reference — replaced with this
    // collection so a booking can combine several services (Haircut +
    // Beard + Color) instead of the salon needing a separate priced
    // "combo" service for every possible combination. See
    // BookingServiceItem for why each item snapshots its own name/price/
    // duration rather than always reading live off the Service row.
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<BookingServiceItem> serviceItems = new java.util.ArrayList<>();
    
    @Column(nullable = false)
    private LocalDateTime scheduledTime;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;
    
    @Column(nullable = false)
    private Boolean paymentCompleted = false;
    
    private String paymentId;
    
    private LocalDateTime paymentTime;
    
    private LocalDateTime arrivedTime;
    private LocalDateTime serviceStartTime;
    private LocalDateTime serviceEndTime;
    
    @Column(columnDefinition = "TEXT")
    private String notes;

    /**
     * Reason set by the salon when they cancel an online booking from the queue.
     * Null for customer-initiated cancellations or completed bookings.
     *
     * Values: SALON_EMERGENCY | RUNNING_TOO_LATE | OVERBOOKING | OTHER
     */
    @Column(name = "cancellation_reason")
    private String cancellationReason;

    /**
     * Timestamp when the booking was cancelled.
     * Null if booking is not cancelled.
     */
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    /**
     * Who cancelled the booking.
     * Values: "SALON" | "CUSTOMER"
     * Null if booking is not cancelled.
     */
    @Column(name = "cancelled_by")
    private String cancelledBy;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL)
    private QueueEntry queueEntry;

    /**
     * All selected service names joined for display, e.g.
     * "Men's Haircut + Men's Beard". Used everywhere a booking's service(s)
     * need to show as one string — QueueEntry.serviceName, BookingResponse,
     * admin summaries — so the join logic lives in exactly one place
     * instead of being copy-pasted across three services.
     */
    public String getCombinedServiceName() {
        return serviceItems.stream()
                .map(BookingServiceItem::getServiceName)
                .collect(java.util.stream.Collectors.joining(" + "));
    }

    /** Sum of every selected service's duration — this is the one number the queue/wait-time engine actually needs; it doesn't care how many services produced it. */
    public int getTotalDurationMinutes() {
        return serviceItems.stream()
                .mapToInt(BookingServiceItem::getDurationMinutes)
                .sum();
    }

    public enum BookingStatus {
        PENDING_PAYMENT,
        CONFIRMED,
        ARRIVED,
        IN_PROGRESS,
        COMPLETED,
        NO_SHOW,
        CANCELLED,
        RESCHEDULED
    }
}
