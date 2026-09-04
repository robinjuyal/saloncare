package com.salonqueue.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalonResponse {
    private Long id;
    private String name;
    private String description;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private Double latitude;
    private Double longitude;
    private String phone;
    private String email;
    private String coverImage;
    private Set<String> images;
    private LocalTime openingTime;
    private LocalTime closingTime;
    private Set<String> workingDays;
    private Integer totalChairs;
    private Boolean active;
    private Boolean verified;
    private BigDecimal rating;
    private Integer totalReviews;
    private Integer currentQueueSize;
    private Integer estimatedWaitMinutes;
}