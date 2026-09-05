# SalonQueue — Queue Management Platform for Indian Salons

A full-stack SaaS platform that eliminates waiting room chaos at salons. Customers book online or walk in, track their real-time queue position from their phone, and get an estimated arrival time. Salon owners manage their live queue from a dashboard. Built for the Indian market — Razorpay payments, Hindi-friendly UX, designed for Dehradun and Delhi neighbourhoods.

---

## Table of Contents

0. [Version History](#version-history)
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Features](#6-features)
7. [API Reference](#7-api-reference)
8. [Real-Time System](#8-real-time-system)
9. [Payment Flow](#9-payment-flow)
10. [Queue Logic](#10-queue-logic)
11. [Security](#11-security)
12. [Admin Panel](#12-admin-panel)
13. [Environment Setup](#13-environment-setup)
14. [Running Locally](#14-running-locally)
15. [Deployment Guide](#15-deployment-guide)
16. [Known Limitations](#16-known-limitations)
17. [Roadmap](#17-roadmap)

---

## Version History

### v1.0 — Initial Build
The original working platform: JWT auth, salon search with Haversine distance, live queue via WebSocket/STOMP, Razorpay payments with dual webhook + frontend verification, admin panel for manual salon onboarding, review system. Assumed one chair per salon throughout — queue math, the barber dashboard, and the customer-facing wait estimate all treated "the queue" as a single serial line.

### v2.0 — Security Hardening, Payment Cleanup, and 2-Chair Support

**1. Security: secrets removed from the tracked `application.properties`**

*What happened:* The repo is public on GitHub, and `application.properties` — including the real DB password, JWT signing secret, and Razorpay key ID/secret — had been committed since the very first commit. This wasn't caught by a `.gitignore` because the file was never excluded.

*Why it mattered:* Anyone with the repo URL could read the JWT secret and forge a valid token for any role, including ADMIN, against a live deployment using that secret.

*What we did:* Every secret in `application.properties` now reads from an environment variable with an obviously-fake local-dev fallback (`spring.datasource.password=${DB_PASSWORD:changeme}`, etc.), matching the pattern this README's "Environment Setup" section already documented — the file just hadn't matched its own documentation.

*Correction, added later:* this section describes what was *planned and documented* — but as of this README's most recent review, `application.properties` as tracked in the repo **still has the real DB password, JWT secret, and Razorpay key ID/secret/webhook secret hardcoded**, unchanged from before this section was written. The env-var pattern described above was never actually applied to the committed file, or was reverted at some point. **This is not fixed. Treat this exactly as the "why it mattered" paragraph above describes — anyone with the repo URL can currently read the JWT secret and forge a valid token for any role — until the file is actually edited to use `${DB_PASSWORD}` etc. and those three credentials are rotated.** See Security → Production Checklist, which reflects this as still outstanding.

*What we didn't do, and why:* We did not rewrite git history to scrub the old secrets. Deleting a file going forward doesn't remove it from git history — anyone can still find the old values in old commits. Given this is a pre-launch project, rotating the actual credentials (new DB password, new JWT secret, new Razorpay keys, all generated *after* this fix) was judged simpler and more reliable than a history rewrite. **If you're reading this and haven't rotated those three credentials yet, do that before deploying anything.**

**2. Payment cleanup: abandoned checkouts were never resolved**

*What happened:* When a customer clicked Pay and then closed the Razorpay popup (or the payment failed with no webhook ever firing), the `Booking` stayed in `PENDING_PAYMENT` and the `Payment` stayed in `CREATED` — forever. The only mitigation was hiding `PENDING_PAYMENT` bookings older than 30 minutes from the customer's *My Bookings* screen — the row itself was untouched, just invisible.

*Why it mattered:* Rows piled up silently in the database with no true status, admin-side booking counts had no equivalent filter (so they could skew), and the customer got no real signal that their attempted booking had failed — it just vanished.

*What we did:* Added `PaymentCleanupScheduler` — the same `@Scheduled` pattern as the existing `NoShowScheduler`, running every 5 minutes by default (`payment.cleanup-interval-ms`), that finds `PENDING_PAYMENT` bookings older than 20 minutes (`payment.pending-timeout-minutes`) and explicitly marks them `CANCELLED` with `cancellationReason=PAYMENT_TIMEOUT` and `cancelledBy=SYSTEM`, and flips the linked `Payment` to `FAILED` if it's still `CREATED`. The old 30-minute hide-filter was removed — customers now see an honest "Cancelled — payment timed out, no amount was charged" state in My Bookings instead of the booking silently disappearing.

*Challenge worth noting:* Idempotency. A booking can be confirmed by either the webhook or the frontend verify call, and both can theoretically fire close together. The scheduler only touches bookings still in `PENDING_PAYMENT` — the moment either confirmation path succeeds, the booking moves to `CONFIRMED` and the scheduler's query no longer matches it, so there's no race between "payment just succeeded" and "scheduler expires it anyway."

**3. Two-chair queue support**

*Why 2, not "N chairs":* We talked through a fully general multi-chair architecture first (a `Chair`/`Staff` entity, stylist-specific sub-queues, per-chair WebSocket topics) and deliberately did not build it. The overwhelming majority of the salons in this app's actual target market (Dehradun, Delhi neighbourhoods) run one or two chairs. Building for arbitrary N chairs before a real salon needed it would have meant guessing at product decisions — particularly *"can a customer request a specific stylist, or is any free chair fine?"* — that only get answered by a real 3+ chair salon owner. Capping at 2 let us solve the genuinely hard part (correct parallel wait-time math, a barber-facing UI two people can share on one screen) without also solving a problem we didn't have real data for yet.

*The math:* Wait time is computed by simulating one "frees up in N minutes" clock per active chair, seeded from whoever's currently `IN_PROGRESS` on that chair (0 if free). Each waiting customer, in order, is assigned to whichever chair's clock is smallest, and that clock is advanced by their service duration. This is intentionally *not* hardcoded to "chair 1 vs chair 2" — it operates on an `int[]` of length `totalChairs`, so the same code already handles 1 chair (collapses to the original single-line sum) and would extend to more chairs by changing one constant, if that's ever revisited (see "Known Limitations" below).

*Chair assignment on Start:* The backend hands a customer the lowest-numbered chair that isn't currently occupied — the frontend never has to pick a chair, it just calls `/queue/{id}/start` and the assignment happens server-side. This also meant the barber dashboard's "Start Service" button had to change from "only the front of the line" to "the front N customers, where N = currently free chairs" — with 2 free chairs, both the 1st and 2nd waiting customer can be started at once.

*Owner control:* Chair count is a live, owner-editable field (`PATCH /api/salons/{id}/chairs`, capped at 1–2) rather than a fixed setup-time value, because the actual use case discussed was "one barber's partner didn't come in today" — the owner needs to be able to drop from 2 chairs to 1 mid-morning. Dropping the count doesn't interrupt whoever's already mid-service on the now-inactive chair; it just stops offering that chair to new customers.

*Shared-device decision:* Both chairs are designed to be managed from one shared tablet/screen at the counter (not two separate barber logins), because that's how the actual target salons operate. This turned out to simplify the build, not complicate it — no cross-device WebSocket sync problem to solve, since there's only ever one connection. The design cost was making sure two people reaching for the same screen can't easily hit the wrong button: each chair gets its own clearly labeled card ("CHAIR 1" / "CHAIR 2") with its own independent timer and its own "Finish" button.

*Customer-side wait transparency:* Researched wait psychology (Maister's "Psychology of Waiting Lines") before touching the customer UI. The relevant findings: unoccupied time feels longer than occupied, uncertain waits feel longer than known/finite ones, and unexplained waits feel longer than explained ones. In response, the customer's estimated-arrival card now shows their exact position in line and a one-line explanation of chair status ("1 of 2 chairs free — you may start sooner than the estimate" / "both chairs busy — this updates live"), on top of the concrete arrival time that was already there. This was a deliberately small change — the goal stated at the start of this feature was that the customer experience should not get *more* complicated for a 2-chair salon, and it doesn't: a single-chair salon's customer view is untouched.

**4. What we scoped but explicitly did not build**

- **WhatsApp turn notifications.** Discussed API options (Meta Cloud API direct vs. a BSP like AiSensy/Gupshup/Wati/Twilio), rough per-message cost in India (~₹0.13–0.15/message for the "utility" template category that applies here, meaning single-digit-thousands of rupees per month at this app's current scale), and exactly where it would hook into `QueueService` (inside `updateQueuePositions()`, async, gated by a new `notificationStage` field on `QueueEntry` to avoid duplicate sends). Held off building it because it wasn't the request at the time — the integration plan above is ready to pick up when it is.
- **4-chair support.** The wait-time math already generalizes (see above), but going past 2 chairs raises two product questions that don't have answers yet: whether a shared single device still makes sense at 4 chairs (screen real estate, mis-tap risk) and whether customers should be able to request a specific stylist rather than "any free chair." Revisit this once an actual 3-4 chair salon is asking for it, not before.

### v3.0 — Design System Overhaul, Critical Bug Fixes, Security & Concurrency Audit

This version covers a long, iterative session — visual design went through two complete passes (not one), several bugs traced back to root causes rather than patched at the symptom, and a full authorization/concurrency audit that found real, previously-unknown holes. Documented thematically below rather than strictly chronologically, since that's more useful for understanding *where things ended up* than reconstructing the exact order.

**1. Customer-side visual identity — two full passes**

*Pass 1 — "salon ticket" theme.* The entire customer-facing UI (`CustomerHome`, `SalonDetails`, `MyBookings`, `Login`, `Signup`, `Navbar`) was redesigned away from generic blue/purple SaaS gradients toward something grounded in what this app actually replaces: the paper queue token every Indian salon already hands out at the counter. Palette: deep espresso-charcoal `ink` (`#221C1D`), warm blush-white `paper` (`#FBF4F0`), vivid berry `rose` (`#E8425F`) as the primary accent, brass-gold `brass` (`#B9973F`) for ratings/premium touches, sage `sage` (`#4B6355`) for "available now" states. Typography: `Fraunces` (display serif) for salon names/headlines, `Plus Jakarta Sans` for body/UI text, `IBM Plex Mono` for booking codes, prices, and timestamps. The signature element — reused throughout — is a literal ticket-stub motif: a dashed "tear line" with small inset dots at each end (`.ticket-notch` in `index.css`), used on the booking-confirmation screen and the booking-summary card.

Also in this pass: the service picker was redesigned from a long vertical list (unworkable past ~10 services) into a horizontal category-icon picker (using the `Service.category` enum, which existed on the backend but the UI never surfaced) plus a 2-row horizontal-scrolling snap-carousel of compact service cards. And the shared `Navbar` got a mobile-specific compact layout — icon-only nav links, avatar-initial instead of full name on narrow screens, an arm-then-confirm logout button so a mis-tap on a cramped mobile bar can't log someone out by accident.

*Pass 2 — full glassmorphism pivot.* Later in the same session, the customer side was redesigned a second time, this time to glassmorphism specifically — frosted-glass panels (`backdrop-filter: blur()`) over a dark, colorful ambient background. This is a genuinely different visual language from Pass 1, not an incremental tweak, and it replaced Pass 1's approach rather than layering on top of it. Key insight applied here: glass only reads as "glass" against a busy backdrop — a flat background makes a blurred panel look merely washed-out, not glassy — so every customer page now sits on `.ambient-bg` (soft rose/brass/sage radial gradients over near-black `#1A1517`, defined in `index.css`) instead of the flat `paper` background from Pass 1. Three reusable glass utility classes were added: `.glass` (standard panels, `blur(20px)`), `.glass-strong` (content-dense areas needing more legibility — service cards, form inputs, `blur(24px)` at higher opacity), and `.glass-active` (selected states, tinted rose instead of white). Primary buttons (Pay, Login, Search) were deliberately kept **solid** rose, not glass — glass buttons look striking but hurt tap confidence, so anything a person needs to trust and press stays unambiguous. A `sage-bright` color token (`#8FBFA3`) was added because the original `sage` was tuned for dark-text-on-light-paper and reads as low-contrast text on the new dark background.

**Important for future work on this app:** `BarberDashboard.jsx` and `ChairCard.jsx` (the barber/owner-facing side) were deliberately **not** migrated to glassmorphism and still use the Pass-1 light "paper ticket" theme (`bg-paper`, `bg-paper-card`, `text-ink`). This is intentional, not an oversight — that screen is a practical work tool used on a tablet at a busy counter, and the customer-facing redesign requests were always scoped to the "user side." If asked to redesign the barber dashboard, ask whether it should move to glassmorphism too or stay on the paper-ticket theme, since the two themes currently coexist by design (the shared `Navbar` was deliberately made dark-glass in both contexts specifically so it doesn't visually clash with either page type sitting underneath it).

**2. Critical bug fixes — each traced to a specific root cause, not patched at the symptom**

- **Booking summary / My Bookings always showed 0 min wait.** Root cause: `BookingResponse` had `estimatedStartTime` and `queuePosition` fields defined in the DTO, but nothing in `BookingService.mapToResponse()` ever actually populated them — always `null`. The frontend was silently falling back to re-deriving wait time from a separately-fetched queue snapshot, which had its own bugs. Fixed by looking up the linked `QueueEntry` (via `QueueEntryRepository.findByBookingId`) and wiring those two fields through properly, then simplifying `MyBookings.jsx` and the `SalonDetails` booking ticket to read the now-correct backend value directly instead of re-simulating it client-side.
- **Times off by ~5.5 hours (IST/UTC offset) across MyBookings, the barber dashboard, and a "330 minutes elapsed" bug on freshly-started services.** All three were the same root cause: the server's JVM was running in UTC, `LocalDateTime.now()` has no timezone tag attached when serialized, and a browser in IST parses a zone-less timestamp as if it were already local time — shifting every displayed time by exactly the UTC↔IST offset (330 minutes). Fixed by pinning the JVM's default timezone to `Asia/Kolkata` in a static initializer in `SalonQueueApplication.java`, plus matching `spring.jackson.time-zone` and `spring.jpa.properties.hibernate.jdbc.time_zone` in `application.properties`. This is a deliberate single-timezone assumption appropriate for an India-only app — if this ever expands outside India, this becomes a real limitation to revisit.
- **"Loading failed" / forced manual logout after a JWT expired, instead of a clean redirect to login.** The global 401 interceptor in `api.js` was already correctly clearing storage and redirecting — but `DashboardWrapper.jsx` and `AdminDashboard.jsx` each had their own local `.catch()` that could render a conflicting "Failed to load" error screen in the brief window before the redirect completed, occasionally winning that race. Fixed by having those two components recognize a 401 specifically and stay on the loading spinner rather than fighting the redirect, and hardened the interceptor itself (a module-level guard against multiple simultaneous 401s all trying to act at once, `window.location.replace()` instead of `href` so it doesn't leave a broken page in browser history). Also extended `jwt.expiration` from 24 hours to 30 days as part of the same fix — 24h was genuinely too short for a consumer app people don't open daily, and was the direct cause of this surfacing at all. 30 days was chosen deliberately over "2-3 months" as a middle ground: this app has no token revocation mechanism at all, so a longer expiry directly extends how long a leaked token stays valid with nothing anyone can do about it.

**3. Security & concurrency audit — a deliberate pass looking for exactly this class of issue, not incidental fixes**

Prompted by a question about whether an online booking and a barber-added walk-in could ever collide. The first fix (below) led to auditing the same *class* of bug everywhere else it could hide, which surfaced real authorization gaps too. All of the following were found by careful code tracing, not a live concurrency test — this sandbox can't run the full stack with a live database and concurrent traffic, so these are worth exercising for real once deployed, not just trusted because the reasoning holds up on paper.

*Race conditions (read-then-write without locking):*
- **Queue position assignment** — a walk-in being added and an online booking's payment confirming for the same salon at the same instant could both read the same "current max position" and insert with the same number. Fixed with a pessimistic lock on the salon row (`SalonRepository.findByIdForUpdate`) before either code path reads the max.
- **Chair assignment on Start Service** — same pattern, worse consequence: two overlapping "Start" calls could both see the same chair as free and assign two different customers to it; since the dashboard renders one card per chair, the second customer would become invisible in the UI while still marked in-progress (and charged, if paid online). Fixed with the same salon-row lock.
- **Payment confirmation** — the webhook and the frontend's own verify call are *designed* to potentially both fire for the same payment (that's the reason both paths exist), and the code already had an idempotency check (`if status == CAPTURED, return`) — but check-then-act isn't safe under true concurrency without a lock in between. Fixed with a pessimistic lock on the payment row (`PaymentRepository.findByRazorpayOrderIdForUpdate`) before the status check.
- **Missing state-machine guards** — neither `startService` nor `completeService` verified the entry was actually in the right state first, so a double-click (or a retried request) could re-run chair assignment on an already-in-progress entry. Added explicit status checks to both, plus a lighter terminal-state guard on `removeFromQueue`.

*Authorization holes (missing ownership checks — these were genuine security gaps, not edge cases):*
- **`/api/queue/**` mutation endpoints** (start, complete, remove, cancel-booking, add walk-in) had no ownership check at all — any authenticated user, not just that salon's owner, could start/complete/remove entries or add walk-ins for *any* salon by guessing IDs. Fixed by adding `verifySalonOwnership()` checks against `salon.getOwner().getId()`, mirroring a pattern (`getOwnedSalon()`) that already existed correctly in `SalonOwnerService` — it just hadn't been applied here.
- **`/api/services/**` create/update/delete** had the identical gap — any logged-in user could edit or delete another salon's services, including changing prices. Same fix pattern applied.
- **`POST /api/salons` (createSalon) didn't check the caller's role.** Any authenticated `CUSTOMER` account could call this and become a salon's owner — which directly undermined the earlier fix (see v2.0-era work) that removed self-service `SALON_OWNER` signup specifically to keep salon onboarding admin-controlled. That earlier fix meant nothing if this endpoint could still hand out ownership to anyone who asked. Fixed by requiring `owner.getRole() == SALON_OWNER`.
- **Payment status lookup had no ownership check** — lower severity than the above (Razorpay order IDs are opaque generated strings, not easily guessable sequential IDs like the others), but closed anyway for consistency.

Read-only endpoints (`GET` queue, wait-time, services) were deliberately left open to any authenticated user — that data (live queue, wait estimates, service list) is meant to be publicly visible to customers browsing a salon, not owner-restricted. Reviews, admin routes (`/api/admin/**`, already gated by `hasRole('ADMIN')` at the routing level), and booking creation/lookup were checked and found to already be correctly scoped — not everything was broken.

**4. Auth changes**

- **Salon-owner self-signup fully closed, backend included.** The Signup page's role picker (Customer vs. Salon Owner) was removed from the UI — but critically, `SignupRequest.role` was also removed from the backend request DTO entirely, and `AuthService.signup()` now hardcodes `User.Role.CUSTOMER` server-side. Removing only the frontend button would not have closed anything: the public signup API would have still accepted a client-supplied `role: "SALON_OWNER"` directly. Salon owner accounts are created exclusively via `AdminService.registerSalon()`, matching how the admin-onboarding workflow was always documented to work.

**5. Deployment — moved to a real VM**

Migrating off `localhost` surfaced that CORS/WebSocket origins were hardcoded in **three separate places**, all ignoring environment-variable properties that already existed for this exact purpose and had never actually worked: `SecurityConfig`'s global CORS bean (hardcoded directly in Java, so `cors.allowed-origins`/`ALLOWED_ORIGINS` never did anything), a redundant `@CrossOrigin` annotation on every one of the 9 controllers (which in Spring overrides global CORS config for that controller regardless of what the global bean says), and `WebSocketConfig`'s STOMP endpoint (a third, separate hardcoded origin list — this one specifically would have silently broken all live queue updates even if the REST API worked). All three now correctly read from `ALLOWED_ORIGINS`. `frontend/.env.production` was added, pointing `VITE_API_BASE_URL`/`VITE_WS_URL` at the deployed backend — local dev via `npm run dev` is unaffected and still falls back to `localhost:8080`.

**6. Small features**

- **Phone number added to the barber's queue view** — pulled from the linked booking's customer (`QueueEntryResponse.customerPhone`), shown as plain text rather than a `tel:` link, since the barber dashboard runs on a tablet without calling capability.

---

### v3.1 — Multi-Service Booking

Multi-service booking is fully built. Here's what's in it:

Backend — the real data model change

New BookingServiceItem join entity: a Booking now has many of these instead of one direct Service link. Each item snapshots its own name/price/duration at booking time, so if you later rename or reprice a service, a customer's past booking still shows exactly what they actually paid for.
PaymentService.createPaymentOrder() now takes a list of service IDs, validates every one of them actually belongs to the salon being booked (closes a real gap — without this check, a crafted request could mix services from two different salons into one booking), sums the price and duration, and creates one BookingServiceItem per selection.
The queue engine needed zero logic changes — it already just consumes one combined duration number per entry, exactly as I flagged when we first discussed this. I added Booking.getCombinedServiceName() / getTotalDurationMinutes() helpers so that joining/summing logic lives in one place instead of being copy-pasted across three services.
Found and removed something along the way: a completely dead POST /api/bookings endpoint that created a CONFIRMED booking with no payment involved at all. Never called by the frontend, so not currently exploitable, but extending it for multi-service would've meant preserving a real payment-bypass path for no reason — removed instead.

Frontend

Service cards are now toggle-select (glass-active highlight) instead of single-select.
A small persistent strip appears once 2+ services are selected — "3 services selected · ₹550 · 75 min" — right under the picker, so there's constant feedback without scrolling down.
Booking summary: now itemizes every selected service on its own line with its own price, then a bold Total Duration / Total Price beneath — exactly as we discussed, nothing hidden at the moment someone's about to pay.
My Bookings: needed zero frontend changes — since the backend now sends an already-joined string ("Men's Haircut + Men's Beard") into the same serviceName field the UI already displays with truncate, it just works.

Given the size of this change (new entity, removed a live endpoint, rewired the entire selection state), this is the one I'd most want you to actually click through end-to-end before trusting — select 2-3 services, confirm the summary and total look right, complete a real test payment, and check both the success ticket and My Bookings show the combined name correctly.

### v4.0 — No-Show Logic Correctness, Multi-Chair Blind Spot, Payment/Cleanup Race Hardening

A month of manual scenario testing (every combination of walk-ins, online bookings, and cancellations the owner could think up) surfaced two real no-show bugs and one payment-timing bug. All three were logic errors that only show up under specific timing/ordering conditions — exactly the kind of thing that survives casual testing and then bites on real traffic.

**1. No-show timer was measured from the wrong clock — twice.**

*First (still-wrong) version:* the original scheduler checked `createdAt` (when the customer joined the queue) against a 15-minute cutoff. This punished anyone who had to wait behind other customers — their no-show clock was effectively running the whole time they were waiting in line, not just once they reached the front. If several people joined the queue close together, they could all become "already overdue" by the 15-minute mark, cascading into rapid-fire no-shows the instant each one reached position 1, regardless of how long they'd actually been at the front.

*Second (also wrong) version:* fixed by tracking `becameFirstAt` — a timestamp set the moment an entry reached position 1 — and checking *that* against the 15-minute cutoff instead. This fixed the cascade, but broke online bookings: a customer who books a 10:00 AM slot, then finds the queue clears out early and they reach position 1 at 9:15, would get their no-show clock start ticking from 9:15 — meaning they could be cancelled by 9:30, 30 minutes before they were ever told to arrive. Internal queue bookkeeping (when a bookkeeping event happens) and the actual promise made to the customer (when we told them to show up) aren't the same thing.

*Actual fix:* the no-show check now compares against `estimatedStartTime` — the arrival/start time actually shown to the customer, computed once when they join the queue — and that field is now frozen once set. `updateQueuePositions()` no longer recalculates it every time the queue reshuffles (previously, it silently overwrote an online booking's promised slot with "right now" the instant a chair opened up early, which is what caused the second bug above). A customer's promised time only ever comes from what they were actually told, and the 15-minute grace period is measured from there, full stop — regardless of when they became first, regardless of how the queue moved around them.

*Trade-off knowingly accepted:* this means the *displayed* wait estimate for customers not yet at the front no longer gets more optimistic if people ahead of them finish early or get cancelled — it's frozen from the moment they joined, same as the no-show promise. Correct for fairness, less real-time for display. If dynamic ETA updates are wanted back, that needs two separate fields (a freely-recalculating display estimate, and a frozen promise the no-show check uses) — not built, since nobody's asked for it yet.

**2. No-show scheduler had a multi-chair blind spot.**

Two compounding issues, both from a query written assuming a single chair:
- It only ever checked the entry at **position 1**. With 2 chairs, position 2 can have its own free chair waiting for them at the same time (this app already lets the barber start service out of order — see `startService`), but the scheduler would never even look at position 2 until position 1 was resolved first, no matter how overdue position 2 already was.
- It excluded the **entire salon** from checking if *any* entry was `IN_PROGRESS` — even if only one of two chairs was occupied and the other sat free with someone overdue on it.

*Fix:* `QueueService.findOverdueWaitingEntries()` now computes, per salon, how many chairs are actually free right now (`totalChairs − count(IN_PROGRESS)`), and checks every waiting entry whose position falls within that count — independently, against its own `estimatedStartTime`. Generalizes correctly to any number of chairs and subsumes both old checks.

**3. Payment cleanup could race a late-arriving webhook.**

`PaymentCleanupScheduler` cancels bookings stuck in `PENDING_PAYMENT` for 20+ minutes. If Razorpay's webhook is delayed past that window (webhook retry delay, an outage on our endpoint — realistic conditions for a payment gateway), the cleanup job could cancel the booking and mark the payment `FAILED` moments before the real confirmation arrived. `confirmPayment()`'s idempotency check (`if status == CAPTURED, skip`) doesn't catch this, since cleanup had already moved the status to `FAILED`, not left it at `CAPTURED` — so the late webhook would blindly overwrite everything back to `CONFIRMED` and silently drop the customer into the live queue, despite them already having been told the booking was cancelled. A closely related lost-update variant existed too: without any lock, cleanup could read a stale `CREATED` status, block on `confirmPayment()`'s lock mid-write, then overwrite a payment that had *just* been successfully captured.

*Fix:* `PaymentRepository.findByBookingIdForUpdate()` — the same pessimistic-lock pattern already used for `findByRazorpayOrderIdForUpdate` — is now taken by the cleanup job before it touches a candidate booking's payment, so a webhook/frontend confirmation landing at the same moment can never interleave with it; whichever side gets the lock first, the other sees its committed result instead of stale data. As a second, independent safety net, `confirmPayment()` now checks whether the booking is already `CANCELLED` before re-confirming it — if so, it still records the payment as `CAPTURED` (the money genuinely moved; that must never be lost) but does **not** resurrect the booking into the queue, and logs a loud `PAYMENT CAPTURED FOR ALREADY-CANCELLED BOOKING` error for manual reconciliation (refund or manual re-booking) instead.

**4. Small hardening: constant-time signature comparison.**

Both `verifyWebhookSignature` and `verifyPaymentSignature` compared HMAC signatures with plain `String.equals()`, which short-circuits on the first mismatched byte — a timing side-channel that, in principle, lets an attacker recover a valid signature one byte at a time by measuring response times. Switched both to `MessageDigest.isEqual()`, which always compares every byte regardless of where the first mismatch is. Cheap fix, and these two checks are what stand between an unauthenticated endpoint and a forged "payment succeeded" signal, so it was worth doing properly..

---





### The Problem
Indian salons have no queue system. Customers walk in, sit and wait indefinitely with no idea how long they'll be there. If the salon is busy, they leave. The salon loses revenue. Customers waste time.

### The Solution
SalonQueue gives every salon a live queue that customers can join from their phone via a QR code at the counter. They see exactly how many people are ahead of them and what time to arrive. The salon owner sees the same queue on their dashboard and manages it with one tap per customer.

### Business Model
- Phase 1 (current): Free for salons — build adoption
- Phase 2: ₹499/month per salon subscription
- Phase 3: Commission on online bookings (2-3%)

### Target Market
- Phase 1: Dehradun (home market, less competition, easier onboarding)
- Phase 2: Tight Delhi neighbourhoods (Satya Niketan, Malviya Nagar)
- Milestone: 15 active salons + 50 real customer bookings before quitting day job

### Acquisition Strategy
Admin (founder) goes door-to-door to salons, registers them directly in the admin panel, prints a QR standee for the counter. No self-signup for salons — quality controlled by founder.

---

## 2. Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 17 | Language |
| Spring Boot | 3.x | Framework |
| Spring Security | 6.x | Auth + JWT |
| Spring Data JPA | 3.x | ORM |
| Spring WebSocket | 3.x | Real-time queue updates |
| PostgreSQL | 15+ | Primary database |
| Razorpay Java SDK | 1.4.3 | Payment gateway |
| JJWT | 0.11.x | JWT generation/validation |
| Lombok | 1.18.x | Boilerplate reduction |

**Schema management:** there is no Flyway (or any migration tool) in this project despite what earlier drafts of this README claimed — `spring.jpa.hibernate.ddl-auto=update` is what actually creates/alters tables, driven directly off the JPA entities. That's fine solo, pre-launch, but it means schema changes aren't versioned or reviewable as their own artifact, and `ddl-auto=update` should become `validate` (with a real migration tool introduced alongside it) before more than one person is deploying against the same database — see Security → Production Checklist.

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| React Router | 6.x | Client-side routing |
| Tailwind CSS | 3.x | Styling |
| Axios | 1.x | HTTP client |
| SockJS + STOMP | Latest | WebSocket client |
| Lucide React | 0.383.0 | Icons |

### Infrastructure — Actually Deployed

The Railway/Supabase/Vercel plan below this line was the original *recommendation* in earlier drafts of this README, but it was never actually used — the app is currently deployed on a single Azure VM instead. Documenting reality:

| Service | What | Purpose |
|---------|------|---------|
| Azure VM | Single Linux VM, raw IP (no domain yet) | Runs the Spring Boot backend |
| Azure Database for PostgreSQL | `saloncare-db.postgres.database.azure.com` | Primary database |
| Frontend | Built via `npm run build`, served from the same setup | `VITE_API_BASE_URL`/`VITE_WS_URL` point at the VM's IP |
| Razorpay | Test/Live | Payments |

**This deployment is currently plain HTTP, not HTTPS** — `frontend/.env.production` points at `http://<VM IP>`, with no domain or TLS termination in front of it. This matters more than it might seem: Section 9 (Payment Flow) documents Path A (the Razorpay webhook) as needing a public HTTPS URL to work at all. Right now, only Path B (frontend verify) can function — if a customer's browser closes or loses connection between "Razorpay says success" and the frontend's verify call completing, there's currently no webhook fallback to still confirm that payment. Added to Known Limitations below; a domain + TLS cert (e.g. via Caddy or Nginx + Let's Encrypt, or an Azure-managed cert) should be treated as a pre-launch blocker, not a nice-to-have.

*Original recommendation, for reference (not what's running):*

| Service | Plan | Cost | Purpose |
|---------|------|------|---------|
| Railway.app | Starter | ~₹800/mo | Backend hosting |
| Supabase | Free tier | ₹0 | PostgreSQL database |
| Vercel | Free | ₹0 | Frontend hosting |
| Razorpay | Test/Live | Per transaction | Payments |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│                                                              │
│  Customer side (glassmorphism theme, ambient-bg):            │
│    CustomerHome → SalonDetails → MyBookings → Login/Signup   │
│  Owner/barber side (paper-ticket theme, unchanged):           │
│    OwnerDashboard → BarberDashboard → AdminPanel              │
│  Navbar: dark glass, shared across both themes                │
│                                                              │
│  HTTP (Axios) ──────────────────────► REST API              │
│  WebSocket (STOMP/SockJS) ──────────► /ws endpoint          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Spring Boot)                      │
│                                                              │
│  Controllers → Services → Repositories → PostgreSQL          │
│  (ownership verified in service layer — see Security)        │
│                                                              │
│  JWT Filter → SecurityConfig → Role-based access             │
│  WebSocket Config → STOMP Broker → Queue broadcasts          │
│  NoShowScheduler → Auto-expire top customer after 15 min     │
│  PaymentCleanupScheduler → Expire abandoned PENDING_PAYMENT  │
│  Razorpay Integration → Order creation + signature verify    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                      │
│                                                              │
│  users → salons → services → queue_entries                   │
│  bookings → payments → reviews → platform_config            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────┐
│   Razorpay                  │
│   Webhook POST → /payments/ │
│   webhook (signature-       │
│   verified, no JWT)         │
└─────────────────────────────┘
```

**Frontend design system** — two coexisting themes, by design (see [Version History](#version-history) v3.0 for the full reasoning):
- **Customer-facing** (`CustomerHome`, `SalonDetails`, `MyBookings`, `Login`, `Signup`): glassmorphism — dark `.ambient-bg`, translucent `.glass`/`.glass-strong`/`.glass-active` panels (all defined in `index.css`). Palette + fonts defined in `tailwind.config.js`: `ink`/`paper`/`rose`/`brass`/`sage`/`sage-bright` colors, `Fraunces` (display), `Plus Jakarta Sans` (body), `IBM Plex Mono` (data/codes/prices).
- **Owner/barber-facing** (`BarberDashboard`, `ChairCard`, `OwnerDashboard`): the original light "paper ticket" theme — solid `bg-paper`/`bg-paper-card`, `text-ink`. Deliberately not migrated to glass; this is a tablet work tool, not a browsing experience.
- Before touching either side's UI, check which theme that page currently uses — the two are not interchangeable, and mixing them on one page will look broken.

### Request Flow for a Customer Booking

**Path A — Discovery (primary flow, customer not at salon yet):**
```
1. Customer opens app → CustomerHome loads
2. Browser geolocation API → lat/lng obtained
3. GET /api/salons/search/nearby?latitude=&longitude=&radiusKm=
   → Haversine SQL query → salons sorted by distance with wait badges
4. Customer taps a salon card → navigates to /salon/{id}
5. GET /api/salons/{id} → salon info + rating
6. GET /api/services/salon/{id} → available services
7. GET /api/queue/salon/{id} → current queue + wait time
8. WebSocket connects → /topic/queue/{id} → live updates
9. Customer selects one or more services (toggle-select, see v3.1) → clicks Pay
10. POST /api/payments/create-order → creates Booking(PENDING_PAYMENT) + Razorpay order
11. Razorpay popup opens → customer pays
12. POST /api/payments/verify → signature verified → Booking(CONFIRMED) → added to queue
13. WebSocket broadcasts updated queue to all connected clients
14. Customer sees success screen with booking code
15. MyBookings page shows estimated arrival time (live, updates every second)
```

**Path B — QR Code (customer physically at the salon):**
```
1. Customer scans QR code standee at salon counter
2. QR code URL = https://yourapp.com/salon/{id} → SalonDetails loads directly
3. Same flow from step 5 above onwards
   (can book online from their phone or owner adds them as walk-in on dashboard)
```

---

## 4. Project Structure

```
salonqueue/
├── backend/                          # Spring Boot application
│   └── src/main/
│       ├── java/com/salonqueue/
│       │   ├── config/
│       │   │   ├── SecurityConfig.java        # JWT + CORS + role-based auth
│       │   │   └── WebSocketConfig.java       # STOMP broker configuration
│       │   ├── controller/
│       │   │   ├── AuthController.java        # /api/auth/signup, /api/auth/login
│       │   │   ├── SalonController.java       # /api/salons/**
│       │   │   ├── ServiceController.java     # /api/services/**
│       │   │   ├── QueueController.java       # /api/queue/**
│       │   │   ├── BookingController.java     # /api/bookings/**
│       │   │   ├── PaymentController.java     # /api/payments/**
│       │   │   ├── ReviewController.java      # /api/reviews/**
│       │   │   ├── SalonOwnerController.java  # /api/owner/** (analytics + toggle)
│       │   │   └── AdminController.java       # /api/admin/** (admin only)
│       │   ├── entity/
│       │   │   ├── User.java                  # roles: CUSTOMER, SALON_OWNER, ADMIN
│       │   │   ├── Salon.java                 # active=open/close, verified=approved
│       │   │   ├── Service.java               # salon services with price + duration
│       │   │   ├── QueueEntry.java            # WAITING → IN_PROGRESS → COMPLETED
│       │   │   ├── Booking.java               # PENDING_PAYMENT → CONFIRMED → COMPLETED
│       │   │   ├── Payment.java               # CREATED → CAPTURED → REFUNDED
│       │   │   ├── Review.java                # 1-5 star + comment, one per customer per salon
│       │   │   └── PlatformConfig.java        # key-value runtime settings
│       │   ├── repository/            # Spring Data JPA repositories
│       │   ├── service/
│       │   │   ├── AuthService.java           # signup + login
│       │   │   ├── SalonService.java          # salon CRUD + Haversine search
│       │   │   ├── QueueService.java          # queue operations + WebSocket broadcast
│       │   │   ├── BookingService.java        # booking management
│       │   │   ├── PaymentService.java        # Razorpay order + verify + webhook
│       │   │   ├── ReviewService.java         # submit + fetch reviews + rating recalc
│       │   │   ├── SalonOwnerService.java     # owner analytics + open/close toggle
│       │   │   └── AdminService.java          # admin operations + live queue monitor
│       │   ├── security/
│       │   │   ├── JwtTokenProvider.java      # generate + validate JWT
│       │   │   ├── JwtAuthenticationFilter.java # extract JWT from every request
│       │   │   ├── CustomUserDetailsService.java # load user by email or phone
│       │   │   └── UserPrincipal.java         # Spring Security user wrapper
│       │   └── scheduler/
│       │       ├── NoShowScheduler.java       # auto-expire top customer after 15 min
│       │       └── PaymentCleanupScheduler.java # expire abandoned PENDING_PAYMENT bookings
│       └── resources/
│           ├── application.properties         # NOT actually env-var-only yet — real secrets
│           │                                  # still hardcoded in the tracked file, see
│           │                                  # Security → Production Checklist
│           └── (no migration tool — schema is managed by
│               spring.jpa.hibernate.ddl-auto=update, driven directly off
│               the entity classes; see Tech Stack note above)
│
└── frontend/                         # React + Vite application
    └── src/
        ├── index.css                         # design tokens: .ambient-bg, .glass,
        │                                     # .glass-strong, .glass-active, .ticket-notch,
        │                                     # .hide-scrollbar — see Architecture, section 3
        ├── context/
        │   └── AuthContext.jsx               # JWT + user stored in localStorage
        ├── services/
        │   └── api.js                        # all Axios calls + authAPI, salonAPI,
        │                                     # queueAPI, bookingAPI, paymentAPI,
        │                                     # reviewAPI, ownerAPI, adminAPI
        │                                     # (401 interceptor → auto-redirect to /login)
        ├── pages/
        │   ├── Login.jsx                     # glassmorphism theme
        │   ├── Signup.jsx                    # CUSTOMER only — SALON_OWNER signup
        │                                     # removed frontend AND backend, see v3.0
        │   ├── CustomerHome.jsx              # location → nearby salons (glass theme)
        │   ├── SalonDetails.jsx              # services + queue + booking + reviews (glass theme)
        │   ├── MyBookings.jsx                # booking list + arrival time + review (glass theme)
        │   ├── MySalon.jsx                   # salon owner profile editor
        │   ├── DashboardWrapper.jsx          # resolves salonId → renders OwnerDashboard
        │   └── admin/
        │       ├── AdminLayout.jsx           # sidebar navigation
        │       ├── AdminDashboard.jsx        # platform analytics
        │       ├── AdminSalons.jsx           # salon list + approve/register
        │       ├── AdminSalonDetail.jsx      # per-salon stats + coord editor
        │       ├── AdminUsers.jsx            # user list + activate/deactivate
        │       ├── AdminBookings.jsx         # all bookings with filters
        │       ├── AdminPayments.jsx         # all payments + refund trigger
        │       ├── AdminQueues.jsx           # live queue monitor + long wait alerts
        │       └── AdminConfig.jsx           # platform runtime settings
        └── components/
            ├── BarberDashboard.jsx           # live queue operations (paper-ticket theme)
            ├── ChairCard.jsx                 # one chair's "currently serving" card,
            │                                 # own independent timer (paper-ticket theme)
            ├── OwnerDashboard.jsx            # tabs: Queue + Analytics + Open/Close
            ├── Navbar.jsx                    # dark glass, shared across both themes
            ├── LoadingSpinner.jsx
            └── ErrorBoundary.jsx
```

---

## 5. Database Schema

### Entity Relationships
```
users (1) ──────────── (many) salons          [owner]
users (1) ──────────── (many) bookings        [customer]
users (1) ──────────── (many) reviews         [customer]
salons (1) ─────────── (many) services
salons (1) ─────────── (many) queue_entries
salons (1) ─────────── (many) bookings
salons (1) ─────────── (many) reviews
bookings (1) ────────── (1) queue_entries
bookings (1) ────────── (1) payments
bookings (1) ────────── (many) booking_service_items   [snapshotted price/duration]
```

### Key Fields by Entity

**users**
```sql
id, name, email (unique), phone (unique), password (bcrypt),
role (CUSTOMER | SALON_OWNER | ADMIN), active (bool),
created_at, updated_at
```

**salons**
```sql
id, name, description, address, city, phone,
latitude, longitude,           -- used for Haversine nearby search
total_chairs (default 1),      -- owner-editable 1 or 2, live, via PATCH /api/salons/{id}/chairs
verified (bool),               -- admin must approve before visible to customers
active (bool),                 -- owner can toggle open/closed
rating (decimal 3,2),          -- auto-recalculated after each review
total_reviews (int),
owner_id (FK → users),
created_at, updated_at
```

**queue_entries**
```sql
id, salon_id, booking_id (nullable — null for walk-ins),
position (int, nullable),
type (ONLINE_BOOKING | WALK_IN),
status (WAITING | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW),
customer_name, service_name,
estimated_duration_minutes,
actual_start_time,             -- set when barber clicks Start Service
completed_time,
chair_number (default 1),      -- which chair (1 or 2) this entry is/was seated in
                                -- while IN_PROGRESS; meaningless while WAITING
created_at, updated_at
```

**bookings**
```sql
id, booking_code (8-char uppercase),
customer_id, salon_id,
-- No direct service_id anymore — a booking can cover multiple services.
-- See booking_service_items below.
status (PENDING_PAYMENT | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW),
amount (decimal),
payment_completed (bool),
payment_id, payment_time,
cancellation_reason,           -- set by salon when cancelling online booking
cancelled_at, cancelled_by,
scheduled_time,
created_at, updated_at
```

**booking_service_items**
```sql
id, booking_id (FK → bookings),
service_id (FK → services, nullable — kept even if the underlying service is later deleted),
service_name, price, duration_minutes   -- snapshotted at booking time, so a customer's
                                         -- past booking still shows exactly what they
                                         -- paid for even if the service is later
                                         -- renamed/repriced/removed
-- One booking has many of these (replaces the old single service_id FK on bookings).
-- Booking.getCombinedServiceName() / getTotalDurationMinutes() join/sum these for
-- anything downstream (the queue, receipts, My Bookings) that just needs one name
-- and one duration, same as before multi-service existed.
```

**payments**
```sql
id, booking_id,
razorpay_order_id,             -- created by our backend
razorpay_payment_id,           -- returned by Razorpay after payment
razorpay_signature,            -- HMAC-SHA256 for verification
amount_paise (long),           -- always in paise (₹1 = 100 paise)
currency (INR),
status (CREATED | CAPTURED | FAILED | REFUNDED),
receipt,                       -- our booking_code
captured_at,
refund_id, refunded_at,
created_at
```

**reviews**
```sql
id, salon_id, customer_id,
rating (1-5, check constraint),
comment (text, nullable),
created_at, updated_at
UNIQUE (salon_id, customer_id)  -- one review per customer per salon
```

**platform_config**
```sql
config_key (PK), config_value, description, updated_at
-- Default entries:
-- noshow_timeout_minutes = 15
-- max_radius_km = 50
-- commission_percent = 0
-- platform_name = SalonQueue
-- support_email = support@salonqueue.in
-- max_queue_size = 50
-- booking_advance_hours = 24
```

### Schema Management
There is no migration tool (see the Tech Stack note above) — no Flyway, no versioned migration files. `spring.jpa.hibernate.ddl-auto=update` creates and alters tables directly from the JPA entity classes on startup. Fine for one person iterating solo pre-launch; should be replaced with `validate` + a real migration tool (Flyway or Liquibase, with an actual initial-schema script generated from the current entities) before more than one person deploys against the same database, or before any deploy where an accidental schema-drift mistake would be costly.

---

## 6. Features

### Customer Features
- **Location-based salon discovery** — browser geolocation → Haversine SQL query → salons sorted by distance with color-coded wait badges (green/amber/red)
- **Real-time queue view** — WebSocket updates every time queue changes, no polling
- **Online booking with payment** — select service → Razorpay popup → confirmed slot in queue
- **Live arrival time** — calculates remaining time of IN_PROGRESS customer + durations of people ahead, updates every second using `actualStartTime` from server
- **My Bookings** — all booking history with status badges, arrival time for CONFIRMED, review button for COMPLETED
- **Leave a review** — 1-5 stars + comment, only after service is COMPLETED, one review per salon

### Salon Owner Features
- **Live queue dashboard** — real-time list of WAITING customers + currently IN_PROGRESS customer with timer
- **Add walk-in** — name + service → instantly in queue
- **Start service** — moves customer from WAITING to IN_PROGRESS, starts elapsed timer
- **Complete service** — moves to COMPLETED, customer's booking marked COMPLETED, next customer ready
- **Cancel online booking** — requires selecting a reason (SALON_EMERGENCY, RUNNING_TOO_LATE, OVERBOOKING, OTHER) — customer sees reason in MyBookings
- **Remove walk-in** — silent remove, no record kept
- **Open/Close shop toggle** — green/red button, sets `active=false` → salon disappears from customer search immediately
- **Analytics dashboard** — Today view + custom date range: revenue, completed/cancelled/no-show counts, walk-ins vs online, rating

### Admin Features (at `/admin`)
- **Dashboard** — platform-wide stats: salons, users, bookings, revenue, live queue snapshot
- **Salon management** — register new salon (+ auto-creates owner account), approve/reject pending, activate/deactivate, fix coordinates
- **Salon detail** — per-salon stats + coordinate editor with Google Maps link
- **User management** — list all users by role, activate/deactivate (cannot deactivate ADMIN accounts)
- **Booking oversight** — all bookings across all salons, filterable by status and salon
- **Payment management** — all payments, refund trigger (calls Razorpay refund API)
- **Live queue monitor** — all active queues across all salons, auto-refreshes every 30s, highlights salons with long waits (>45 min cumulative expected wait)
- **Platform config** — runtime settings editable without redeployment

### Automated Features
- **No-show scheduler** — runs every 60 seconds; marks a WAITING customer as NO_SHOW if their promised `estimatedStartTime` is more than 15 minutes in the past AND a chair is actually free for them right now (checks every position with an open chair, not just position 1 — see v4.0 in [Version History](#version-history))

---

## 7. API Reference

### Authentication
```
POST /api/auth/signup       Public    Create account (CUSTOMER only — SALON_OWNER accounts
                                       are created exclusively via admin, see v3.0)
POST /api/auth/login        Public    Login, returns JWT
```

### Salons
```
GET  /api/salons/search/nearby   Public    ?latitude=&longitude=&radiusKm=
GET  /api/salons/search/name     Public    ?query=
GET  /api/salons/{id}            Public    Salon details + rating
GET  /api/salons/my-salon        Auth      Owner's own salon
POST /api/salons                 Auth      Create salon (used by MySalon page)
PATCH /api/salons/{id}/chairs    Auth      Owner-only. Body: { totalChairs: 1|2 }
```

### Queue
```
GET  /api/queue/salon/{salonId}          Auth    Full queue (WAITING + IN_PROGRESS)
GET  /api/queue/salon/{salonId}/wait-time Auth   Total wait minutes
POST /api/queue/walkin                   Auth    Add walk-in customer
POST /api/queue/{id}/start               Auth    Start service (WAITING → IN_PROGRESS)
POST /api/queue/{id}/complete            Auth    Complete service (→ COMPLETED)
DELETE /api/queue/{id}                   Auth    Remove walk-in from queue
POST /api/queue/{id}/cancel-booking      Auth    Cancel online booking with reason
```

### Bookings
```
GET  /api/bookings/customer     Auth    Customer's own booking history
```
*(There used to be a `POST /api/bookings` here — a dead, payment-bypassing endpoint never called by the frontend. Removed rather than updated for multi-service; see v3.1 in [Version History](#version-history).)*

### Payments
```
POST /api/payments/create-order  Auth       Body: { salonId, serviceIds: [...], notes }.
                                             Validates every serviceId belongs to salonId,
                                             sums price + duration → creates Razorpay order
                                             + PENDING_PAYMENT booking
POST /api/payments/verify        Auth       Verify signature → CONFIRMED → add to queue
POST /api/payments/webhook       Public*    Razorpay webhook (verified by HMAC signature)
GET  /api/payments/status/{id}   Auth       Poll payment status by Razorpay order ID
```
*Secured by HMAC-SHA256 signature, not JWT

### Reviews
```
GET  /api/reviews/salon/{salonId}   Public    All reviews for a salon
GET  /api/reviews/status/{salonId}  Auth      can_review | already_reviewed | no_completed_booking
POST /api/reviews/salon/{salonId}   Auth      Submit review (requires completed booking)
```

### Owner (Salon Owner only)
```
GET /api/owner/salon/{id}/status             Auth    Current open/closed status
PUT /api/owner/salon/{id}/toggle             Auth    Toggle open/closed
GET /api/owner/salon/{id}/analytics/today    Auth    Today's revenue + stats
GET /api/owner/salon/{id}/analytics/range    Auth    ?from=YYYY-MM-DD&to=YYYY-MM-DD
```

### Admin (ADMIN role only)
```
GET  /api/admin/analytics/summary
GET  /api/admin/salons                       ?status=pending|active|inactive
GET  /api/admin/salons/{id}
POST /api/admin/salons                       Register new salon
PUT  /api/admin/salons/{id}/approve
PUT  /api/admin/salons/{id}/reject
PUT  /api/admin/salons/{id}/toggle
PUT  /api/admin/salons/{id}/coords
GET  /api/admin/users                        ?role=CUSTOMER|SALON_OWNER
PUT  /api/admin/users/{id}/toggle
GET  /api/admin/bookings                     ?status=&salonId=
GET  /api/admin/payments                     ?status=
POST /api/admin/payments/{id}/refund
GET  /api/admin/queue/live
GET  /api/admin/config
PUT  /api/admin/config/{key}
```

---

## 8. Real-Time System

### How WebSocket Works
```
Client connects → SockJS → /ws endpoint
Client subscribes → /topic/queue/{salonId}
Server broadcasts → whenever queue changes
```

### When Broadcasts Fire
Every queue-modifying operation in `QueueService` calls:
```java
messagingTemplate.convertAndSend("/topic/queue/" + salonId, getQueue(salonId));
```
This happens on: add walk-in, start service, complete service, remove from queue, cancel booking, no-show scheduler runs.

### Who Listens
- `BarberDashboard.jsx` — owner's operational screen
- `SalonDetails.jsx` — customer's salon page (live queue preview)

### Wait Time Calculation
Two related but distinct things use this same "frees up in N minutes" simulation, one per active chair (`totalChairs`, 1 or 2), seeded from whoever's currently `IN_PROGRESS` on that chair:
```
chairFreeInMinutes[chair] = max(0, estimatedDuration - elapsedSinceActualStartTime)  // 0 if chair is empty

for each WAITING customer in position order:
    idx = index of the smallest value in chairFreeInMinutes
    theirWait = chairFreeInMinutes[idx]
    chairFreeInMinutes[idx] += theirEstimatedDuration
```
Each waiting customer is assigned to whichever chair frees up soonest. With `totalChairs=1` this collapses back to the original single-line sum — no separate code path for single-chair salons.

**1. `GET /api/queue/salon/{id}/wait-time`** (`QueueService.getEstimatedWaitTime()`) — recalculates fresh, live, on every call. This is "if I joined right now, how long would I wait" — shown to a prospective customer before they've joined, and it's meant to move as the real queue moves.

**2. Each `QueueEntry.estimatedStartTime`** — the specific arrival/start time promised to a customer who has already joined. This runs the same simulation, but **only once, at the moment they join** (`calculateEstimatedStartTime`). After that it's frozen — `updateQueuePositions()` no longer recalculates it when the queue reshuffles (people ahead finishing, cancelling, or being marked no-show). This was a deliberate fix in v4.0: recalculating it live meant an online booking's promised slot could get silently overwritten with "right now" the instant a chair opened up early, which then made the no-show check (which compares against this same field) treat them as instantly overdue. See v4.0 in [Version History](#version-history) for the full story, including the trade-off — downstream customers no longer see their estimate get more optimistic as people ahead of them clear out early.

Both paths use `actualStartTime` from the server (set when the barber clicks Start) — not a client-side timer — so the owner dashboard and the customer's view always agree on what's actually happening right now, even though #2 above is deliberately *not* live once set.

---

## 9. Payment Flow

### Two Confirmation Paths
```
Path A (Webhook) — PRIMARY
  Razorpay → POST /api/payments/webhook
  Verified by: HMAC-SHA256(payload, webhookSecret)
  Works in: Production only (needs public HTTPS URL)

Path B (Frontend verify) — SECONDARY / DEV
  Frontend → POST /api/payments/verify
  Verified by: HMAC-SHA256(orderId|paymentId, keySecret)
  Works in: Always (localhost + production)
```

### Step by Step
```
1. Customer clicks Pay
   → POST /api/payments/create-order
   → Creates Booking(PENDING_PAYMENT) in DB
   → Creates Razorpay order (amountPaise, currency, receipt=bookingCode)
   → Returns { razorpayOrderId, razorpayKeyId, amountPaise, ... }

2. Frontend opens Razorpay popup
   → Customer pays (card/UPI/netbanking)
   → On success: handler({ razorpay_order_id, razorpay_payment_id, razorpay_signature })

3. Frontend calls POST /api/payments/verify
   → Backend verifies: HMAC-SHA256(orderId + "|" + paymentId, keySecret) == signature
   → If valid: Payment(CAPTURED), Booking(CONFIRMED), QueueEntry added
   → WebSocket broadcasts updated queue

4. Customer sees success screen with booking code

5. If customer closes popup / card declined:
   → Booking stays PENDING_PAYMENT
   → PaymentCleanupScheduler auto-cancels it after 20 min (payment.pending-timeout-minutes)
     with cancellationReason=PAYMENT_TIMEOUT, cancelledBy=SYSTEM
   → Customer sees a clear "Cancelled — payment timed out" status in My Bookings,
     not a booking that silently disappears
   → Linked Payment flipped to FAILED if still CREATED
   → Razorpay popup also shows error to customer directly, in the moment
```

### Refund Flow
```
Admin panel → Payments tab → Refund button
→ POST /api/admin/payments/{id}/refund
→ Calls razorpay.payments.refund(paymentId, { amount: amountPaise })
→ Payment(REFUNDED), Booking(CANCELLED)
→ Razorpay processes refund to customer's original payment method (3-5 business days)
```

---

## 10. Queue Logic

### Queue Entry Lifecycle
```
Walk-in added     → WAITING (position assigned)
Online booking    → WAITING (after payment confirmed)
Barber taps Start → IN_PROGRESS (actualStartTime set, chairNumber assigned to
                     lowest-numbered free chair, position cleared)
Barber taps Done  → COMPLETED (booking marked COMPLETED)
Barber cancels    → CANCELLED (with reason, customer notified in MyBookings)
No-show scheduler → NO_SHOW (promised estimatedStartTime + 15 min has passed, AND a
                     chair is actually free for their position — see v4.0)
Payment abandoned → CANCELLED, reason=PAYMENT_TIMEOUT (after 20 min in PENDING_PAYMENT,
                     via PaymentCleanupScheduler — never reaches the queue at all)
```

### Chair Assignment
With `totalChairs` set to 1 or 2 (owner-editable, live, via `PATCH /api/salons/{id}/chairs`), `startService()` hands the customer the lowest-numbered chair that isn't currently occupied by another `IN_PROGRESS` entry. If both chairs are occupied, the start request is rejected (the barber dashboard already prevents this by only showing "Start Service" for as many waiting customers as there are free chairs). Dropping the chair count while someone is mid-service on the now-inactive chair does not interrupt them — it only stops that chair from being offered to new customers. Reading the occupied-chairs set and assigning a chair happens under a pessimistic lock on the salon row (see Security → Concurrency Safety) so two overlapping Start calls can't both grab the same chair.

### Position Numbering
Positions are reassigned after every change, in `QueueService.updateQueuePositions()` — renumbers all WAITING entries 1, 2, 3... after any addition, removal, start, or completion. New entries get their initial position under the same salon-row lock used for chair assignment, so two simultaneous adds can't compute the same "next position."

### Ownership on Every Mutation
`startService`, `completeService`, `removeFromQueue`, `cancelOnlineBookingFromQueue`, and `addWalkInToQueue` all take the caller's user ID and verify it against the salon's actual owner before doing anything (`verifySalonOwnership()` — added in v3.0, see [Version History](#version-history)). None of these will silently no-op or partially apply for a non-owner — they throw immediately.

### No-Show Scheduler
```java
// Runs every 60 seconds (configurable via queue.noshow.check-interval-ms)
//
// For each salon, computes freeChairs = totalChairs - count(IN_PROGRESS).
// Checks every WAITING entry whose position <= freeChairs (not just position 1 —
// with 2 chairs, position 1 AND position 2 can each have their own free chair
// waiting on them at the same time; see v4.0 in Version History for why the old
// "only check position 1, skip the whole salon if anyone is IN_PROGRESS" version
// was wrong on a 2-chair salon).
//
// For each of those entries:
// If estimatedStartTime < now - 15 minutes
//   (estimatedStartTime is the arrival time actually promised to the customer,
//    set once when they joined the queue and frozen since — NOT createdAt,
//    and NOT "time they became position 1"; both were tried and both were
//    wrong, see v4.0)
// → status = NO_SHOW
// → if linked booking: booking.status = NO_SHOW
// → recalculate positions
// → broadcast WebSocket update
```

### Long Wait Detection (Admin)
```java
// For each active salon's queue:
// 1. Find IN_PROGRESS entry
// 2. Calculate waitAlreadyAccumulated:
//    - if service still running: remaining = estimatedDuration - elapsedSinceStart
//    - if service overdue:       overrun   = elapsedSinceStart - estimatedDuration
// 3. Walk WAITING list, accumulate wait times
// 4. If cumulative >= 45 minutes → hasLongWait = true
// Admin queue monitor shows amber badge on that salon's card
```

---

## 11. Security

### Authentication Flow
```
Signup/Login → AuthService → BCrypt verify → JwtTokenProvider.generateToken()
→ JWT returned to client → stored in localStorage
→ Every request: Authorization: Bearer <token>
→ JwtAuthenticationFilter extracts token → validates → sets SecurityContext
→ Controllers access currentUser via @AuthenticationPrincipal UserPrincipal
```

### JWT Configuration
```properties
jwt.secret=${JWT_SECRET}      # Must be from env var, min 32 chars
jwt.expiration=2592000000     # 30 days in milliseconds (was 24h — see v3.0 in Version History
                               # for why: no token revocation mechanism exists, so this is a
                               # deliberate balance between re-login friction and how long a
                               # leaked token stays valid. Revisit with a refresh-token setup
                               # if/when that tradeoff needs to shift.)
```

### Role Hierarchy
```
CUSTOMER    → /api/home, /api/salons (read), /api/bookings, /api/payments, /api/reviews
SALON_OWNER → everything CUSTOMER can do + /api/queue/** (mutations), /api/services/** (mutations), /api/owner/**
ADMIN       → everything + /api/admin/**
```
**This table describes intent, not routing** — `/api/queue/**` and `/api/services/**` are reachable by any authenticated role at the Spring Security level (`.anyRequest().authenticated()`), same as `/api/bookings` etc. The actual SALON_OWNER-only restriction on *mutations* (start/complete/remove/cancel a queue entry, create/update/delete a service, create a salon) is enforced in the **service layer** — each of those methods verifies the caller's ID against `salon.getOwner().getId()` before acting (`verifySalonOwnership()` in `QueueService`/`ServiceService`, mirroring the pre-existing `getOwnedSalon()` pattern in `SalonOwnerService`). This was actually missing for `/api/queue/**` and `/api/services/**` until the v3.0 audit found it — see [Version History](#version-history) for the full finding. **If you add a new mutating endpoint under either path, or a new one elsewhere that modifies a specific salon's data, it needs this same ownership check — Spring Security's role check alone is not sufficient, since "any SALON_OWNER" and "the SALON_OWNER who owns *this* salon" are different things.** Read-only endpoints (GET queue, GET wait-time, GET services) are intentionally open to any authenticated user — that data is meant to be publicly visible to customers.

### Concurrency Safety
Several places assign a sequential value (queue position, chair number) or check-then-update a status (payment confirmation) using a plain read followed by a write, which is not safe under true concurrency at the default PostgreSQL isolation level. Where this mattered in practice, it's guarded with a pessimistic row lock on the parent entity (`SalonRepository.findByIdForUpdate`, `PaymentRepository.findByRazorpayOrderIdForUpdate`) acquired *before* the read, so a second concurrent transaction blocks until the first commits instead of both reading stale data. See v3.0 in [Version History](#version-history) for the three specific races found (queue position, chair assignment, payment confirmation) and why each mattered. **If you add new logic that reads a salon's or payment's current state and then writes back a derived value, use the `-ForUpdate` repository method, not the plain `findById`.**

### Webhook Security
The Razorpay webhook endpoint (`/api/payments/webhook`) is `permitAll` in SecurityConfig — it has no JWT because Razorpay doesn't send one. It is secured instead by verifying:
```java
HMAC-SHA256(rawRequestBody, webhookSecret) == X-Razorpay-Signature header
```
If the signature doesn't match, the request is rejected with 400.

### Deactivated Users
When admin deactivates a user, `user.active = false`. `UserPrincipal.isEnabled()` returns `user.active`. Spring Security rejects login attempts for disabled accounts. Existing valid JWTs for deactivated users will fail on next request since `loadUserById` will return a disabled principal.

### Production Checklist
- [ ] **All secrets in environment variables, never in code or properties files — NOT DONE.** `application.properties` as currently tracked still has the real DB password, JWT signing secret, and Razorpay key ID/secret/webhook secret hardcoded in plaintext, in a *public* repo. The v2.0 entry in [Version History](#version-history) describes this as fixed — it wasn't actually applied to the committed file (or was reverted). Do not deploy until: (1) the file is edited to use `${DB_PASSWORD}` / `${JWT_SECRET}` / etc. with only fake local-dev fallbacks, and (2) all three credentials are rotated — the current values must be treated as already compromised, since they've been sitting in a public repo.
- [ ] `.env` and `application-prod.properties` in `.gitignore`
- [ ] JWT secret generated with `openssl rand -hex 32`
- [ ] `spring.jpa.hibernate.ddl-auto=validate` (not update)
- [ ] `logging.level.*=INFO` or WARN (not DEBUG)
- [x] CORS origins properly read from `ALLOWED_ORIGINS` env var — was hardcoded in 3 separate places (`SecurityConfig` bean, per-controller `@CrossOrigin` annotations, `WebSocketConfig`) until v3.0, see [Version History](#version-history). Set `ALLOWED_ORIGINS` to your actual production domain(s) — comma-separated, no trailing slash.
- [ ] Razorpay switched from test keys (`rzp_test_`) to live keys (`rzp_live_`)
- [ ] Webhook URL registered in Razorpay dashboard pointing to production URL
- [ ] Database and backend in same region (avoid cross-region latency)
- [ ] **Domain name + HTTPS/TLS in front of the backend — currently missing.** The deployed VM is served over plain HTTP with no domain (see Architecture/Infrastructure). Payment Flow's Path A (the Razorpay webhook) explicitly requires a public HTTPS URL — right now it cannot function at all, meaning only Path B (frontend verify) confirms payments, with no fallback if the customer's connection drops between Razorpay's success response and that verify call completing. Put a reverse proxy (Nginx/Caddy) with a real cert (Let's Encrypt or Azure-managed) in front of the backend before relying on this in production.
- [x] Constant-time signature comparison — `verifyWebhookSignature`/`verifyPaymentSignature` used plain `String.equals()` (a timing side-channel) until v4.0; now use `MessageDigest.isEqual()`. See [Version History](#version-history).
- [x] Payment-confirmation / cleanup-scheduler race — a webhook delayed past the payment timeout window could previously either get silently overwritten by the cleanup job or itself overwrite a just-cleaned-up booking back into the live queue. Fixed in v4.0 with a shared row lock between `PaymentService.confirmPayment()` and `PaymentCleanupScheduler`, plus a guard against resurrecting an already-cancelled booking. See [Version History](#version-history).

---

## 12. Admin Panel

### Access
URL: `/admin`
Role required: `ADMIN`
Login: Create admin account directly in DB (never via signup page):
```sql
INSERT INTO users (name, email, phone, password, role, active, created_at, updated_at)
VALUES (
  'Admin',
  'admin@salonqueue.in',
  '9999999999',
  '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBpwTpHkap0NUm',
  'ADMIN', true, NOW(), NOW()
);
-- Default password: admin123 — CHANGE IMMEDIATELY
```

### Key Admin Workflows

**Registering a new salon (your main job):**
1. Go to Admins → Salons → Register Salon button
2. Fill salon details + owner details
3. Owner account is auto-created (temporary password)
4. Salon is auto-verified (admin-registered = trusted)
5. Get coordinates from Google Maps, paste into form
6. Print QR code (future feature) linking to `/salon/{id}`
7. Put QR standee at salon counter

**Monitoring operations:**
- Queue page auto-refreshes every 30 seconds
- Amber "Long wait" badge = someone waiting 45+ min cumulative
- Check affected salon, call owner if needed

**Handling a refund complaint:**
1. Payments tab → search by customer name or booking code
2. Find the CAPTURED payment → click Refund
3. Enter reason → confirm
4. Razorpay processes refund in 3-5 business days to customer

---

## 13. Environment Setup

**Note: this section documents the intended/target configuration, not the current state of the tracked `application.properties`.** As covered in Security → Production Checklist, the committed file still has real secrets hardcoded rather than reading from the environment variables below. Treat this section as "what it should look like after that's fixed," not "what's currently deployed."

### Required Environment Variables
```bash
# Database
DB_URL=jdbc:postgresql://localhost:5432/salon_db
DB_USERNAME=postgres
DB_PASSWORD=your_password

# JWT — generate with: openssl rand -hex 32
JWT_SECRET=your_64_char_hex_string

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# CORS + WebSocket — comma-separated, no trailing slash. Controls both REST
# CORS (SecurityConfig) and the STOMP endpoint (WebSocketConfig) — both read
# this same var. Defaults to localhost:3000,localhost:5173 if unset, which is
# fine for local dev but MUST be set to your real domain(s) in production or
# the frontend simply won't be able to talk to the backend at all.
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Frontend
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8080/ws
```

### Frontend `.env` file (in `/frontend/.env.local`)
```
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8080/ws
```

### Frontend `.env.production` file (for `npm run build` / deployment)
Only read during a production build, not `npm run dev` — local dev is unaffected and keeps using the `localhost` fallback in `api.js` regardless of whether this file exists.
```
VITE_API_BASE_URL=http://<your-backend-host>:8080
VITE_WS_URL=http://<your-backend-host>:8080/ws
```

---

## 14. Running Locally

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL 15+
- Maven 3.8+

### Backend
```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE salon_db;"

# 2. Set environment variables (or create .env.local)
export DB_PASSWORD=yourpassword
export JWT_SECRET=$(openssl rand -hex 32)
export RAZORPAY_KEY_ID=rzp_test_xxxx
export RAZORPAY_KEY_SECRET=xxxx
export RAZORPAY_WEBHOOK_SECRET=xxxx

# 3. Run
cd backend
./mvnw spring-boot:run

# Backend starts at http://localhost:8080
# Hibernate auto-creates/updates the schema on startup (ddl-auto=update) —
# there's no separate migration step to run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend starts at http://localhost:5173 (or 3000 if configured)
```

### Testing Payments Locally
Razorpay webhooks need a public URL. For local testing:
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8080
# Copy the https URL, e.g. https://abc123.ngrok.io
# Add webhook in Razorpay dashboard:
#   URL: https://abc123.ngrok.io/api/payments/webhook
#   Events: payment.captured, payment.failed
```
Path B (frontend verify) works without ngrok for basic payment testing.

### Test Cards (Razorpay Test Mode)
| Method | Details | Result |
|--------|---------|--------|
| Card | 4111 1111 1111 1111, any future expiry, CVV 123 | Success |
| Card | 4000 0000 0000 0002 | Failure |
| UPI | success@razorpay | Success |
| UPI | failure@razorpay | Failure |
| Net Banking | Select any bank | Auto success |

### Mobile Testing on Same WiFi
```bash
# In vite.config.js — already configured:
server: { host: '0.0.0.0', port: 3000 }

# Find your laptop IP:
ip addr show  # Linux
# e.g. 192.168.31.2

# On phone: open http://192.168.31.2:3000
# Note: geolocation requires HTTPS — use dev bypass flag in CustomerHome.jsx:
# USE_DEV_LOCATION = true  (bypasses geolocation with hardcoded coords)
```

---

## 15. Deployment Guide

**What's actually running (see Architecture → Infrastructure for details):** a single Azure VM running the Spring Boot backend directly, talking to Azure Database for PostgreSQL, currently reachable over plain HTTP at a raw IP (`frontend/.env.production` points `VITE_API_BASE_URL`/`VITE_WS_URL` at `http://20.192.31.78`) — no domain, no reverse proxy, no TLS cert. There's no Dockerfile or deployment script committed to this repo, so however the app currently gets onto that VM (manual `scp` + `systemd` service, a CI step, etc.) isn't documented here — worth writing down properly once it's decided, since "how does a rebuild actually reach the VM" isn't something this README can currently answer.

**Before this is production-ready as deployed, at minimum:**
1. Put a domain in front of the VM's IP
2. Terminate TLS with a reverse proxy (Nginx or Caddy + Let's Encrypt, or an Azure-managed cert) — this is a hard requirement, not a nice-to-have, since the Razorpay webhook (Payment Flow, Path A) only works over HTTPS
3. Update `frontend/.env.production`'s `VITE_API_BASE_URL`/`VITE_WS_URL` to the new `https://` domain
4. Update `ALLOWED_ORIGINS` to match
5. Register the webhook URL in the Razorpay dashboard once HTTPS is live
6. Actually fix the exposed secrets in `application.properties` and rotate all three credentials — see Production Checklist above; this blocks everything else regardless of hosting

### Original Recommendation (Railway/Supabase/Vercel) — Not What's Deployed

This was the original Phase-1 plan documented here before the move to a VM. Keeping it for reference in case it's revisited (e.g. if the VM approach turns out to be more ops overhead than wanted), but it does not describe the current deployment.

**Recommended Stack (Phase 1, 0-3 months, ~₹800-1800/month)**
```
Backend  → Railway.app (Starter plan)
Database → Supabase (Free tier, 500MB)
Frontend → Vercel (Free)
```

**Railway Deployment**
```bash
# 1. Push to GitHub
# 2. Connect Railway to GitHub repo
# 3. Set environment variables in Railway dashboard:
#    DB_URL, DB_USERNAME, DB_PASSWORD (from Supabase)
#    JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
#    RAZORPAY_WEBHOOK_SECRET, ALLOWED_ORIGINS

# 4. Railway auto-builds from Dockerfile or Buildpack
# 5. Get your Railway URL, e.g. https://salonqueue.railway.app
```

**Vercel Deployment**
```bash
cd frontend
# Set environment variables in Vercel dashboard:
# VITE_API_BASE_URL=https://salonqueue.railway.app
# VITE_WS_URL=https://salonqueue.railway.app/ws

vercel --prod
```

**After Deployment (Railway/Vercel path)**
1. Update CORS in `SecurityConfig.java` to include your Vercel domain
2. Register webhook in Razorpay dashboard: `https://your-railway-url/api/payments/webhook`
3. Switch Razorpay from test keys to live keys
4. Create admin account via SQL in Supabase dashboard
5. Change admin password immediately after first login

---

## 16. Known Limitations

### Single Timezone Assumption (IST hardcoded)
The JVM's default timezone is pinned to `Asia/Kolkata` at startup (see v3.0 in [Version History](#version-history) — this fixed a real ~5.5 hour display bug). This is correct and deliberate for an India-only app, but it means every `LocalDateTime.now()` call assumes IST. If this app ever serves users outside India, this becomes a real limitation to revisit — the fix then would be storing/transmitting timestamps as `Instant`/UTC with explicit timezone info rather than relying on the server's local wall-clock time.

### No HTTPS on the Deployed Backend
The current Azure VM deployment is plain HTTP with no domain (see Architecture → Infrastructure and Deployment Guide). This isn't just a generic "should have TLS" concern — Payment Flow's Path A (the Razorpay webhook) specifically requires a public HTTPS URL to function, so right now that path cannot work at all in production. Only Path B (the frontend's own verify call) can confirm a payment, and if the customer's browser closes or loses connection between Razorpay's success response and that verify call completing, there's currently no fallback — the booking stays `PENDING_PAYMENT` until `PaymentCleanupScheduler` cancels it 20 minutes later, even though the customer may have actually paid. Fixing this is a matter of putting a reverse proxy + TLS cert in front of the VM (see Deployment Guide) — not a code change — but it's a real gap in the current live deployment, not a theoretical one.

### Per-Entry Wait Estimates Are Frozen, Not Live (v4.0 trade-off)
As of v4.0, a customer's individual `estimatedStartTime` is set once when they join the queue and never recalculated afterward — this was a deliberate fix for the no-show timer (see [Version History](#version-history)), since recalculating it live meant an online booking's promised slot could get silently pulled earlier and then falsely flagged as overdue. The trade-off: a customer waiting behind others no longer sees their own estimate improve if people ahead of them finish early or get cancelled — their displayed time is exactly what they were told when they joined, full stop. The salon-wide "if I joined right now" estimate (`GET /wait-time`, shown to prospective customers before joining) is unaffected and still fully live. If dynamic per-entry ETA updates are wanted back without reintroducing the no-show bug, that needs two separate fields — a freely-recalculating display estimate, and a frozen promise the no-show check uses — not built, since nobody's asked for it yet.

### Chairs Capped at 2
The queue math and barber dashboard now correctly handle up to 2 active chairs (see [Version History](#version-history) for how). Salons with 3+ chairs are not yet supported — the wait-time simulation would need only a constant changed to extend further, but the shared-device UI and the "any free chair vs. request a specific stylist" question haven't been designed for that case. Deliberately deferred until a real 3+ chair salon needs it.

### No Password Reset
There is currently no forgot-password / password-reset flow. Salon owners who forget their password need to contact admin to reset it directly in the database. To be built before wide launch.

### No Opening Hours
Salons don't have configurable opening and closing times. A customer could technically book at 11pm. The open/close toggle (owner can manually set `active=false`) is the current workaround. Formal opening hours with automated close is a planned feature.

### No WhatsApp Notifications
Customers receive no push notification when their turn is approaching. This is the single biggest gap for the Indian market where customers leave the salon and come back — without a nudge they may miss their slot. API options, rough per-message cost, and the `QueueService` integration point have been researched and scoped (see [Version History](#version-history)) but not yet built.

### N+1 Query Risk
Several service methods access lazy-loaded JPA relationships (e.g. `payment.getBooking().getCustomer()`). At current scale (< 100 salons) this is imperceptible. Will require `@EntityGraph` or `JOIN FETCH` optimization before scaling to hundreds of salons.

---

## 17. Roadmap

### Before First Salon Goes Live
- [x] Fix hardcoded WebSocket URLs → use `VITE_WS_URL`
- [x] 2-chair queue support
- [x] Abandoned-payment cleanup (no more silently-orphaned PENDING_PAYMENT rows)
- [ ] **Secrets out of tracked `application.properties` — NOT actually done, despite being checked off before.** Re-verified as still hardcoded in the tracked file; see Security → Production Checklist. This is a hard blocker, not a nice-to-have.
- [x] Authorization audit — ownership checks on queue/service mutations, salon creation role check (v3.0)
- [x] Concurrency audit — locking on position/chair assignment and payment confirmation (v3.0)
- [x] **Extensive manual scenario testing (~1 month)** — not automated concurrent load testing, but deliberate manual testing across every combination the owner could think up (simultaneous walk-ins/bookings, multi-chair no-show timing, payment-confirmation timing). This found and fixed three real bugs: the no-show timer using the wrong clock (twice — see v4.0), the multi-chair no-show blind spot, and the payment-cleanup/webhook race. Still worth a genuine automated concurrent-load test before scaling past a handful of salons — manual testing found real bugs but can't rule out timing-dependent ones that only show up under sustained concurrent traffic.
- [ ] **Domain name + HTTPS/TLS in front of the backend** — currently a plain-HTTP VM with a raw IP; blocks the Razorpay webhook path entirely (see Known Limitations)
- [ ] Password reset via OTP (SMS or email)
- [ ] Opening hours per salon (block bookings outside hours)
- [ ] QR code auto-generation in admin salon detail page

### Before 5th Salon
- [ ] WhatsApp Business API notifications (2 people ahead → send WhatsApp) — API + cost scoped, see [Version History](#version-history)
- [ ] Salon owner analytics — detailed per-service breakdown
- [ ] Customer booking history in admin (per-customer view)
- [ ] Review management — owner can flag inappropriate reviews

### Before Monetization (15+ salons)
- [ ] Subscription billing for salon owners (Razorpay subscriptions)
- [ ] Commission tracking on online bookings
- [ ] 3-4 chair support, if a real salon needs it — revisit stylist-assignment design question first
- [ ] Advance scheduling (book a slot for tomorrow, not just today)
- [ ] SMS fallback for customers without smartphones

### Future
- [ ] Flutter mobile app (customer-facing)
- [ ] Android tablet kiosk mode for salon counter (TWA via Bubblewrap)
- [ ] IoT physical button (ESP32) for walk-in self-checkin
- [ ] Loyalty points system
- [ ] Competitor salon analytics

---

## Glossary

| Term | Meaning |
|------|---------|
| Walk-in | Customer who arrives without booking, added directly by owner |
| Online booking | Customer who booked and paid via the app |
| Queue entry | A row in `queue_entries` — represents one customer's slot |
| Booking | A row in `bookings` — only exists for online bookings, not walk-ins |
| PENDING_PAYMENT | Booking created but payment not confirmed yet |
| Verified salon | Admin-approved salon, visible in customer search |
| Active salon | Shop is open (owner toggle), shows in nearby search |
| Floor (removed) | Was: a minimum arrival time that prevented time from going backward. Removed because it caused times to drift upward incorrectly when service ran over |
| PAYMENT_TIMEOUT | Cancellation reason set by PaymentCleanupScheduler when a booking sat in PENDING_PAYMENT too long with no completed payment |
| Chair | A parallel service slot at a salon (1 or 2, owner-editable). Not a separate DB table — represented by `totalChairs` on Salon and `chairNumber` on QueueEntry |
| Haversine | Mathematical formula to calculate distance between two GPS coordinates — used in the nearby salon SQL query |
| paise | 1/100th of a rupee. All payment amounts stored in paise (₹150 = 15000 paise) |
| STOMP | Messaging protocol over WebSocket used for real-time queue broadcasts |
| `.ambient-bg` / `.glass` | Customer-side design tokens (in `index.css`) — dark gradient background and frosted-glass panel classes. Not used on the owner/barber side, which keeps the original light "paper ticket" theme |
| `-ForUpdate` repository methods | e.g. `findByIdForUpdate` — acquires a pessimistic database row lock before reading, used wherever a value is read and then written back based on that read (queue position, chair assignment, payment status), to prevent two concurrent requests from both reading stale data |
| `verifySalonOwnership()` | Service-layer check (in `QueueService`/`ServiceService`) that the authenticated caller actually owns the salon they're trying to modify. Required on every new mutating endpoint scoped to a specific salon — Spring Security's role check alone (`SALON_OWNER`) doesn't distinguish "owns *a* salon" from "owns *this* salon" |
| `estimatedStartTime` | Per-`QueueEntry` field: the arrival/start time actually promised to a customer, computed once when they join and frozen from then on. Drives both the customer's displayed ETA and the no-show cutoff. See v4.0 — this used to be live-recalculated, which caused a real no-show bug |
| `BookingServiceItem` | Join entity between `Booking` and `Service` (v3.1) — a booking has many of these, one per selected service, each snapshotting that service's name/price/duration at booking time so later renames/repricing don't retroactively change what a past receipt shows |
| `findOverdueWaitingEntries` | `QueueService` method (v4.0) that the no-show scheduler calls — finds every WAITING entry whose `estimatedStartTime` is overdue AND has an actual free chair available at its position, generalizing correctly to more than one chair |

---

*Last updated: September 2026 — v4.0*
*Built by: Ronak*
*Stack: Spring Boot + React + PostgreSQL + Razorpay*
