package com.salonqueue.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Key-value store for runtime platform configuration.
 * Admin can update these from the dashboard without touching code.
 *
 * Seeded with defaults via V7 migration.
 * Keys: noshow_timeout_minutes, max_radius_km, commission_percent,
 *       platform_name, support_email, max_queue_size
 */
@Entity
@Table(name = "platform_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformConfig {

    @Id
    @Column(nullable = false, unique = true)
    private String configKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String configValue;

    @Column(columnDefinition = "TEXT")
    private String description;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}