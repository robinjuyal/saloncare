package com.salonqueue.repository;

import com.salonqueue.entity.PlatformConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformConfigRepository extends JpaRepository<PlatformConfig, String> {
    Optional<PlatformConfig> findByConfigKey(String configKey);
}