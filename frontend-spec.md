# FRONTEND-SPEC.md — Domestic Services Platform Frontend Specification

Comprehensive specifications for the frontend single-page application connecting customers with Addis Ababa domestic-service providers (plumbers, electricians, dish installers, painters, appliance repair, clothes washing).

---

## 1. Stack & Architecture

- **Build Tool & Framework:** Vite + React 18+ (ES Modules)
- **Data Fetching & Cache:** TanStack Query (React Query v5)
- **Client State Management:** Zustand (Auth session, global search filters, call modals, review drawer)
- **Component UI Library:** shadcn/ui (Radix UI primitives) + Lucide React icons
- **Styling & CSS:** Tailwind CSS v3 with CSS variables for dynamic theming
- **Animations:** Framer Motion (page transitions, scroll reveal, dialog/drawer animations, micro-interactions)
- **Form Handling & Validation:** React Hook Form + Zod (mirroring backend schemas)
- **HTTP Client:** Axios or native `fetch` with token refresh interceptor & CSRF synchronization
- **Routing:** React Router v6 with role-guarded route trees (`/`, `/provider/*`, `/admin/*`)
- **Typography:** Google Fonts:
  - **Headings & Display:** *Plus Jakarta Sans* (SemiBold 600, Bold 700, ExtraBold 800)
  - **Body & UI Elements:** *Inter* (Regular 400, Medium 500, SemiBold 600)

---

## 2. Design System & Theme

Inspired by Thumbtack’s modern, clean, high-conversion marketplace layout, adapted with an Addis Ababa warm, trustworthy aesthetic.

### 2.1 Color Palette (CSS Variables)
- **Primary (Forest Green):** `hsl(158, 64%, 22%)` — evokes trust, stability, reliability.
- **Primary Foreground:** `hsl(0, 0%, 100%)`
- **Secondary / Accent (Warm Amber):** `hsl(38, 92%, 50%)` — star ratings, action highlights, availability badges.
- **Background:** `hsl(40, 20%, 99%)` — warm off-white / canvas.
- **Card / Surface:** `hsl(0, 0%, 100%)` with subtle shadows (`shadow-sm`, `hover:shadow-md`).
- **Muted / Slate:** `hsl(215, 16%, 47%)` for secondary metadata and icons.
- **Destructive:** `hsl(0, 72%, 51%)` for rejections, suspensions, and review deletions.

### 2.2 Micro-Interactions & Optimistic Patterns
- **Call-to-Action:** Tapping "Call Provider" opens a mobile bottom sheet / desktop dialog showing phone number, one-tap `tel:` dialer link, and copy button, while firing `POST /api/leads/call` in the background.
- **Availability Toggle:** Instant optimistic toggle with rollback on network failure.
- **Skeleton Screens:** Shimmering skeletons matching exact card layout during category/provider fetching.
- **Scroll Animations:** Gentle fade-up and staggered grid item entrances powered by Framer Motion.

### 2.3 Spacious Visual Hierarchy & Graphic Touches (Anti-Clutter Principle)
- **Generous Whitespace & Breathing Room:** No cramped card grids or walls of text. Sections feature relaxed vertical padding (`py-16` to `py-24` on desktop, `py-10` on mobile), airy card padding (`p-6` to `p-8`), and clean line heights.
- **Graphic Design Details:**
  - Soft ambient background gradients and subtle radial glows behind key hero sections.
  - Category cards feature floating tinted icon bubbles (`bg-primary/10`, `rounded-2xl`) with hover lift effects (`group-hover:-translate-y-1.5 transition-all`).
  - Pill tags and status badges with rounded-full geometries, soft borders, and generous horizontal padding (`px-3.5 py-1`).
  - Tactile buttons with subtle drop shadows and gentle hover elevation.
  - Large touch targets on mobile (minimum 48px height) with ample gap between clickable elements.

---

## 3. Persona Routing & Route Trees

### 3.1 Public Client Routes
- `/` — Homepage: Hero with category search, popular service categories, "How It Works", verified pros banner, customer trust badges.
- `/services` — Services index (grid of all 6 categories with icons and provider counts).
- `/providers` — Search & Filter directory:
  - Filter by category, sub-city, availability (`availableOnly`), keyword query.
  - Sorting: highest rating, most reviews, calls received.
- `/providers/:id` — Provider Detail Profile:
  - Header: Avatar, Name, Category badge, Sub-city/Woreda, Experience years, Verified badge, Availability status.
  - Action Bar: Fixed mobile bottom bar with "Call [Provider Name]".
  - About & Bio section.
  - Work Samples / Portfolio gallery.
  - Reviews & Ratings Summary: Star breakdown, customer review list, "Write a Review" button.

### 3.2 Provider Portal Routes (`/provider/*`)
- `/provider/register` — Multi-step onboarding:
  1. Phone & Password credentials (E.164 normalization feedback).
  2. Professional Profile (Category, Sub-city, Woreda, Bio, Experience).
  3. National ID / Passport document upload (client-side size & type validation, drag-and-drop).
- `/provider/login` — Provider authentication with phone and password.
- `/provider/dashboard` (Guarded):
  - Verification banner (`PENDING`, `APPROVED`, `REJECTED` with reason, `REVOKED`).
  - Availability switch (`Available for Work` badge toggle).
  - Profile statistics (`totalCallsReceived`, rating average, review count).
- `/provider/profile` (Guarded): Edit bio, location, avatar URL, work samples gallery.
- `/provider/documents` (Guarded): Document status view & re-submission workflow when rejected/reopened.
- `/provider/security` (Guarded): Change password, submit & monitor phone change requests.

### 3.3 Customer Modal Auth & Review Experience
- No mandatory customer registration for browsing or calling.
- When tapping "Write a Review" on a provider profile:
  - If authenticated as Customer: Opens the Review Form dialog (Star rating 1–5, text review).
  - If unauthenticated: Opens frictionless Customer Login / Sign-up dialog.
  - Once signed in: Immediately transitions to review submission.

### 3.4 Admin Portal Routes (`/admin/*`)
- `/admin/login` — Secure email + password authentication.
- `/admin/dashboard` (Guarded): Platform KPI stats (Total approved pros, pending verifications, call leads, active reviews).
- `/admin/verifications` (Guarded):
  - Queue of pending provider registrations.
  - Secure signed-URL document viewer (120 s TTL modal with zoom and rotate).
  - Approval / Rejection action with mandatory rejection reason.
- `/admin/providers` (Guarded): Directory management, provider suspension / re-activation with reason tracking, temporary password reset.
- `/admin/reviews` (Guarded): Review moderation queue, reported reviews review, hide/republish actions with audit reason.
- `/admin/phone-requests` (Guarded): Provider phone change requests approval/rejection queue.

---

## 4. API Client & State Architecture

### 4.1 TanStack Query Query Keys
- `['categories']` — Cache 1 hour
- `['locations']` — Cache 1 hour
- `['providers', filters]` — Dynamic query with pagination
- `['provider', id]` — Provider detail profile
- `['provider-reviews', id, page]` — Paginated reviews
- `['provider-me']` — Provider portal self-profile
- `['admin-stats']`, `['admin-verifications']`, `['admin-phone-requests']`, `['admin-reviews']`

### 4.2 Zustand Stores
1. `useAuthStore`: Current user (`id`, `role: 'PUBLIC' | 'PROVIDER' | 'CUSTOMER' | 'ADMIN'`), access token in memory, login/logout handlers.
2. `useSearchStore`: Search term, selected category ID, selected sub-city ID, availability filter, pagination state.
3. `useCallModalStore`: Open/close state, target provider details, call trigger handler.
4. `useReviewModalStore`: Target provider for review, edit review target.

---

## 5. Mobile-First Responsive Breakpoints

- **Mobile (< 640px):** Single column, sticky bottom call bar, slide-up drawers for filters and call action, collapsible search header.
- **Tablet (640px – 1024px):** 2-column provider grid, horizontal category pill scroll, top navigation bar.
- **Desktop (> 1024px):** 3-column provider grid, sticky sidebar search filters, rich desktop modals, high-density admin tables.

---

## 6. Error Handling & Fallback Strategy

- **Global Error Boundary:** Catches unhandled React render errors with a friendly "Something went wrong" recovery page.
- **Route 404 Fallback:** Branded page with quick links back to homepage and search.
- **API Error Notification:** Centralized toast notifications mapping backend `AppError` error codes (`DUPLICATE_PHONE`, `INVALID_CREDENTIALS`, `RATE_LIMIT_EXCEEDED`, etc.) to helpful user messages.
- **Offline / Network Reconnect Banner:** TanStack Query online/offline status indicator.
