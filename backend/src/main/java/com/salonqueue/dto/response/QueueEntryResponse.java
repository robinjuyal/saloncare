package com.salonqueue.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueEntryResponse {
    private Long id;
    private Long salonId;
    private String salonName;
    private Integer position;
    private String type;         // ONLINE_BOOKING or WALK_IN
    private String status;       // WAITING, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
    private String customerName;
    private String serviceName;
    private Integer estimatedDurationMinutes;
    private LocalDateTime estimatedStartTime;
    private LocalDateTime actualStartTime;
    private LocalDateTime completedTime;
    private Integer chairNumber;
    // ← FIX: was missing — frontend needs this to match booking to queue entry
    private String bookingCode;
    // Only populated for online bookings (looked up via booking.customer.phone) —
    // walk-ins have no linked user account, so this is null for those entries.
    private String customerPhone;
}