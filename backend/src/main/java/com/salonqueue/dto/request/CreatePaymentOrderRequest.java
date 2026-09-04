package com.salonqueue.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * Sent by frontend when customer clicks "Pay Now".
 * Contains the booking details needed to create a Razorpay order.
 *
 * serviceIds — was a single serviceId; now a list so a customer can
 * combine several services (Haircut + Beard + Color) into one booking
 * instead of the salon needing a priced "combo" entry for every possible
 * combination. Must contain at least one ID.
 */
@Data
public class CreatePaymentOrderRequest {
    @NotNull
    private Long salonId;
    @NotEmpty(message = "Select at least one service")
    private List<Long> serviceIds;
    private String notes;
}