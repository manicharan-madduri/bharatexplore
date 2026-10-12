# BharatExplore — Discover Incredible India

**BharatExplore** is a full-stack Indian tourism discovery and itinerary-planning web application built with **React 18 + Vite 5**, **Spring Boot 3.2.3 (Java 17)**, and **MySQL 8**.

It covers all **36 States and Union Territories of India** (28 States and 8 Union Territories) and **720 ranked destinations** (Top 20 per State/UT), pairing curated photography with transparent visitation verification metadata (`VERIFIED` and `UNRESOLVED` records with source citations).

> **Deployment Status:** This project is developed, hardened, and verified in a local environment (`localhost`). It has **not yet been deployed to a live production environment**.

---

## 1. Architecture & Ports

| Component | Technology | Default Local Port | Directory |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18.2, Vite 5, React Router 6, Axios, Lucide React, CSS3 | `5173` (`http://localhost:5173`) | `frontend/` |
| **Backend API** | Java 17, Spring Boot 3.2.3, Spring Security, Spring Data JPA, JJWT 0.12.5 | `8082` (`http://localhost:8082`) | `backend/` |
| **Database** | MySQL 8.x (`tourismdb`) | `3306` (`localhost:3306`) | MySQL Server |

---

## 2. Core Features

- **Complete Geographic Coverage (`36` States/UTs & `720` Destinations)**:
  - Browse all 28 States and 8 Union Territories by region or category.
  - Explore up to the **Top 20** ranked tourist destinations per State/UT (`Top 3`, `Top 5`, `Top 10`, `Top 15`, or `Top 20` selector).
  - Switch between **Grid View** and an interactive **Accordion View** (horizontal expansion on desktop, smooth vertical expansion on mobile, with reduced-motion and keyboard support).
  - Honest verification labels distinguishing `VERIFIED` records from `UNRESOLVED` records alongside Wikimedia Commons and official tourism portal links.
- **Instant Search & Category Browser**:
  - Real-time keyboard-navigable autocomplete matching States/UTs (including aliases), 8 umbrella category groups (plus mapped subcategories), and destination names.
- **Authentication & Guest Mode**:
  - Welcome gate supporting **Sign In**, **Create Account**, and **Continue as Guest**.
  - Stateless JWT authentication delivered via `HttpOnly` cookies (with configurable `Secure` and `SameSite` attributes, credential-fingerprint invalidation on password change/reset, and immediate rejection of deactivated accounts).
  - Safe post-authentication redirect resolution that preserves deep links while blocking open-redirect vectors.
  - Account management: profile updates, password change, password reset flow, reversible account deactivation, and permanent account deletion.
- **Favorites & Multi-Day Trips**:
  - Save favorite destinations and build custom multi-day trips (1–14 days, day assignment, stop reordering, and custom notes).
  - Isolated per-user `localStorage` keys (`bharatExplore_favorites_user_<id>`, `bharatExplore_trips_user_<id>`) and guest keys (`bharatExplore_favorites_guest`, `bharatExplore_trips_guest`).
  - Automatic, deduplicated merge of guest Favorites and Trips into the user's account upon login, and automatic cleanup of a deleted account's local storage upon permanent account deletion.
- **Smart Trip Planner**:
  - Generates multi-day itineraries (2–7 days, Relaxed / Balanced / Packed pace) using real destination rankings, category filters, and Haversine distance ordering where GPS coordinates exist (honestly labeling stops without coordinates or fee/duration strings).
- **Settings, Themes & Data Export**:
  - Persistent **Dark** and **Light** themes, default view mode (`grid` / `accordion`), default Top-N limit, and reduced-motion toggle.
  - One-click JSON export of user preferences, saved favorites, and planned trips.

---

## 3. Prerequisites

Ensure the following software is installed on your machine:

- **Java JDK**: `17` or newer (`java -version`)
- **Apache Maven**: `3.9+` (`mvn -version`)
- **Node.js & npm**: Node.js `18+` or `20+` (`node -v`, `npm -v`)
- **MySQL Server**: `8.0+` running on `localhost:3306` with the `tourismdb` database populated (`36` states, `720` destinations).

---

## 4. Environment Configuration

Template files with safe placeholders are provided in both directories:
- Backend template: [`backend/.env.example`](file:///d:/Projects/tourism-india/backend/.env.example)
- Frontend template: [`frontend/.env.example`](file:///d:/Projects/tourism-india/frontend/.env.example)

> **Security Warning:** Frontend variables prefixed with `VITE_` are embedded into the public client JavaScript bundle at build time. **Never** place secrets, JWT signing keys, or database passwords in `frontend/.env*` files.

### Backend Environment Variables (`backend/src/main/resources/application.yml`)

| Variable | Required in `dev`? | Required in `prod`? | Description |
| :--- | :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Optional (defaults to `dev`) | **Yes (`prod`)** | Activates `dev` or `prod` configuration profile. |
| `PORT` | Optional (`8082`) | Optional (`8082`) | HTTP port for the Spring Boot server. |
| `DB_URL` / `SPRING_DATASOURCE_URL` | Optional (defaults to local `tourismdb`) | **Yes** (or via `DB_HOST`/`DB_NAME`) | Full JDBC connection URL for MySQL. |
| `DB_USERNAME` / `SPRING_DATASOURCE_USERNAME` | Optional (local fallback) | **Yes (non-`root`)** | MySQL username. Production startup rejects `root`. |
| `DB_PASSWORD` / `SPRING_DATASOURCE_PASSWORD` | Optional (local fallback) | **Yes** | MySQL password. Must be non-blank in `prod`. |
| `DB_USE_SSL` | Optional (`false` in `dev`) | Optional (`true` in `prod`) | Enables TLS/SSL for MySQL connections. Production rejects `useSSL=false`. |
| `SPRING_JPA_DDL_AUTO` | Optional (`update` in `dev`) | Optional (`validate` in `prod`) | Hibernate schema mode. Production allows only `validate` or `none`; `create` and `create-drop` are blocked in all profiles. |
| `JWT_SECRET_KEY` | Optional (local dev key provided) | **Yes** | Base64-encoded secret key decoding to at least **256 bits (`32` bytes)** for `HS256`. |
| `JWT_EXPIRATION_MS` | Optional (`86400000` = 24h) | Optional (`86400000`) | Standard JWT lifetime in milliseconds (Remember-Me uses 7 days). |
| `JWT_COOKIE_SECURE` | Optional (`false` in `dev`) | Optional (`true` in `prod`) | Sets the `Secure` attribute on the `HttpOnly` `jwt` cookie. |
| `JWT_COOKIE_SAMESITE` | Optional (`Lax`) | Optional (`Lax` / `Strict`) | Sets the `SameSite` attribute on the `jwt` cookie. |
| `CORS_ALLOWED_ORIGINS` | Optional (localhost ports) | **Yes** | Comma-separated list of allowed frontend origins. |
| `APP_FRONTEND_URL` | Optional (`http://localhost:5173`) | **Yes** | Base URL used when constructing password-reset links. |
| `PASSWORD_RESET_LOG_LINK_IN_DEV` | Optional (`true` in `dev`) | Forced `false` in `prod` | Controls dev-only console logging of password-reset links. |
| `RATE_LIMIT_TRUST_FORWARDED_HEADERS` | Optional (`false`) | Optional (`false`) | Set `true` only behind a trusted reverse proxy that overwrites `X-Forwarded-For`. |
| `RATE_LIMIT_LOGIN_MAX` | Optional (`10` / 60s) | Optional (`10` / 60s) | Max login requests per IP per rate-limit window. |
| `RATE_LIMIT_REGISTER_MAX` | Optional (`5` / 60s) | Optional (`5` / 60s) | Max registration requests per IP per rate-limit window. |
| `RATE_LIMIT_FORGOT_PASSWORD_MAX` | Optional (`5` / 60s) | Optional (`5` / 60s) | Max forgot-password requests per IP per rate-limit window. |
| `RATE_LIMIT_RESET_PASSWORD_MAX` | Optional (`5` / 60s) | Optional (`5` / 60s) | Max reset-password requests per IP per rate-limit window. |

### Frontend Environment Variables (`frontend/.env.example`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `/api` | Base URL used by frontend Axios clients (`axiosClient.js` and `AuthContext.jsx`). |
| `VITE_PROXY_TARGET` | `http://localhost:8082` | Target backend origin for Vite's local `/api` dev server proxy (`vite.config.js`). |

### Creating a Dedicated Least-Privilege MySQL User (Recommended)

While local development supports existing local MySQL setups, production deployments **must not** connect as `root` (`DatabaseStartupValidator` enforces this when `SPRING_PROFILES_ACTIVE=prod`). To provision a least-privilege MySQL application user:

```sql
-- Run as a MySQL administrator when preparing a dedicated application account:
CREATE USER 'bharatexplore_app'@'localhost' IDENTIFIED BY 'replace_with_strong_random_password';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON tourismdb.*
  TO 'bharatexplore_app'@'localhost';

FLUSH PRIVILEGES;
```

Then export `DB_USERNAME=bharatexplore_app` and `DB_PASSWORD=<your_password>` before starting the backend.

---

## 5. Starting the Application Locally

### 1. Start the Spring Boot Backend (Port `8082`)

From `backend/`:

```powershell
cd backend
mvn spring-boot:run
```

Verify the backend is healthy:
- Application Health Check: `http://localhost:8082/api/health`
- Actuator Health Check: `http://localhost:8082/actuator/health`
- States API Check: `http://localhost:8082/api/states`

### 2. Start the React + Vite Frontend (Port `5173`)

From `frontend/`:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Vite automatically proxies `/api/*` requests to `http://localhost:8082`.

---

## 6. Running Automated Tests & Production Build

### Backend Unit & Security Regression Tests (JUnit 5 / Mockito)

```powershell
cd backend
mvn test
```

### Frontend Unit & Regression Tests (Node.js Test Runner)

```powershell
cd frontend
npm test -- --run
```

### Frontend Production Bundle Build

```powershell
cd frontend
npm run build
```

The production static assets are generated in `frontend/dist/`.

---

## 7. Known Limitations & Pre-Deployment Requirements

1. **Single-Instance In-Memory Rate Limiting**:
   - Authentication rate limiting (`AuthRateLimitService`) uses a bounded in-memory `ConcurrentHashMap` (`maxTrackedKeys=4096`) within a single JVM process.
   - If the backend is horizontally scaled across multiple instances behind a load balancer, rate limits will apply per instance unless migrated to a shared store (e.g., Redis) or enforced at the API gateway / reverse proxy layer.
2. **Password-Reset Email Delivery**:
   - In local development (`dev` profile), reset links can be logged to the backend console when `PASSWORD_RESET_LOG_LINK_IN_DEV=true`.
   - In production (`prod` profile), console link logging is disabled; an SMTP or transactional email provider must be integrated to deliver password-reset emails to end users.
3. **Client-Side Storage for Favorites, Trips & Preferences**:
   - Saved Favorites, Multi-Day Trips, and UI Settings are persisted in browser `localStorage` (isolated per authenticated user ID or guest session) and can be exported as JSON from the Settings page, rather than being stored in MySQL tables.
4. **External Wikimedia Image Hosting**:
   - Destination and state photographs are loaded directly from Wikimedia Commons URLs (`https://upload.wikimedia.org/...`) and require client internet access.
