package com.salonqueue.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WalkInRequest {
    @NotNull
    private Long salonId;
    @NotNull
    private Long serviceId;
    @NotBlank
    private String customerName;
}