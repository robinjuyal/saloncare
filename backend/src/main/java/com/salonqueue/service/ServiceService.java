package com.salonqueue.service;

import com.salonqueue.dto.response.ServiceResponse;
import com.salonqueue.entity.Salon;
import com.salonqueue.entity.Service;
import com.salonqueue.exception.ResourceNotFoundException;
import com.salonqueue.repository.SalonRepository;
import com.salonqueue.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceService {
    
    private final ServiceRepository serviceRepository;
    private final SalonRepository salonRepository;
    
    @Transactional(readOnly = true)
    public List<ServiceResponse> getServicesBySalon(Long salonId) {
        List<Service> services = serviceRepository.findBySalonIdAndActiveTrue(salonId);
        return services.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public ServiceResponse getServiceById(Long id) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", id));
        return mapToResponse(service);
    }
    
    /**
     * Verifies the calling user owns the salon in question. Previously
     * missing entirely — any authenticated user could create, edit, or
     * delete services (including prices) on ANY salon, not just their own.
     * Same pattern as QueueService.verifySalonOwnership.
     */
    private void verifySalonOwnership(Salon salon, Long callerId) {
        if (!salon.getOwner().getId().equals(callerId)) {
            throw new RuntimeException("You do not have permission to manage this salon's services");
        }
    }

    @Transactional
    public ServiceResponse createService(Long salonId, Service serviceRequest, Long callerId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salon", "id", salonId));

        verifySalonOwnership(salon, callerId);

        serviceRequest.setSalon(salon);
        serviceRequest.setActive(true);
        
        Service saved = serviceRepository.save(serviceRequest);
        return mapToResponse(saved);
    }
    
    @Transactional
    public ServiceResponse updateService(Long id, Service serviceRequest, Long callerId) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", id));

        verifySalonOwnership(service.getSalon(), callerId);

        service.setName(serviceRequest.getName());
        service.setDescription(serviceRequest.getDescription());
        service.setPrice(serviceRequest.getPrice());
        service.setDurationMinutes(serviceRequest.getDurationMinutes());
        service.setCategory(serviceRequest.getCategory());
        
        Service updated = serviceRepository.save(service);
        return mapToResponse(updated);
    }
    
    @Transactional
    public void deleteService(Long id, Long callerId) {
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", id));

        verifySalonOwnership(service.getSalon(), callerId);

        service.setActive(false);
        serviceRepository.save(service);
    }
    
    private ServiceResponse mapToResponse(Service service) {
        return ServiceResponse.builder()
                .id(service.getId())
                .name(service.getName())
                .description(service.getDescription())
                .price(service.getPrice())
                .durationMinutes(service.getDurationMinutes())
                .category(service.getCategory().name())
                .imageUrl(service.getImageUrl())
                .active(service.getActive())
                .build();
    }
}
