package com.salonqueue;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class SalonQueueApplication {

    /**
     * Every LocalDateTime.now() call in this codebase (bookings, queue
     * entries, timers, schedulers) is timezone-naive — it just captures
     * the JVM's current wall-clock time with no zone info attached. If the
     * server's underlying clock is UTC (the common default for cloud/
     * container environments) while every user is in India, that naive
     * timestamp gets serialized without a zone, and the browser (correctly,
     * per the JS Date spec) interprets a zone-less timestamp as already
     * being in the browser's local time — silently shifting every
     * displayed time by the UTC↔IST offset (5.5 hours). That's what was
     * showing up as bookings/queue times 5-6 hours off, and a freshly
     * started service immediately showing ~330 minutes elapsed.
     *
     * This app serves Indian salons exclusively, so pinning the JVM's
     * default timezone to Asia/Kolkata is the correct fix — it makes
     * LocalDateTime.now() actually return real IST wall-clock time, so
     * every naive timestamp is correct by construction. Runs in a static
     * initializer block (before Spring even starts wiring beans) so
     * nothing computes a timestamp before the zone is set.
     */
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
    }

    public static void main(String[] args) {
        SpringApplication.run(SalonQueueApplication.class, args);
    }
}
