package com.salonqueue.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    private Long id;
    private String bookingCode;
    private Long customerId;
    private String customerName;
    private Long salonId;
    private String salonName;
    private String salonAddress;
    // serviceName now holds all selected services joined ("Men's Haircut +
    // Men's Beard"), and serviceDuration is their summed total — was a
    // single serviceId/serviceName/duration when a booking could only have
    // one service. Dropped serviceId entirely since nothing read it and a
    // single ID isn't meaningful once a booking can have several services.
    private String serviceName;
    private Integer serviceDuration;
    private LocalDateTime scheduledTime;
    private String status;
    private BigDecimal amount;
    private Boolean paymentCompleted;
    private Integer queuePosition;
    private LocalDateTime estimatedStartTime;
    private LocalDateTime createdAt;

    // ── Cancellation fields ───────────────────────────────────────────────────
    // Populated when a booking is cancelled by the salon from the barber dashboard.
    // All three will be null for completed bookings or customer-initiated cancellations
    // that don't go through the cancel-booking endpoint.
    private String cancellationReason;  // SALON_EMERGENCY | RUNNING_TOO_LATE | OVERBOOKING | OTHER
    private String cancelledBy;         // "SALON" | "CUSTOMER"
    private LocalDateTime cancelledAt;
}