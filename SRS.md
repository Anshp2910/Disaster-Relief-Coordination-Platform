# Software Requirements Specification (SRS)

## Disaster Relief Coordination Platform (DRCP)

| | |
|---|---|
| **Document Version** | 1.0 |
| **Date** | September 24, 2026 |
| **Status** | Draft for review |
| **Product Scope** | Web-based emergency response coordination system |
| **Deployed Site** | https://disasterhelper.dpdns.org |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Specific Requirements](#3-specific-requirements)
4. [Verification Matrix](#4-verification-matrix)
5. [Appendix](#5-appendix)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) describes the functional and non-functional requirements for the **Disaster Relief Coordination Platform (DRCP)** — a web application that connects government authorities, NGOs, and volunteers to coordinate emergency relief operations. It is intended for software engineers, testers, project managers, and stakeholders involved in the development, maintenance, and acceptance of the system.

### 1.2 Scope

The system is a full-stack web application (MongoDB + Express + React + Node.js) that supports:

- User registration, authentication, and role-based access control.
- Creation, claiming, and tracking of relief **requests** (e.g., food, water, medical, shelter).
- Inventory and **allocation** of relief **resources** (e.g., supplies, transport, equipment).
- **Geographic zones** and **incidents** with map-based visualization and zone coverage analysis.
- **SOS emergency broadcast** with real-time alerting.
- Per-request **chat** and **comments**, **scheduling** of volunteers, **feedback** on fulfilled requests.
- Request **escalation**, **geofencing** checks, **weather** integration, and **bulk CSV import/export**.
- Administrative dashboards, bilingual/multilingual UI, PWA offline support, and theming.

Out of scope for this version: native mobile applications, telephony/SMS/WhatsApp gateways, payment processing, integration with official government disaster databases (NDRF/NDMA feeds), and hardware sensor data ingestion.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| **SRS** | Software Requirements Specification |
| **MERN** | MongoDB, Express, React, Node.js |
| **NGO** | Non-Governmental Organization |
| **JWT** | JSON Web Token (HS256) |
| **CSRF** | Cross-Site Request Forgery |
| **CSP** | Content Security Policy |
| **CORS** | Cross-Origin Resource Sharing |
| **XSS** | Cross-Site Scripting |
| **PWA** | Progressive Web App |
| **GIS** | Geographic Information System |
| **GeoJSON** | Geographic data interchange format |
| **2dsphere** | MongoDB geospatial index for location queries |
| **SOS** | Emergency distress signal (in-app emergency alert) |
| **RTL** | Right-to-Left (text direction) |
| **i18n** | Internationalization |
| **WMO** | World Meteorological Organization (weather code) |
| **MoSCoW** | Must / Should / Could / Won't priority scheme |
| **TTL** | Time to Live (document expiry) |

### 1.4 References

| Reference | Location |
|---|---|
| Project README | `README.md` |
| Completed-work log | `TODO.md` |
| Product Requirements Document (PRD) | `PRODUCT REQUIREMENTS DOCUMENT DRCP.pdf` |
| Design system | `DESIGN_SYSTEM.md` |
| UI/UX specification | `UI-UX-DESIGN.md` |
| Backend source | `server/src/` |
| Frontend source | `client/src/` |

### 1.5 Overview

The remainder of this document is organized as follows: Section 2 provides an overall description of the product (perspective, functions, user classes, environment, constraints, assumptions). Section 3 specifies detailed functional and non-functional requirements with unique identifiers. Section 4 provides a verification (traceability) matrix. Section 5 contains notes on the source-code evidence base.

---

## 2. Overall Description

### 2.1 Product Perspective

DRCP is a standalone, self-contained web platform. It is the successor/consolidation of a previously deployed disaster-relief service and is designed to operate on a serverless-friendly host (Render) with MongoDB Atlas. It provides:

- A **React single-page application** served to browsers (with PWA capability and a service worker).
- A **REST JSON API** consumed by the frontend (and, for public endpoints, anonymous visitors).
- **Socket.io** for real-time bidirectional event delivery.
- Public **Open-Meteo** weather proxied through the backend.

![Component perspective] A three-tier architecture: Browser (React SPA) ⇄ Express API + Socket.io ⇄ MongoDB (with 2dsphere index).

### 2.2 Product Functions (High Level)

1. **Authentication & Account Management** — register, login, password reset, OAuth (Google/GitHub where configured), JWT sessions, CSRF defense, profile/notification-preference management.
2. **Request Management** — create, read, update, delete, claim/unclaim, comment, attach files, and track relief requests with full audit logging.
3. **Resource Management** — inventory CRUD, allocation/deallocation to requests, automatic availability status, and geospatial resource-to-request matching.
4. **Zone & Incident Management** — administer disaster zones and incidents with severity, status, disaster type, and coverage analysis.
5. **Real-Time Coordination** — Socket.io events for requests, resources, SOS, chat, and escalation; per-request chat rooms.
6. **SOS Emergency Broadcast** — one-tap alert emission with duplicate suppression and admin acknowledge/resolve lifecycle.
7. **Scheduling** — volunteer shift scheduling per zone with status transitions.
8. **Geofencing** — check which zones/requests/resources lie within a radius of a given coordinate.
9. **Weather** — current and forecast weather proxied from Open-Meteo with caching.
10. **Feedback & Escalation** — post-fulfillment feedback (rating/scoring) and admin escalation of unresolved requests.
11. **Bulk Data Operations** — CSV/JSON export and validated bulk import of requests and resources by admins.
12. **Administration** — platform statistics, user management (role change/delete), demo data seeding.
13. **Public Dashboard** — anonymous overview of live disaster/relief status.
14. **Localization & Theming** — 10 languages incl. RTL Urdu; dark/light/neon themes, emergency mode, high-contrast mode.

### 2.3 User Classes and Characteristics

| Class | Description | Typical Needs |
|---|---|---|
| **Anonymous visitor** | Unauthenticated user | View public status page; register/log in |
| **Volunteer** | Individual relief worker | View/claim requests, add resources, chat, schedule shifts, send SOS |
| **NGO** | Organization representative | Same as volunteer plus create/manage organization resources and requests |
| **Administrator** | Government/coordinator role | Full CRUD on zones, incidents, users, escalation, bulk data, SOS lifecycle, platform analytics |

Roles are `volunteer`, `ngo`, and `admin`. The `admin` role is not obtainable via self-registration; admin accounts are seeded from environment variables or promoted by another admin.

### 2.4 Operating Environment

| Item | Requirement |
|---|---|
| **Server runtime** | Node.js ≥ 18 (engines field enforced) |
| **Database** | MongoDB (MongoDB Atlas / Docker), with 2dsphere geospatial and text indexes |
| **Frontend** | React 18 + TypeScript ~5.6 + Vite; served statically by the Express app in production |
| **Browsers** | Modern evergreen browsers (Chrome, Edge, Firefox, Safari) with PWA support |
| **HTTPS** | Mandatory in production (CSP `upgradeInsecureRequests`) |
| **Deployment** | Docker (multi-stage), Render (render.yaml), optional Vercel frontend |

### 2.5 Design and Implementation Constraints

**C-1 (Tech stack):** The system must be built using the MERN stack as defined in `README.md`.

**C-2 (Security defaults):** All routes must apply rate limiting; all inputs must be Joi-validated and XSS-sanitized; password hashing must use bcrypt with a cost factor of ≥ 10; JWT secret must be ≥ 32 characters.

**C-3 (Geospatial correctness):** All location-bearing entities (requests, resources, zones, incidents, SOS alerts) must maintain a GeoJSON `location` field with a 2dsphere index.

**C-4 (Real-time contract):** Real-time events must be delivered over Socket.io using the event names documented in Section 3; socket connections must be JWT-authenticated.

**C-5 (Compatibility):** The frontend must remain a bilingual-first, responsive, PWA-installable application.

### 2.6 User Documentation

Expected deliverables: user guide, admin operations manual, API reference (OpenAPI if generated), deployment guide, and onboarding help text within the UI.

### 2.7 Assumptions and Dependencies

**A-1:** MongoDB connectivity is available; the app retries connection up to 5 times with delay before failing startup.

**A-2:** Reliable network availability in normal operations; offline behavior is best-effort via PWA caching (no offline write-back guarantee beyond the mutation queue).

**A-3:** Weather data is provided by the free Open-Meteo API; no API key required.

**A-4:** OAuth providers (Google/GitHub) are optional; the system must function without them (`501`/discrete degradation when unconfigured).

**A-5:** Email delivery uses, in priority order: Resend API → SMTP (nodemailer) → console fallback.

### 2.8 Apportioning of Requirements

- **Must have (v1.0):** authentication, requests, resources, zones, incidents, SOS, chat, admin, security controls.
- **Should have (v1.x):** geofencing subscriptions, resource matching, escalation, feedback, schedules.
- **Could have (future):** SMS/WhatsApp gateways, NDRF/NDMA feeds, native apps.

---

## 3. Specific Requirements

### 3.1 External Interface Requirements

#### 3.1.1 User Interfaces (UI)

**UI-1 (Responsive layout):** The UI must render correctly on desktop and mobile viewports. Each authenticated page must share a common layout with navigation, notification bell, SOS floating action button, theme/language controls, and user menu.

**UI-2 (Map interface):** GIS views (Map Overview, Zone Heatmap, Request location picker) must use Leaflet with OpenStreetMap tiles and support locating an incident, drawing zones, and "use my location" (geolocation API).

**UI-3 (Form experience):** Multi-step forms (e.g., create/edit request) with draft autosave/restore; inline validation with `role="alert"` error messages.

**UI-4 (Themes):** Dark (default), light, and neon ("premium") themes, plus emergency-mode and high-contrast overrides, applied pre-paint via `theme-init.js` and persisted in `localStorage`.

**UI-5 (Localization):** UI copy must be available in the 10 supported languages; RTL layout must activate for Urdu (`dir="rtl"`).

**UI-6 (PWA):** The app must be installable (manifest), load offline via service worker caching, and clear caches on logout.

**UI-7 (Accessibility):** Keyboard navigation, focus traps on dialogs, ARIA roles/labels, reduced-motion support.

#### 3.1.2 Hardware Interfaces

None beyond standard server infrastructure, mobile device sensors (geolocation), and file upload storage.

#### 3.1.3 Software Interfaces

| Interface | Description |
|---|---|
| MongoDB | Mongoose ODM; 2dsphere + text indexes |
| Open-Meteo | HTTPS weather REST API proxied by backend |
| OSM / Nominatim | Map tiles and geocoding in the browser |
| Resend / SMTP | Transactional email (password reset) |
| Google / GitHub OAuth | Optional social login via Passport.js |
| Socket.io | Real-time transport (same origin, CORS-allowlisted) |

#### 3.1.4 Communications Interfaces

- **REST/JSON** over HTTPS for all API traffic.
- **WebSocket** for Socket.io events.
- HTTP responses use a consistent envelope: success `{ success: true, data, meta }`; failure `{ success: false, error, code }`.

### 3.2 Functional Requirements

Functional requirements are grouped by subsystem. Priorities use MoSCoW (Must/Should/Could).

#### FR-AUTH — Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-1 | The system shall allow a visitor to register as a `volunteer` or `ngo` by providing email, display name, and a password (6–128 characters). | Must |
| FR-AUTH-2 | The system shall reject self-registration with role `admin`. | Must |
| FR-AUTH-3 | The system shall allow password login and return a JWT (HS256, 24 h) plus a single-use CSRF token. | Must |
| FR-AUTH-4 | The system shall lock login for an email after 10 failed attempts within 15 minutes (429). | Must |
| FR-AUTH-5 | `forgot-password` shall always return 200 (regardless of account existence) to prevent email enumeration, and e-mail a 1-hour reset token (DB + in-memory). | Must |
| FR-AUTH-6 | `reset-password` shall consume the token and fail with generic 400 on invalid/expired tokens. | Must |
| FR-AUTH-7 | The system shall support token refresh, extending session validity between 1 hour and 7 days. | Must |
| FR-AUTH-8 | When OAuth (Google/GitHub) is configured, the system shall authenticate users via Passport and auto-provision new users as `volunteer`. When unconfigured, it shall degrade gracefully (501). | Should |
| FR-AUTH-9 | Protected endpoints shall require a valid Bearer JWT; admin endpoints shall additionally require role `admin`. | Must |
| FR-AUTH-10 | The client shall auto-refresh the JWT when expiring within 5 minutes, warn the user at 9 minutes idle, and log out at 10 minutes idle. | Should |
| FR-AUTH-11 | The system shall allow a user to update profile (display name, phone, avatar, skills — Medical/Rescue/Logistics/Communication/Shelter/Food/Other) and change password only after verifying the current password. | Must |
| FR-AUTH-12 | The system shall allow reading/updating notification preferences (email, SMS). | Could |

#### FR-USER — User Profiles

| ID | Requirement | Priority |
|---|---|---|
| FR-USER-1 | Users shall have a profile view exposing display name, role, skills, phone, avatar, and registration metadata. | Must |
| FR-USER-2 | Skills listed on a profile shall use the system skill enum. | Must |
| FR-USER-3 | The system shall never return password hashes to clients. | Must |

#### FR-REQ — Request Management

| ID | Requirement | Priority |
|---|---|---|
| FR-REQ-1 | An authenticated user shall create a request with title, description, category (16-value enum), priority (Critical/High/Medium/Low), location (lat/lng), optional location name, and people count. | Must |
| FR-REQ-2 | All requests shall maintain a GeoJSON location and be searchable by a text index on title/description/locationName. | Must |
| FR-REQ-3 | The owner (or admin) shall update a request; status and priority changes shall append audit-log entries. | Must |
| FR-REQ-4 | The owner (or admin) shall delete a request. | Must |
| FR-REQ-5 | A user (except the owner) shall atomically claim an open request, moving it to `In Progress`; only the claimer or admin may unclaim (returns to `Open`). | Must |
| FR-REQ-6 | The system shall support statuses: `Open`, `Pending`, `In Progress`, `Resolved`, `Fulfilled`. | Must |
| FR-REQ-7 | Users shall add comments to a request; comments are editable for 5 minutes (by author) or anytime by admin, and deletable by author/admin. | Should |
| FR-REQ-8 | The owner (or admin) shall attach up to 5 files (image/PDF/Word, ≤ 10 MB) to a request and remove them. | Should |
| FR-REQ-9 | Uploads shall only be served to authenticated users (JWT in header or query). | Must |
| FR-REQ-10 | The audit log shall be capped at the most recent 100 entries per request. | Should |
| FR-REQ-11 | The system shall emit `request:created`, `request:updated`, `request:deleted`, and `request:commented` real-time events to connected clients. | Must |
| FR-REQ-12 | The requests list shall support pagination and filtering by status/category/priority/search, plus a summary aggregate (byStatus/byPriority/byCategory, last 30 days). | Must |

#### FR-RES — Resource Management

| ID | Requirement | Priority |
|---|---|---|
| FR-RES-1 | An authenticated user shall create a resource with name, category, quantity, unit, location, and notes. | Must |
| FR-RES-2 | Resource status shall be derived automatically from quantity: `Depleted` at 0, `Low` below a threshold, otherwise `Available`; explicit statuses also permitted (Available/Low/Depleted/Reserved/In Transit/Low Stock/Deployed/Maintenance). | Must |
| FR-RES-3 | The owner (or admin) shall update/delete a resource. | Must |
| FR-RES-4 | A user shall allocate a resource (quantity + guards against over-allocation) to a request; deallocation shall restore quantity and recompute status. | Must |
| FR-RES-5 | The system shall provide matching of resources to a request by category and proximity (≤ 100 km), scoring `categoryMatch*0.6 + distanceScore*0.4`, returning top 10. | Should |
| FR-RES-6 | The system shall emit `resource:created` and `resource:allocated` real-time events. | Should |
| FR-RES-7 | The resources list shall support filtering and category/status summary rollups. | Must |

#### FR-ZONE — Zones & GIS Coverage

| ID | Requirement | Priority |
|---|---|---|
| FR-ZONE-1 | An admin shall create, update, and delete zones with name, center (lat/lng), radius (1–500 km), severity (Critical/High/Medium/Low), status (Active/Monitoring/Resolved/Closed), disaster type, and affected population. | Must |
| FR-ZONE-2 | The system shall auto-sync each zone's GeoJSON location from its center coordinates on save. | Must |
| FR-ZONE-3 | The system shall compute per-zone stats — requests and resources within radius (2dsphere + haversine fallback) — and a `coverageStatus` of `Covered`/`Partial`/`Gap`. | Should |
| FR-ZONE-4 | The system shall expose a heatmap view of active/monitoring zones with open-request counts, resource totals, and coverage gaps. | Should |
| FR-ZONE-5 | Zone names/descriptions shall support text search. | Could |

#### FR-INC — Incident Management

| ID | Requirement | Priority |
|---|---|---|
| FR-INC-1 | An admin shall create an incident with name, description (≤ 5000 chars), disaster type, severity, status, linked zones, dates, affected population, and center location. | Must |
| FR-INC-2 | An admin shall update incident fields (audit-logged with field-change details) and delete incidents. | Must |
| FR-INC-3 | Each incident shall present aggregated request/resource data for its linked zones. | Should |
| FR-INC-4 | Incidents shall be listable/filterable with a detail view. | Must |

#### FR-SOS — SOS Emergency Broadcast

| ID | Requirement | Priority |
|---|---|---|
| FR-SOS-1 | An authenticated user shall broadcast an SOS alert with optional message and location (lat/lng). | Must |
| FR-SOS-2 | The system shall suppress duplicate SOS from the same user within 5 minutes and ±0.01° of the previous location. | Must |
| FR-SOS-3 | Each SOS shall store a denormalized snapshot of the user name and optional zone association. | Must |
| FR-SOS-4 | On creation the system shall emit a `sos:alert` event to all connected clients. | Must |
| FR-SOS-5 | SOS lifecycle: `active` → `acknowledged` (admin, records who/when) → `resolved` (admin). | Must |
| FR-SOS-6 | SOS broadcasts shall be rate-limited at 5 per minute per user. | Must |
| FR-SOS-7 | SOS alerts shall be listable/filterable by status. | Must |

#### FR-CHAT — Real-Time Messaging

| ID | Requirement | Priority |
|---|---|---|
| FR-CHAT-1 | Authenticated users shall retrieve paginated chat messages for a request (reverse chronological). | Must |
| FR-CHAT-2 | Authenticated users shall send a message (≤ 2000 chars) to a request's chat room. | Must |
| FR-CHAT-3 | The system shall emit `chat:message` only to sockets joined to room `chat:<requestId>`. | Must |
| FR-CHAT-4 | The author (or admin) shall delete a message. | Must |
| FR-CHAT-5 | Chat messages shall expire automatically after 90 days (TTL index). | Should |
| FR-CHAT-6 | System/SOS type messages may be produced by server processes (system events). | Could |

#### FR-SCHED — Volunteer Scheduling

| ID | Requirement | Priority |
|---|---|---|
| FR-SCHED-1 | A user shall create a schedule for self (admin may assign any user), with start/end dates, zone, shift (Morning/Afternoon/Night/Full Day), skills, and status (Scheduled/Active/Completed/Cancelled). | Should |
| FR-SCHED-2 | Only the owner (or admin) shall update or delete a schedule; deletion emits `schedule:deleted`. | Should |
| FR-SCHED-3 | Schedules shall be listable and filterable by user, zone, status, and date range. | Should |

#### FR-FEED — Feedback & Delivery Confirmation

| ID | Requirement | Priority |
|---|---|---|
| FR-FEED-1 | A user shall submit feedback for a request: rating 1–5, optional comment, and optional `deliveryConfirmed`. | Should |
| FR-FEED-2 | The system shall enforce one feedback (unique) per user per request. | Should |
| FR-FEED-3 | Confirming delivery shall mark the request `Fulfilled`. | Should |
| FR-FEED-4 | The system shall expose aggregate feedback stats (average rating, delivery confirmations). | Should |

#### FR-ESC — Escalations

| ID | Requirement | Priority |
|---|---|---|
| FR-ESC-1 | An admin shall escalate a request with a mandatory reason, setting `escalated/escalatedAt/escalationReason` and emitting `request:escalated`. | Should |
| FR-ESC-2 | An admin shall list escalated requests (sorted by escalation time). | Should |
| FR-ESC-3 | An admin shall de-escalate a request, clearing escalation flags. | Should |

#### FR-GEOF — Geofencing

| ID | Requirement | Priority |
|---|---|---|
| FR-GEOF-1 | An authenticated user shall query zones, requests, and resources within a radius (0.1–500 km) of a coordinate, each returning computed distance. | Should |
| FR-GEOF-2 | The client may subscribe a geofence (lat/lng/radius) over Socket.io for live updates. | Could |

#### FR-WX — Weather Integration

| ID | Requirement | Priority |
|---|---|---|
| FR-WX-1 | The system shall proxy current weather (temperature, feels-like, humidity, precipitation, wind, gusts, WMO code + human-readable conditions) from Open-Meteo given lat/lng. | Must |
| FR-WX-2 | The system shall cache weather responses for 5 minutes per coordinate. | Should |
| FR-WX-3 | Weather validation: lat ∈ [−90, 90], lng ∈ [−180, 180]; upstream failure → informative 502 `UPSTREAM_ERROR`. | Must |
| FR-WX-4 | Weather endpoints are public and rate-limited by IP. | Should |

#### FR-BULK — Bulk Import / Export

| ID | Requirement | Priority |
|---|---|---|
| FR-BULK-1 | An admin shall export all requests or resources to CSV (formula-injection protected). | Should |
| FR-BULK-2 | An admin shall import 1–1000 request/resource rows with per-row validation, returning `{ imported, errors: [{row, errors}] }`. | Should |
| FR-BULK-3 | Resource import shall derive status from quantity automatically. | Should |
| FR-BULK-4 | An admin shall export requests as JSON or CSV with populated creator/claimer info. | Should |

#### FR-PUB — Public Dashboard

| ID | Requirement | Priority |
|---|---|---|
| FR-PUB-1 | Anonymous visitors shall view an overview with active requests, total/deployed/available resources, zone count, active incidents, active SOS count, and status breakdown. | Should |
| FR-PUB-2 | The public endpoint must not leak personally identifiable request details. | Must |

#### FR-ADMIN — Administrative Functions

| ID | Requirement | Priority |
|---|---|---|
| FR-ADMIN-1 | An admin shall view platform statistics (users, requests by status/category/priority, daily activity, last 30 days). | Must |
| FR-ADMIN-2 | An admin shall list users (paginated), change a user's role, and delete a user (with cascade cleanup; self-deletion prohibited). | Must |
| FR-ADMIN-3 | An admin shall delete any request (with its chat messages). | Must |
| FR-ADMIN-4 | An admin shall trigger demo-data seeding. | Could |
| FR-ADMIN-5 | The admin dashboard shall show the same real-time events as other roles. | Should |

#### FR-RT — Real-Time Event Contract

| ID | Requirement | Priority |
|---|---|---|
| FR-RT-1 | Socket.io connections must be authenticated via JWT in the handshake; unauthenticated sockets must be rejected. | Must |
| FR-RT-2 | The client shall emit `chat:join`/`chat:leave` to join/leave `chat:<requestId>` rooms, and `geofencing:subscribe` with validated coordinates. | Must |
| FR-RT-3 | The server shall emit exactly the documented event names: `sos:alert`, `request:created/updated/deleted/commented/escalated`, `resource:created/allocated`, `chat:message`, `schedule:deleted`. | Must |
| FR-RT-4 | Client notifications for real-time events shall be persisted (max 50) in `localStorage`. | Should |

#### FR-SYS — System Functions

| ID | Requirement | Priority |
|---|---|---|
| FR-SYS-1 | The system shall expose `GET /health` returning `{ ok, uptime, db }` and `GET /api/version` returning version/commit/node/env. | Must |
| FR-SYS-2 | The system shall ingest client-side error reports via `POST /api/log`, rate-limited at 10/min. | Should |
| FR-SYS-3 | The client keepalive shall ping `/health` every 5 minutes to keep the free-tier server warm. | Should |
| FR-SYS-4 | Admin & coordinator seeding: first admin is seeded from env (`ADMIN_EMAIL`/`ADMIN_PASSWORD`). | Must |

### 3.3 Non-Functional Requirements

#### NFR-SEC — Security

| ID | Requirement | Priority |
|---|---|---|
| NFR-SEC-1 | Passwords shall be hashed with bcrypt (cost ≥ 10) and never stored or logged in plaintext. | Must |
| NFR-SEC-2 | JWT signing secret must be ≥ 32 characters and supplied via environment only. | Must |
| NFR-SEC-3 | All API traffic in production must be HTTPS; CSP shall include `upgradeInsecureRequests`. | Must |
| NFR-SEC-4 | Helmet CSP with strict directives; CORS with an explicit allowlist (credentials) rejecting disallowed origins. | Must |
| NFR-SEC-5 | All input to body/query/params shall pass the global sanitizer (XSS scrub: script/event-handler/iframe/etc.). | Must |
| NFR-SEC-6 | All inputs shall be validated by Joi schemas before persistence. | Must |
| NFR-SEC-7 | Rate limiting on every route group (auth 20/15 min, per-user route arrays, SOS 5/min, bulk 5/15 min, etc.). | Must |
| NFR-SEC-8 | File uploads restricted by MIME/extension allowlist and 10 MB size; served only to authenticated users. | Must |
| NFR-SEC-9 | CSV exports must guard against formula injection (`= + - @ |` prefixed with `'`). | Must |
| NFR-SEC-10 | Firebase-style error ingestion must not expose stack traces to clients (development-only logging). | Must |
| NFR-SEC-11 | Authentication rate-limit and lockout behavior must prevent credential stuffing. | Must |

#### NFR-PERF — Performance

| ID | Requirement | Priority |
|---|---|---|
| NFR-PERF-1 | List endpoints shall return data within 2 s for typical dataset sizes and support server-side pagination. | Must |
| NFR-PERF-2 | Geospatial queries must use 2dsphere indexes with documented haversine fallback for resilience. | Must |
| NFR-PERF-3 | Weather responses shall be served from cache (5 min TTL) where available. | Should |
| NFR-PERF-4 | The frontend build shall apply code splitting (dependency-level manual chunks) and lazy-load i18n locales. | Should |
| NFR-PERF-5 | Gzip/compression enabled on the API. | Should |
| NFR-PERF-6 | Startup must retry DB connection up to 5 times (5 s delay) before failing. | Should |

#### NFR-REL — Reliability

| ID | Requirement | Priority |
|---|---|---|
| NFR-REL-1 | Claim/allocation operations must be atomic (guards against double-claiming/over-allocation). | Must |
| NFR-REL-2 | The app must degrade gracefully when MongoDB is disconnected (health reports `disconnected`). | Should |
| NFR-REL-3 | Chat and real-time events must tolerate transient socket reconnects (reconnect when auth token changes). | Should |

#### NFR-AVAIL — Availability

| ID | Requirement | Priority |
|---|---|---|
| NFR-AVAIL-1 | The service shall target 99% uptime on hosted infrastructure, with documented cold-start mitigation (keepalive + external uptime monitor). | Should |

#### NFR-I18N — Internationalization & Localization

| ID | Requirement | Priority |
|---|---|---|
| NFR-I18N-1 | UI strings shall be managed via i18next with lazy-loaded locale files (initially English). | Must |
| NFR-I18N-2 | Supported languages: English plus at least 9 Indian languages, including RTL support for Urdu. | Must |
| NFR-I18N-3 | Locale files shall remain in sync (synchronization script maintained). | Should |

#### NFR-PWA — Offline & Progressive Web App

| ID | Requirement | Priority |
|---|---|---|
| NFR-PWA-1 | The app must be installable with a manifest and a service worker implementing static/dynamic/API cache strategies. | Should |
| NFR-PWA-2 | The service worker shall queue offline mutations and retry with a 10 s fetch timeout. | Could |
| NFR-PWA-3 | Cache must be cleared on logout to prevent cross-account data exposure. | Must |

#### NFR-ACC — Accessibility

| ID | Requirement | Priority |
|---|---|---|
| NFR-ACC-1 | Interactive elements shall have ARIA labels; dialogs shall trap focus; valid `role=alert/alertdialog` used for warnings. | Should |
| NFR-ACC-2 | Motion animations shall respect `prefers-reduced-motion`. | Should |
| NFR-ACC-3 | High-contrast mode and emergency mode shall be available. | Should |
| NFR-ACC-4 | All pages shall be keyboard-navigable. | Should |

#### NFR-COMP — Compatibility

| ID | Requirement | Priority |
|---|---|---|
| NFR-COMP-1 | Browser support: latest two versions of Chrome, Edge, Firefox, Safari. | Must |
| NFR-COMP-2 | Node.js runtime ≥ 18. | Must |
| NFR-COMP-3 | No dependency on native OS-specific behavior; runs identically on Windows/Linux (Docker). | Should |

#### NFR-DATA — Data Lifecycle

| ID | Requirement | Priority |
|---|---|---|
| NFR-DATA-1 | Chat messages shall be retained 90 days (TTL index). | Should |
| NFR-DATA-2 | Password reset tokens shall expire after 1 hour (TTL index). | Must |
| NFR-DATA-3 | All time-stamped documents shall record `createdAt`/`updatedAt` (Mongoose timestamps). | Must |
| NFR-DATA-4 | Request audit logs capped at 100 entries. | Should |

#### NFR-OPS — Operability & Deployment

| ID | Requirement | Priority |
|---|---|---|
| NFR-OPS-1 | Deployment shall be reproducible via Docker Compose and/or Render blueprints with persisted secrets. | Must |
| NFR-OPS-2 | Environment configuration shall be validated at startup (Joi env schema); invalid config aborts boot. | Must |
| NFR-OPS-3 | Structured JSON logging with configurable log level. | Should |
| NFR-OPS-4 | Healthcheck endpoints for container orchestration. | Should |

#### NFR-MAINT — Maintainability & Testing

| ID | Requirement | Priority |
|---|---|---|
| NFR-MAINT-1 | Automated tests: backend integration (Vitest + Supertest + mocked/embedded Mongo), frontend component tests, accessibility tests, and end-to-end tests (Playwright). | Should |
| NFR-MAINT-2 | The codebase shall remain a clean monorepo split into `client/` and `server/`. | Must |
| NFR-MAINT-3 | Shared schemas (enums) must be consistent across models (e.g., category enums). | Must |

### 3.4 Standards Compliance

- **IEEE 830-1998** — structure of this document.
- **OWASP Top 10 (2021)** — applied via CSP, input validation/sanitization, rate limiting, secure auth, and upload controls.
- **WCAG 2.1 AA (target)** — accessibility requirements above.
- **GeoJSON (RFC 7946)** — location data representation.
- **MongoDB Geospatial Queries** — 2dsphere semantics.

---

## 4. Verification Matrix

Each requirement in Section 3 should be traceable to a design artifact and a test. The following is the high-level traceability for key subsystems (full per-ID matrix maintained in the project tracker).

| Subsystem | Requirement IDs | Design Location | Test Location |
|---|---|---|---|
| Auth | FR-AUTH-*, NFR-SEC-* | `server/src/routes/auth.js`, `server/src/middleware/auth.js` | `server/src/__tests__/api.test.js` |
| Requests | FR-REQ-* | `server/src/routes/requests.js`, `server/src/models/Request.js` | `server/src/__tests__/summary.test.js` |
| Resources | FR-RES-* | `server/src/routes/resources.js` | `server/src/__tests__/*` |
| Zones/Incidents | FR-ZONE-*, FR-INC-* | `server/src/routes/{zones,incidents}.js` | `server/src/__tests__/*` |
| SOS | FR-SOS-* | `server/src/routes/sos.js` | `server/src/__tests__/*` |
| Chat | FR-CHAT-* | `server/src/routes/chat.js`, `server/src/index.js` (rooms) | `client/e2e/*` |
| Public | FR-PUB-* | `server/src/routes/public.js` | `server/src/__tests__/api.test.js` |
| Weather | FR-WX-* | `server/src/routes/weather.js` | `server/src/__tests__/*` |
| Bulk | FR-BULK-* | `server/src/routes/bulk.js`, `server/src/utils/csv.js` | `server/src/__tests__/*` |
| Frontend pages | UI-* | `client/src/pages/*`, `client/src/App.tsx` | `client/src/__tests__/*`, `client/e2e/*` |
| Error/auth constraints | NFR-SEC-* | `server/src/app.js`, `server/src/middleware/*` | `server/src/__tests__/sanitize.test.js`, `rateLimitUser.test.js` |

### 4.1 Acceptance Criteria (Summary)

The system is accepted when:

1. All **Must** requirements are implemented and satisfied by passing automated tests.
2. `npm test` (server + client) and Playwright e2e suites pass.
3. Security requirements NFR-SEC-1..11 are verified (no plaintext credentials, no XSS vectors in validated inputs, rate limits enforced).
4. The deployment (Render + MongoDB) runs continuously with `/health` reporting `db: connected`.
5. Bilingual/RTL and theme requirements are demonstrable in a production environment.

---

## 5. Appendix

### 5.1 Source-Evidence Base

This SRS was derived from static inspection of the following artifacts:

- `server/src/models/*.js` — schema field definitions and enums.
- `server/src/routes/*.js` — endpoint contracts, auth requirements, per-route rate limits, socket events.
- `server/src/app.js`, `server/src/index.js`, `server/src/config/*.js` — security middleware, CORS/CSP, socket auth.
- `server/src/middleware/*.js` — auth, sanitization, rate limiting, validation.
- `client/src/App.tsx`, `client/src/api/client.ts`, `client/src/context/*`, `client/src/pages/*` — routes, API surface, global state, UI behavior.
- `client/public/sw.js`, `public/manifest.json` — PWA behavior.
- `README.md`, `TODO.md`, `DESIGN_SYSTEM.md`, `UI-UX-DESIGN.md` — product context.

### 5.2 Open Items

1. The PRD (`PRODUCT REQUIREMENTS DOCUMENT DRCP.pdf`) could not be machine-read during authoring; verify Section 2.1 and any client-specific goals against it manually.
2. Confirm production performance/availability SLAs (targets are assumed in NFR-AVAIL).
3. Confirm which exclusions in Section 1.2 (e.g., SMS gateway) are intentionally deferred.

---

*End of SRS*