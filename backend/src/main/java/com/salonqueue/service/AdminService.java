package com.salonqueue.service;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.salonqueue.entity.*;
import com.salonqueue.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final SalonRepository salonRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final PlatformConfigRepository platformConfigRepository;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    // ─────────────────────────────────────────────────────────────────────────
    // ANALYTICS SUMMARY
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getAnalyticsSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();

        // Salons
        long totalSalons    = salonRepository.count();
        long activeSalons   = salonRepository.countByActiveTrue();
        long pendingSalons  = salonRepository.countByVerifiedFalseAndActiveTrue();
        long verifiedSalons = salonRepository.countByVerifiedTrueAndActiveTrue();

        summary.put("totalSalons",    totalSalons);
        summary.put("activeSalons",   activeSalons);
        summary.put("pendingSalons",  pendingSalons);
        summary.put("verifiedSalons", verifiedSalons);

        // Users
        long totalUsers     = userRepository.count();
        long totalCustomers = userRepository.countByRole(User.Role.CUSTOMER);
        long totalOwners    = userRepository.countByRole(User.Role.SALON_OWNER);

        summary.put("totalUsers",     totalUsers);
        summary.put("totalCustomers", totalCustomers);
        summary.put("totalOwners",    totalOwners);

        // Bookings
        long totalBookings     = bookingRepository.count();
        long confirmedBookings = bookingRepository.countByStatus(Booking.BookingStatus.CONFIRMED);
        long cancelledBookings = bookingRepository.countByStatus(Booking.BookingStatus.CANCELLED);
        long todayBookings     = bookingRepository.countByScheduledTimeAfter(LocalDateTime.now().toLocalDate().atStartOfDay());

        summary.put("totalBookings",     totalBookings);
        summary.put("confirmedBookings", confirmedBookings);
        summary.put("cancelledBookings", cancelledBookings);
        summary.put("todayBookings",     todayBookings);

        // Revenue
        BigDecimal totalRevenue = paymentRepository.sumCapturedRevenue();
        long totalPayments      = paymentRepository.countByStatus(Payment.PaymentStatus.CAPTURED);
        long failedPayments     = paymentRepository.countByStatus(Payment.PaymentStatus.FAILED);

        summary.put("totalRevenuePaise", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);
        summary.put("totalPayments",     totalPayments);
        summary.put("failedPayments",    failedPayments);

        // Live queue
        long currentlyWaiting = queueEntryRepository.countByStatus(QueueEntry.QueueStatus.WAITING);
        long currentlyServing  = queueEntryRepository.countByStatus(QueueEntry.QueueStatus.IN_PROGRESS);

        summary.put("currentlyWaiting", currentlyWaiting);
        summary.put("currentlyServing", currentlyServing);

        return summary;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SALON MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllSalons(String status) {
        List<Salon> salons;
        if ("pending".equals(status)) {
            salons = salonRepository.findByVerifiedFalseAndActiveTrue();
        } else if ("active".equals(status)) {
            salons = salonRepository.findByVerifiedTrueAndActiveTrue();
        } else if ("inactive".equals(status)) {
            salons = salonRepository.findByActiveFalse();
        } else {
            salons = salonRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        return salons.stream().map(this::salonToMap).toList();
    }

    @Transactional
    public Map<String, Object> approveSalon(Long salonId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));
        salon.setVerified(true);
        salon.setActive(true);
        salonRepository.save(salon);
        log.info("Admin approved salon: {} ({})", salon.getName(), salonId);
        return salonToMap(salon);
    }

    @Transactional
    public Map<String, Object> rejectSalon(Long salonId, String reason) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));
        salon.setVerified(false);
        salon.setActive(false);
        salonRepository.save(salon);
        log.info("Admin rejected salon: {} ({}) — reason: {}", salon.getName(), salonId, reason);
        return salonToMap(salon);
    }

    @Transactional
    public Map<String, Object> toggleSalonActive(Long salonId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));
        salon.setActive(!salon.getActive());
        salonRepository.save(salon);
        log.info("Admin toggled salon {} active={}", salonId, salon.getActive());
        return salonToMap(salon);
    }

    @Transactional
    public Map<String, Object> updateSalonCoords(Long salonId, Double lat, Double lng) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));
        salon.setLatitude(lat);
        salon.setLongitude(lng);
        salonRepository.save(salon);
        log.info("Admin updated coords for salon {}: {},{}", salonId, lat, lng);
        return salonToMap(salon);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSalonDetail(Long salonId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new RuntimeException("Salon not found"));

        Map<String, Object> detail = salonToMap(salon);

        // Stats for this salon
        long bookings  = bookingRepository.countBySalonId(salonId);
        long confirmed = bookingRepository.countBySalonIdAndStatus(salonId, Booking.BookingStatus.CONFIRMED);
        long cancelled = bookingRepository.countBySalonIdAndStatus(salonId, Booking.BookingStatus.CANCELLED);
        BigDecimal revenue = paymentRepository.sumCapturedRevenueBySalonId(salonId);

        detail.put("totalBookings",  bookings);
        detail.put("confirmedBookings", confirmed);
        detail.put("cancelledBookings", cancelled);
        detail.put("totalRevenuePaise", revenue != null ? revenue : BigDecimal.ZERO);

        return detail;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllUsers(String role) {
        List<User> users;
        if (role != null && !role.isBlank()) {
            try {
                users = userRepository.findByRole(User.Role.valueOf(role.toUpperCase()));
            } catch (IllegalArgumentException e) {
                users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            }
        } else {
            users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }
        return users.stream().map(this::userToMap).toList();
    }

    @Transactional
    public Map<String, Object> toggleUserActive(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() == User.Role.ADMIN) {
            throw new RuntimeException("Cannot deactivate admin accounts");
        }
        user.setActive(!user.getActive());
        userRepository.save(user);
        log.info("Admin toggled user {} active={}", userId, user.getActive());
        return userToMap(user);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BOOKING MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllBookings(String status, Long salonId) {
        List<Booking> bookings;
        if (status != null && salonId != null) {
            bookings = bookingRepository.findBySalonIdAndStatus(
                    salonId, Booking.BookingStatus.valueOf(status.toUpperCase()));
        } else if (status != null) {
            bookings = bookingRepository.findByStatus(Booking.BookingStatus.valueOf(status.toUpperCase()));
        } else if (salonId != null) {
            bookings = bookingRepository.findBySalonIdOrderByScheduledTimeDesc(salonId);
        } else {
            bookings = bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "scheduledTime"));
        }
        return bookings.stream().map(this::bookingToMap).toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT MANAGEMENT + REFUNDS
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllPayments(String status) {
        List<Payment> payments;
        if (status != null && !status.isBlank()) {
            try {
                payments = paymentRepository.findByStatus(Payment.PaymentStatus.valueOf(status.toUpperCase()));
            } catch (IllegalArgumentException e) {
                payments = paymentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            }
        } else {
            payments = paymentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }
        return payments.stream().map(this::paymentToMap).toList();
    }

    @Transactional
    public Map<String, Object> initiateRefund(Long paymentId, String reason) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (payment.getStatus() != Payment.PaymentStatus.CAPTURED) {
            throw new RuntimeException("Only captured payments can be refunded. Current status: " + payment.getStatus());
        }

        if (payment.getRazorpayPaymentId() == null) {
            throw new RuntimeException("No Razorpay payment ID found — cannot refund");
        }

        try {
            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            log.info("Initiating refund for razorpayPaymentId={} amount={} paise",
                    payment.getRazorpayPaymentId(), payment.getAmountPaise());

            // Minimal refund request — Razorpay test mode is strict
            // amount in paise is the only required field for a full refund
            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", payment.getAmountPaise());

            com.razorpay.Refund refund = razorpay.payments.refund(payment.getRazorpayPaymentId(), refundRequest);
            String refundId = refund.get("id");

            payment.setStatus(Payment.PaymentStatus.REFUNDED);
            payment.setRefundId(refundId);
            payment.setRefundedAt(LocalDateTime.now());
            paymentRepository.save(payment);

            // Also update the booking status
            Booking booking = payment.getBooking();
            booking.setStatus(Booking.BookingStatus.CANCELLED);
            bookingRepository.save(booking);

            log.info("Admin refund initiated: paymentId={} razorpayRefundId={}", paymentId, refundId);
            return paymentToMap(payment);

        } catch (RazorpayException e) {
            log.error("Razorpay refund failed for payment {}: {}", paymentId, e.getMessage());
            throw new RuntimeException("Refund failed: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIVE QUEUE MONITOR
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getLiveQueues() {
        // Get all active salons with at least one waiting/in-service entry
        List<Salon> activeSalons = salonRepository.findByVerifiedTrueAndActiveTrue();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Salon salon : activeSalons) {
            List<QueueEntry> entries = queueEntryRepository
                    .findBySalonIdAndStatusInOrderByPositionAsc(
                            salon.getId(),
                            List.of(QueueEntry.QueueStatus.WAITING, QueueEntry.QueueStatus.IN_PROGRESS)
                    );
            if (entries.isEmpty()) continue;

            Map<String, Object> salonQueue = new LinkedHashMap<>();
            salonQueue.put("salonId",   salon.getId());
            salonQueue.put("salonName", salon.getName());
            salonQueue.put("city",      salon.getCity());
            salonQueue.put("waiting",   entries.stream().filter(e -> e.getStatus() == QueueEntry.QueueStatus.WAITING).count());
            salonQueue.put("inProgress", entries.stream().filter(e -> e.getStatus() == QueueEntry.QueueStatus.IN_PROGRESS).count());
            salonQueue.put("total",     entries.size());

            // Long wait check: calculate actual expected wait for each person
            // at position 2+. Uses actualStartTime of IN_PROGRESS entry for
            // accurate remaining time even when service runs over.
            // Skips position 1 — covered by the no-show scheduler (15 min).
            QueueEntry inProgressEntry = entries.stream()
                    .filter(e -> e.getStatus() == QueueEntry.QueueStatus.IN_PROGRESS)
                    .findFirst().orElse(null);

            // Time the waiting person has already been waiting due to IN_PROGRESS overrun.
            // If service is on time:  waitAlreadyAccumulated = remaining minutes left
            // If service is overdue:  waitAlreadyAccumulated = how many minutes it has run over
            // Both cases reflect the true wait the next person is experiencing.
            long waitAlreadyAccumulated = 0;
            if (inProgressEntry != null) {
                long elapsedMinutes = 0;
                LocalDateTime startTime = inProgressEntry.getActualStartTime() != null
                        ? inProgressEntry.getActualStartTime()
                        : inProgressEntry.getCreatedAt();
                if (startTime != null) {
                    elapsedMinutes = java.time.Duration.between(startTime, LocalDateTime.now()).toMinutes();
                }
                long estimated = inProgressEntry.getEstimatedDurationMinutes() != null
                        ? inProgressEntry.getEstimatedDurationMinutes() : 0;
                long diff = elapsedMinutes - estimated;
                if (diff >= 0) {
                    // Service is overdue — waiting person has already waited this many extra minutes
                    waitAlreadyAccumulated = diff;
                } else {
                    // Service still running — remaining time is what waiting person still has to wait
                    waitAlreadyAccumulated = estimated - elapsedMinutes;
                }
            }

            // Walk through WAITING entries at position 2+ and accumulate wait time
            List<QueueEntry> waitingList = entries.stream()
                    .filter(e -> e.getStatus() == QueueEntry.QueueStatus.WAITING)
                    .sorted(java.util.Comparator.comparingInt(e -> e.getPosition() != null ? e.getPosition() : 999))
                    .toList();

            boolean hasLongWait = false;
            long cumulativeWait = waitAlreadyAccumulated;
            for (QueueEntry waiting : waitingList) {
                if (cumulativeWait >= 5) {
                    hasLongWait = true;
                    break;
                }
                cumulativeWait += waiting.getEstimatedDurationMinutes() != null
                        ? waiting.getEstimatedDurationMinutes() : 0;
            }
            salonQueue.put("hasLongWait", hasLongWait);

            result.add(salonQueue);
        }

        // Sort by total desc so busiest salons appear first
        result.sort((a, b) -> ((int) b.get("total")) - ((int) a.get("total")));
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PLATFORM CONFIG
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getConfig() {
        return platformConfigRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key",         c.getConfigKey());
            m.put("value",       c.getConfigValue());
            m.put("description", c.getDescription());
            m.put("updatedAt",   c.getUpdatedAt());
            return m;
        }).toList();
    }

    @Transactional
    public Map<String, Object> updateConfig(String key, String value) {
        PlatformConfig config = platformConfigRepository.findByConfigKey(key)
                .orElseThrow(() -> new RuntimeException("Config key not found: " + key));
        config.setConfigValue(value);
        platformConfigRepository.save(config);
        log.info("Admin updated config: {}={}", key, value);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key",   config.getConfigKey());
        m.put("value", config.getConfigValue());
        return m;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SALON REGISTRATION (admin registers salons on behalf of owners)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> registerSalon(Map<String, Object> request) {
        // Find or create the salon owner user
        String ownerEmail = (String) request.get("ownerEmail");
        String ownerPhone = (String) request.get("ownerPhone");
        String ownerName  = (String) request.get("ownerName");

        User owner = userRepository.findByEmail(ownerEmail)
                .orElseGet(() -> {
                    // Create a default account for the salon owner
                    User newOwner = User.builder()
                            .name(ownerName)
                            .email(ownerEmail)
                            .phone(ownerPhone)
                            .password("$2a$10$defaultHashedPasswordChangeOnFirstLogin") // placeholder
                            .role(User.Role.SALON_OWNER)
                            .active(true)
                            .build();
                    return userRepository.save(newOwner);
                });

        Salon salon = Salon.builder()
                .name((String) request.get("name"))
                .description((String) request.get("description"))
                .address((String) request.get("address"))
                .city((String) request.get("city"))
                .phone((String) request.get("phone"))
                .latitude(request.get("latitude") != null ? Double.parseDouble(request.get("latitude").toString()) : null)
                .longitude(request.get("longitude") != null ? Double.parseDouble(request.get("longitude").toString()) : null)
                .owner(owner)
                .verified(true)   // admin registers = auto-verified
                .active(true)
                .build();

        salonRepository.save(salon);
        log.info("Admin registered new salon: {} for owner: {}", salon.getName(), ownerEmail);
        return salonToMap(salon);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAPPERS
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Object> salonToMap(Salon salon) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          salon.getId());
        m.put("name",        salon.getName());
        m.put("description", salon.getDescription());
        m.put("address",     salon.getAddress());
        m.put("city",        salon.getCity());
        m.put("phone",       salon.getPhone());
        m.put("latitude",    salon.getLatitude());
        m.put("longitude",   salon.getLongitude());
        m.put("verified",    salon.getVerified());
        m.put("active",      salon.getActive());
        m.put("createdAt",   salon.getCreatedAt());
        if (salon.getOwner() != null) {
            m.put("ownerName",  salon.getOwner().getName());
            m.put("ownerEmail", salon.getOwner().getEmail());
            m.put("ownerPhone", salon.getOwner().getPhone());
            m.put("ownerId",    salon.getOwner().getId());
        }
        return m;
    }

    private Map<String, Object> userToMap(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",        user.getId());
        m.put("name",      user.getName());
        m.put("email",     user.getEmail());
        m.put("phone",     user.getPhone());
        m.put("role",      user.getRole().name());
        m.put("active",    user.getActive());
        m.put("createdAt", user.getCreatedAt());
        return m;
    }

    private Map<String, Object> bookingToMap(Booking booking) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                 booking.getId());
        m.put("bookingCode",        booking.getBookingCode());
        m.put("status",             booking.getStatus().name());
        m.put("amount",             booking.getAmount());
        m.put("scheduledTime",      booking.getScheduledTime());
        m.put("paymentCompleted",   booking.getPaymentCompleted());
        m.put("cancellationReason", booking.getCancellationReason());
        m.put("cancelledAt",        booking.getCancelledAt());
        m.put("cancelledBy",        booking.getCancelledBy());
        if (booking.getCustomer() != null) {
            m.put("customerName",  booking.getCustomer().getName());
            m.put("customerPhone", booking.getCustomer().getPhone());
            m.put("customerId",    booking.getCustomer().getId());
        }
        if (booking.getSalon() != null) {
            m.put("salonName", booking.getSalon().getName());
            m.put("salonId",   booking.getSalon().getId());
        }
        if (!booking.getServiceItems().isEmpty()) {
            m.put("serviceName", booking.getCombinedServiceName());
        }
        return m;
    }

    private Map<String, Object> paymentToMap(Payment payment) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                 payment.getId());
        m.put("razorpayOrderId",    payment.getRazorpayOrderId());
        m.put("razorpayPaymentId",  payment.getRazorpayPaymentId());
        m.put("amountPaise",        payment.getAmountPaise());
        m.put("currency",           payment.getCurrency());
        m.put("status",             payment.getStatus().name());
        m.put("receipt",            payment.getReceipt());
        m.put("capturedAt",         payment.getCapturedAt());
        m.put("refundId",           payment.getRefundId());
        m.put("refundedAt",         payment.getRefundedAt());
        m.put("createdAt",          payment.getCreatedAt());
        if (payment.getBooking() != null) {
            m.put("bookingCode", payment.getBooking().getBookingCode());
            m.put("bookingId",   payment.getBooking().getId());
            if (payment.getBooking().getCustomer() != null) {
                m.put("customerName",  payment.getBooking().getCustomer().getName());
                m.put("customerPhone", payment.getBooking().getCustomer().getPhone());
            }
            if (payment.getBooking().getSalon() != null) {
                m.put("salonName", payment.getBooking().getSalon().getName());
                m.put("salonId",   payment.getBooking().getSalon().getId());
            }
        }
        return m;
    }
}