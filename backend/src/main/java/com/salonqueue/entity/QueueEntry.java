package com.salonqueue.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "queue_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueueEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    @JsonIgnore
    private Salon salon;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    @JsonIgnore
    private Booking booking;

    // ← FIX: nullable = true so setPosition(null) doesn't throw a DB constraint violation
    @Column(nullable = true)
    private Integer position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QueueType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QueueStatus status;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private String serviceName;

    @Column(nullable = false)
    private Integer estimatedDurationMinutes;

    private LocalDateTime estimatedStartTime;

    private LocalDateTime actualStartTime;

    private LocalDateTime completedTime;

    @Column(nullable = false)
    private Integer chairNumber = 1;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum QueueType {
        ONLINE_BOOKING,
        WALK_IN
    }

    public enum QueueStatus {
        WAITING,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        NO_SHOW
    }
}