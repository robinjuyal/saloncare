package com.salonqueue.service;

import com.salonqueue.dto.request.SalonRequest;
import com.salonqueue.dto.response.QueueEntryResponse;
import com.salonqueue.dto.response.SalonResponse;
import com.salonqueue.entity.Salon;
import com.salonqueue.entity.User;
import com.salonqueue.repository.SalonRepository;
import com.salonqueue.repository.UserRepository;
import com.salonqueue.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalonService {

    private final SalonRepository salonRepository;
    private final UserRepository userRepository;
    private final QueueService queueService;

    @Transactional
    public SalonResponse createSalon(SalonRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));

        // Was previously missing entirely — any authenticated CUSTOMER
        // account could call this endpoint and become a salon's owner,
        // completely bypassing the admin-only onboarding model (and
        // undermining the earlier fix that removed self-service
        // SALON_OWNER signup — that fix meant nothing if this endpoint
        // could still hand out ownership to anyone who asked).
        if (owner.getRole() != User.Role.SALON_OWNER) {
            throw new RuntimeException("Only salon owner accounts can create a salon");
        }

        Salon salon = Salon.builder()
                .name(request.getName())
                .description(request.getDescription())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .phone(request.getPhone())
                .email(request.getEmail())
                .openingTime(request.getOpeningTime())
                .closingTime(request.getClosingTime())
                .workingDays(request.getWorkingDays())
                .totalChairs(request.getTotalChairs())
                .owner(owner)
                .active(true)
                .verified(false)
                .rating(BigDecimal.ZERO)
                .totalReviews(0)
                .build();

        salon = salonRepository.save(salon);
        return mapToResponse(salon);
    }

    @Transactional(readOnly = true)
    public List<SalonResponse> searchNearbySalons(Double latitude, Double longitude, Double radiusKm) {
        List<Salon> salons = salonRepository.findNearbySalons(latitude, longitude, radiusKm);
        return salons.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SalonResponse getSalonById(Long id) {
        Salon salon = salonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Salon not found"));
        return mapToResponse(salon);
    }

    @Transactional(readOnly = true)
    public List<SalonResponse> searchByName(String query) {
        return salonRepository.searchByName(query)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public SalonResponse mySalon(UserPrincipal currentUser) {
        List<Salon> salons = salonRepository.findByOwnerId(currentUser.getId());
        Salon salon = salons.get(0);
        return mapToResponse(salon);
    }

    private SalonResponse mapToResponse(Salon salon) {
        // ← getQueueForSalon now returns List<QueueEntryResponse>, .size() still works fine
        List<QueueEntryResponse> queue = queueService.getQueueForSalon(salon.getId());

        return SalonResponse.builder()
                .id(salon.getId())
                .name(salon.getName())
                .description(salon.getDescription())
                .address(salon.getAddress())
                .city(salon.getCity())
                .state(salon.getState())
                .pincode(salon.getPincode())
                .latitude(salon.getLatitude())
                .longitude(salon.getLongitude())
                .phone(salon.getPhone())
                .email(salon.getEmail())
                .coverImage(salon.getCoverImage())
                .images(salon.getImages())
                .openingTime(salon.getOpeningTime())
                .closingTime(salon.getClosingTime())
                .workingDays(salon.getWorkingDays())
                .totalChairs(salon.getTotalChairs())
                .active(salon.getActive())
                .verified(salon.getVerified())
                .rating(salon.getRating())
                .totalReviews(salon.getTotalReviews())
                .currentQueueSize(queue.size())
                .estimatedWaitMinutes(queueService.getEstimatedWaitTime(salon.getId()))
                .build();
    }

    /**
     * Lets the salon owner change how many chairs are active *today* —
     * e.g. dropping to 1 chair when a barber calls in sick. Capped at 2
     * because that's the max chair count this app supports right now.
     *
     * Deliberately does NOT touch any chair currently mid-service if the
     * owner drops the count — QueueService's chair-assignment logic simply
     * stops offering the now-inactive chair to new customers; whoever's
     * already in it finishes normally.
     */
    @Transactional
    public SalonResponse updateChairCount(Long salonId, Long ownerId, Integer totalChairs) {
        if (totalChairs == null || totalChairs < 1 || totalChairs > 2) {
            throw new RuntimeException("Chair count must be 1 or 2");
        }

        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));

        if (!salon.getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("You do not own this salon");
        }

        salon.setTotalChairs(totalChairs);
        salon = salonRepository.save(salon);

        return getSalonById(salon.getId());
    }
}


