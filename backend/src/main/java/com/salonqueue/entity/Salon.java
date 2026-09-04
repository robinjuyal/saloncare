package com.salonqueue.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "salons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Salon {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private String address;
    
    @Column(nullable = false)
    private String city;
    
    @Column(nullable = false)
    private String state;
    
    @Column(nullable = false)
    private String pincode;
    
    private Double latitude;
    private Double longitude;
    
    @Column(nullable = false)
    private String phone;
    
    private String email;
    
    private String coverImage;
    
    @ElementCollection
    @CollectionTable(name = "salon_images", joinColumns = @JoinColumn(name = "salon_id"))
    @Column(name = "image_url")
    private Set<String> images = new HashSet<>();
    
    @Column(nullable = false)
    private LocalTime openingTime;
    
    @Column(nullable = false)
    private LocalTime closingTime;
    
    @ElementCollection
    @CollectionTable(name = "salon_working_days", joinColumns = @JoinColumn(name = "salon_id"))
    @Column(name = "day")
    private Set<String> workingDays = new HashSet<>();
    
    @Column(nullable = false)
    private Integer totalChairs = 1;
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @Column(nullable = false)
    private Boolean verified = false;
    
    @Column(precision = 3, scale = 2)
    private BigDecimal rating = BigDecimal.ZERO;
    
    @Column(nullable = false)
    private Integer totalReviews = 0;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
    
    @OneToMany(mappedBy = "salon", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Service> services = new HashSet<>();
    
    @OneToMany(mappedBy = "salon", cascade = CascadeType.ALL)
    private Set<Booking> bookings = new HashSet<>();
    
    @OneToMany(mappedBy = "salon", cascade = CascadeType.ALL)
    private Set<QueueEntry> queueEntries = new HashSet<>();
    
    @OneToMany(mappedBy = "salon", cascade = CascadeType.ALL)
    private Set<Review> reviews = new HashSet<>();
}
