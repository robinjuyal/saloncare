package com.salonqueue.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Service {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    
    @Column(nullable = false)
    private Integer durationMinutes;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceCategory category;
    
    private String imageUrl;
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    // Was: @OneToMany(mappedBy = "service") Set<Booking> bookings — pointed
    // at Booking.service, which no longer exists now that a booking can
    // have multiple services (see BookingServiceItem). Nothing in the
    // codebase actually called .getBookings() here, so removed rather than
    // redirected to map through BookingServiceItem instead.

    public enum ServiceCategory {
        HAIRCUT,
        BEARD,
        HAIR_AND_BEARD,
        HAIR_COLOR,
        FACIAL,
        MASSAGE,
        STYLING,
        OTHER
    }
}
