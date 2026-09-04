package com.salonqueue.repository;

import com.salonqueue.entity.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long> {
    List<Service> findBySalonIdAndActiveTrue(Long salonId);
    List<Service> findBySalonId(Long salonId);
}
