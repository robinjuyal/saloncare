package com.salonqueue.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalTime;
import java.util.Set;

@Data
public class SalonRequest {
    @NotBlank
    private String name;
    private String description;
    @NotBlank
    private String address;
    @NotBlank
    private String city;
    @NotBlank
    private String state;
    @NotBlank
    private String pincode;
    private Double latitude;
    private Double longitude;
    @NotBlank
    private String phone;
    private String email;
    @NotNull
    private LocalTime openingTime;
    @NotNull
    private LocalTime closingTime;
    private Set<String> workingDays;
    @Min(1)
    private Integer totalChairs = 1;
}