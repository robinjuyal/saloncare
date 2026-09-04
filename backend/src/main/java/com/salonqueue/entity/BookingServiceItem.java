package com.salonqueue.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * One selected service within a booking. A Booking now has many of these
 * instead of a single direct Service reference — this is what lets a
 * customer combine services (Haircut + Beard + Color) into one booking
 * instead of the salon needing a separate priced "combo" entry for every
 * possible combination.
 *
 * Deliberately snapshots serviceName/price/durationMinutes at booking time
 * rather than always reading live off the Service row — so if a salon
 * later renames a service or changes its price, a customer's past booking
 * still shows exactly what they actually booked and paid for. `service`
 * itself is kept (nullable) mainly so a receipt/analytics view could still
 * link back to the current service if useful, but nothing should ever
 * trust it over the snapshotted fields for what was actually purchased.
 */
@Entity
@Table(name = "booking_service_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingServiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // Nullable on purpose — a service can be deleted (ServiceService marks
    // it inactive rather than hard-deleting, but keep this defensive) long
    // after a booking that included it is history. The snapshot fields
    // below are the actual source of truth for what was booked.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private com.salonqueue.entity.Service service;

    @Column(name = "service_name", nullable = false)
    private String serviceName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;
}
