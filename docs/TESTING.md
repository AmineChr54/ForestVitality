# Testing Strategy

This document summarizes the automated test approach for the Forest Vitality project — backend **and** frontend.

## Goals

- Verify critical API and security behavior automatically.
- Keep tests deterministic without requiring external cloud services.
- Make coverage easy to understand for project evaluation.

## Test Types

### 1) Unit Tests

Pure logic tests with no I/O or external service dependency.

- Formula correctness and edge cases:
  - `backend/tests/formulas/test_vegetation_formulas.py`
- Role and permission mapping:
  - `backend/tests/security/test_role_mapper.py`
  - `backend/tests/security/test_permission_mapper.py`

### 2) API Smoke & Security Tests

FastAPI endpoint behavior with dependency overrides and mocks.

- Public health endpoints:
  - `backend/tests/test_health_endpoints.py`
- Authentication baseline (protected endpoint rejects unauthenticated requests):
  - `backend/tests/test_health_endpoints.py`
- Sentinel endpoint authorization and happy/error paths:
  - `backend/tests/test_sentinel_controller.py`
- Analysis endpoint behavior and validation:
  - `backend/tests/test_analysis_controller.py`
- Ingestion endpoint behavior including SSE stream contract:
  - `backend/tests/test_ingest_controller.py`
- Municipality lookup/regions/geometry endpoint behavior:
  - `backend/tests/test_municipality_controller.py`
- Log save/read endpoint behavior with OpenSearch mocked:
  - `backend/tests/test_save_log_controller.py`
- Chat endpoint behavior including fallback error UX:
  - `backend/tests/test_chat_controller.py`

## Coverage Matrix (Backend)

| Use Case | Test Type | Automated | File |
|---|---|---|---|
| Service health is publicly reachable | API smoke | Yes | `backend/tests/test_health_endpoints.py` |
| OpenSearch health contract (`cluster_name`) | API smoke | Yes | `backend/tests/test_health_endpoints.py` |
| Protected endpoint blocks unauthenticated access | API security | Yes | `backend/tests/test_health_endpoints.py` |
| Sentinel fetch with valid permission returns data | API integration (mocked external) | Yes | `backend/tests/test_sentinel_controller.py` |
| Sentinel fetch returns expected error when provider is empty | API integration (mocked external) | Yes | `backend/tests/test_sentinel_controller.py` |
| Sentinel fetch returns 403 when permission fails | API security | Yes | `backend/tests/test_sentinel_controller.py` |
| Analysis endpoint starts background workflow | API integration (mocked internal call) | Yes | `backend/tests/test_analysis_controller.py` |
| Analysis endpoint rejects invalid payload | API validation | Yes | `backend/tests/test_analysis_controller.py` |
| Analysis endpoint returns 403 without permission | API security | Yes | `backend/tests/test_analysis_controller.py` |
| Ingest endpoint returns processing summary and user context | API integration (mocked external) | Yes | `backend/tests/test_ingest_controller.py` |
| Ingest stream endpoint returns SSE response contract | API contract | Yes | `backend/tests/test_ingest_controller.py` |
| Ingest endpoint returns 403 without permission | API security | Yes | `backend/tests/test_ingest_controller.py` |
| Municipality lookup returns normalized region details | API integration (mocked repository/service) | Yes | `backend/tests/test_municipality_controller.py` |
| Municipality geometry returns 404 for unknown region | API error handling | Yes | `backend/tests/test_municipality_controller.py` |
| Municipality endpoint returns 403 without permission | API security | Yes | `backend/tests/test_municipality_controller.py` |
| Save-log endpoint persists user audit fields | API integration (mocked OpenSearch) | Yes | `backend/tests/test_save_log_controller.py` |
| Logs endpoint returns 404 for missing log id | API error handling | Yes | `backend/tests/test_save_log_controller.py` |
| Save-log endpoint returns 403 without permission | API security | Yes | `backend/tests/test_save_log_controller.py` |
| Chat endpoint injects permissions and geo context into service call | API integration (mocked AI service) | Yes | `backend/tests/test_chat_controller.py` |
| Chat endpoint returns user-friendly fallback on service error | API resilience/UX | Yes | `backend/tests/test_chat_controller.py` |
| Chat health endpoint returns service status contract | API smoke | Yes | `backend/tests/test_chat_controller.py` |
| NDVI/NDWI/EVI/NDMI/VCI/TCI/VHI correctness | Unit | Yes | `backend/tests/formulas/test_vegetation_formulas.py` |
| Admin wildcard permission behavior | Unit | Yes | `backend/tests/security/test_permission_mapper.py` |
| Multi-role permission union behavior | Unit | Yes | `backend/tests/security/test_permission_mapper.py` |
| Keycloak role name normalization | Unit | Yes | `backend/tests/security/test_role_mapper.py` |

## Readability Conventions

- Test names follow `test_<behavior>_<expected_outcome>` (backend) or `it('<behavior>')` (frontend).
- Structure uses Arrange / Act / Assert style.
- External systems are mocked in tests to avoid flaky behavior.

---

## Frontend Test Strategy

### Framework

| Tool | Purpose |
|---|---|
| **Vitest** | Test runner (Vite-native, zero extra config) |
| **jsdom** | DOM environment for browser APIs (`window.location`, etc.) |

No heavy component-testing libraries — we focus on **pure-function unit tests** that cover the API/util layer end to end.

### 3) Frontend Unit Tests

Pure-function tests with no network calls.

- API error parsing, type guards, German user messages:
  - `frontend/tests/utils/apiErrors.test.ts`
- Role checking (all Keycloak alias variants), permission helpers, German display names:
  - `frontend/tests/utils/roleUtils.test.ts`
- GeoJSON bounding-box calculation (Polygon, MultiPolygon, Point):
  - `frontend/tests/utils/geoUtils.test.ts`
- Chat-message markdown formatting fixes:
  - `frontend/tests/utils/chatUtils.test.ts`
- Sentinel date range validation, bbox extraction, date formatting:
  - `frontend/tests/api/sentinelApi.test.ts`
- Ingestion bbox validation, date-string format check:
  - `frontend/tests/api/ingestApi.test.ts`
- HTTP client interceptors (auth token injection, public-route bypass, 401 redirect, AppError shaping):
  - `frontend/tests/api/httpClient.test.ts`

### Frontend Coverage Matrix

| Use Case | Test Type | Automated | File |
|---|---|---|---|
| API error → correct code & German message for each HTTP status | Unit | Yes | `frontend/tests/utils/apiErrors.test.ts` |
| Network error (no response) detected correctly | Unit | Yes | `frontend/tests/utils/apiErrors.test.ts` |
| 401 triggers `requiresAuth` flag | Unit | Yes | `frontend/tests/utils/apiErrors.test.ts` |
| FastAPI `detail` string/array extracted into message | Unit | Yes | `frontend/tests/utils/apiErrors.test.ts` |
| `isAxiosError` / `isAuthError` / `isNetworkError` type guards | Unit | Yes | `frontend/tests/utils/apiErrors.test.ts` |
| Admin role detected across all alias variants | Unit | Yes | `frontend/tests/utils/roleUtils.test.ts` |
| ForestAnalyst role detected (7 variants incl. kebab, underscore, space) | Unit | Yes | `frontend/tests/utils/roleUtils.test.ts` |
| DataManager role detected (6 variants) | Unit | Yes | `frontend/tests/utils/roleUtils.test.ts` |
| Viewer role detected | Unit | Yes | `frontend/tests/utils/roleUtils.test.ts` |
| Primary role returns German display name with correct priority | Unit | Yes | `frontend/tests/utils/roleUtils.test.ts` |
| Permission helpers: `canAnalyze`, `canIngestData`, `canManageUsers` | Unit | Yes | `frontend/tests/utils/roleUtils.test.ts` |
| GeoJSON bbox for Polygon, MultiPolygon, Point | Unit | Yes | `frontend/tests/utils/geoUtils.test.ts` |
| Null/empty geometry → null bbox | Unit | Yes | `frontend/tests/utils/geoUtils.test.ts` |
| Chat message numbered-list / bullet-point newline fix | Unit | Yes | `frontend/tests/utils/chatUtils.test.ts` |
| Sentinel date range: valid, future, >1yr, inverted | Unit | Yes | `frontend/tests/api/sentinelApi.test.ts` |
| Sentinel bbox extraction from GeoJSON polygon | Unit | Yes | `frontend/tests/api/sentinelApi.test.ts` |
| `formatSentinelDate` returns YYYY-MM-DD | Unit | Yes | `frontend/tests/api/sentinelApi.test.ts` |
| Ingest bbox validation (range, types, order) | Unit | Yes | `frontend/tests/api/ingestApi.test.ts` |
| `isValidDateString` accepts YYYY-MM-DD only | Unit | Yes | `frontend/tests/api/ingestApi.test.ts` |
| Auth token attached to protected API requests | Unit | Yes | `frontend/tests/api/httpClient.test.ts` |
| Token skipped for public routes (`/health`, `/auth/login`) | Unit | Yes | `frontend/tests/api/httpClient.test.ts` |
| 401 response triggers `clearAuth` + redirect to `/login` | Unit | Yes | `frontend/tests/api/httpClient.test.ts` |
| 401 on public route does NOT redirect | Unit | Yes | `frontend/tests/api/httpClient.test.ts` |
| Non-401 errors rejected as `AppError` (code, message, status) | Unit | Yes | `frontend/tests/api/httpClient.test.ts` |
| Client config: correct `baseURL`, timeout 300 s, JSON headers | Unit | Yes | `frontend/tests/api/httpClient.test.ts` |

---

## Manual Smoke E2E Test

> A step-by-step checklist a tester runs in the browser against a local dev instance
> (`task dev`). Mark each step **Pass** or **Fail** and note any issues.

### Prerequisites

- `task dev` running (Docker + backend + frontend)
- Test user: `adminuser` / `admin123` (all roles)

### Checklist

| # | Step | Expected Result | Status |
|---|---|---|---|
| **Flow 1 — Login** | | | |
| 1.1 | Navigate to `http://localhost:5173` | Redirected to `/login` | ☐ |
| 1.2 | Click "Anmelden" | Keycloak login page opens | ☐ |
| 1.3 | Enter `adminuser` / `admin123`, submit | Redirected back to `/dashboard/region` | ☐ |
| 1.4 | Open DevTools → Application → Local Storage | `vf_access_token` present | ☐ |
| **Flow 2 — Region Selection** | | | |
| 2.1 | Type "Darmstadt" in the search field | Autocomplete dropdown with results | ☐ |
| 2.2 | Select "Darmstadt" from dropdown | Map pans to Darmstadt area, polygon shown | ☐ |
| 2.3 | Verify the region name appears in the sidebar | Region name displayed | ☐ |
| **Flow 3 — Vegetation Analysis** | | | |
| 3.1 | Navigate to `/dashboard/analysis` (or click "Analyse" in nav) | Analysis page loads with map | ☐ |
| 3.2 | Select a vegetation index (e.g. NDVI) | Index selector updates | ☐ |
| 3.3 | Click "Analyse starten" | Progress indicator or results appear | ☐ |
| 3.4 | Verify coloured overlay on the map | Vegetation index layer rendered | ☐ |
| **Flow 4 — Logout** | | | |
| 4.1 | Click user menu → "Abmelden" | Redirected to `/login` | ☐ |
| 4.2 | Check Local Storage | `vf_access_token` removed | ☐ |
| 4.3 | Navigate to `/dashboard/region` directly | Redirected back to `/login` | ☐ |

---

## How to Run

### Backend tests

```powershell
cd backend
pytest tests/ -q
```

Optional coverage report:

```powershell
cd backend
pytest tests/ --cov=backend_app --cov-report=term-missing
```

CI backend test job enforces a minimum coverage threshold:

```bash
pytest tests/ --cov=backend_app --cov-report=term-missing --cov-fail-under=30
```

### Frontend tests

```powershell
cd frontend
npm test
```

Watch mode during development:

```powershell
cd frontend
npm run test:watch
```

### All tests at once (via Taskfile)

```powershell
task test
```

---

## Appendix: Requirement → Test Mapping

> Maps every functional requirement to the test(s) that verify it, across both layers.

| # | Requirement | Layer | Test Type | Test Location | Automated |
|---|---|---|---|---|---|
| R1 | Service health is publicly reachable | Backend | API smoke | `backend/tests/test_health_endpoints.py` | Yes |
| R2 | OpenSearch health returns `cluster_name` | Backend | API smoke | `backend/tests/test_health_endpoints.py` | Yes |
| R3 | Protected endpoints block unauthenticated access | Backend | API security | `backend/tests/test_health_endpoints.py` | Yes |
| R4 | User can log in via Keycloak | Frontend | E2E smoke | Manual Checklist Flow 1 | Manual |
| R5 | Auth token stored in localStorage after login | Frontend | E2E smoke | Manual Checklist §1.4 | Manual |
| R6 | 401 API response triggers re-auth flag | Frontend | Unit | `frontend/tests/utils/apiErrors.test.ts` | Yes |
| R7 | API errors show German user messages per status code | Frontend | Unit | `frontend/tests/utils/apiErrors.test.ts` | Yes |
| R8 | Network errors detected (no server response) | Frontend | Unit | `frontend/tests/utils/apiErrors.test.ts` | Yes |
| R9 | FastAPI error detail extracted (string & array) | Frontend | Unit | `frontend/tests/utils/apiErrors.test.ts` | Yes |
| R10 | Role detection: Admin (4 alias variants) | Frontend | Unit | `frontend/tests/utils/roleUtils.test.ts` | Yes |
| R11 | Role detection: ForestAnalyst (7 variants) | Frontend | Unit | `frontend/tests/utils/roleUtils.test.ts` | Yes |
| R12 | Role detection: DataManager (6 variants) | Frontend | Unit | `frontend/tests/utils/roleUtils.test.ts` | Yes |
| R13 | Role detection: Viewer (3 variants) | Frontend | Unit | `frontend/tests/utils/roleUtils.test.ts` | Yes |
| R14 | Primary role → German display name (priority order) | Frontend | Unit | `frontend/tests/utils/roleUtils.test.ts` | Yes |
| R15 | Permission: only Admin + Analyst can analyse | Frontend | Unit | `frontend/tests/utils/roleUtils.test.ts` | Yes |
| R16 | Permission: only Admin + DataManager can ingest | Frontend | Unit | `frontend/tests/utils/roleUtils.test.ts` | Yes |
| R17 | Permission: only Admin can manage users | Frontend | Unit | `frontend/tests/utils/roleUtils.test.ts` | Yes |
| R18 | GeoJSON bounding box for Polygon / MultiPolygon / Point | Frontend | Unit | `frontend/tests/utils/geoUtils.test.ts` | Yes |
| R19 | Chat messages: markdown list formatting | Frontend | Unit | `frontend/tests/utils/chatUtils.test.ts` | Yes |
| R20 | Sentinel date-range validation (bounds, direction, future) | Frontend | Unit | `frontend/tests/api/sentinelApi.test.ts` | Yes |
| R21 | Sentinel bbox extraction from polygon | Frontend | Unit | `frontend/tests/api/sentinelApi.test.ts` | Yes |
| R22 | Ingest bbox validation (range, types, coordinate order) | Frontend | Unit | `frontend/tests/api/ingestApi.test.ts` | Yes |
| R23 | Date string format validation (YYYY-MM-DD) | Frontend | Unit | `frontend/tests/api/ingestApi.test.ts` | Yes |
| R24 | Sentinel fetch with valid permission returns data | Backend | API integration | `backend/tests/test_sentinel_controller.py` | Yes |
| R25 | Sentinel fetch returns 403 without permission | Backend | API security | `backend/tests/test_sentinel_controller.py` | Yes |
| R26 | Analysis endpoint starts background workflow | Backend | API integration | `backend/tests/test_analysis_controller.py` | Yes |
| R27 | Analysis endpoint rejects invalid payload | Backend | API validation | `backend/tests/test_analysis_controller.py` | Yes |
| R28 | Analysis endpoint returns 403 without permission | Backend | API security | `backend/tests/test_analysis_controller.py` | Yes |
| R29 | Ingest returns processing summary + user context | Backend | API integration | `backend/tests/test_ingest_controller.py` | Yes |
| R30 | Ingest stream returns SSE response contract | Backend | API contract | `backend/tests/test_ingest_controller.py` | Yes |
| R31 | Ingest returns 403 without permission | Backend | API security | `backend/tests/test_ingest_controller.py` | Yes |
| R32 | Municipality lookup returns normalized region | Backend | API integration | `backend/tests/test_municipality_controller.py` | Yes |
| R33 | Municipality geometry 404 for unknown region | Backend | API error | `backend/tests/test_municipality_controller.py` | Yes |
| R34 | Municipality returns 403 without permission | Backend | API security | `backend/tests/test_municipality_controller.py` | Yes |
| R35 | Save-log persists audit fields | Backend | API integration | `backend/tests/test_save_log_controller.py` | Yes |
| R36 | Logs 404 for missing log id | Backend | API error | `backend/tests/test_save_log_controller.py` | Yes |
| R37 | Save-log returns 403 without permission | Backend | API security | `backend/tests/test_save_log_controller.py` | Yes |
| R38 | Chat injects permissions + geo context | Backend | API integration | `backend/tests/test_chat_controller.py` | Yes |
| R39 | Chat returns friendly fallback on service error | Backend | API resilience | `backend/tests/test_chat_controller.py` | Yes |
| R40 | NDVI / NDWI / EVI / NDMI / VCI / TCI / VHI formulas | Backend | Unit | `backend/tests/formulas/test_vegetation_formulas.py` | Yes |
| R41 | Admin wildcard permission | Backend | Unit | `backend/tests/security/test_permission_mapper.py` | Yes |
| R42 | Multi-role permission union | Backend | Unit | `backend/tests/security/test_permission_mapper.py` | Yes |
| R43 | Keycloak role name normalisation | Backend | Unit | `backend/tests/security/test_role_mapper.py` | Yes |
| R44 | User can search & select a region on the map | Frontend | E2E smoke | Manual Checklist Flow 2 | Manual |
| R45 | User can run vegetation analysis and see results | Frontend | E2E smoke | Manual Checklist Flow 3 | Manual |
| R46 | User can log out, token cleared, route guarded | Frontend | E2E smoke | Manual Checklist Flow 4 | Manual |
| R47 | Auth token injected on protected API requests | Frontend | Unit | `frontend/tests/api/httpClient.test.ts` | Yes |
| R48 | Public routes bypass auth header | Frontend | Unit | `frontend/tests/api/httpClient.test.ts` | Yes |
| R49 | 401 triggers clearAuth + redirect to /login | Frontend | Unit | `frontend/tests/api/httpClient.test.ts` | Yes |
| R50 | Non-401 HTTP errors → AppError shape | Frontend | Unit | `frontend/tests/api/httpClient.test.ts` | Yes |
| R51 | HTTP client configured (baseURL, timeout, headers) | Frontend | Unit | `frontend/tests/api/httpClient.test.ts` | Yes |
| R52 | Frontend tests run in GitLab CI pipeline | Infra | CI | `.gitlab-ci.yml` → `test:frontend` | Yes |
- Assertions focus on user-visible behavior (status codes, response payloads, permission effects).

## Notes

- Existing script-based checks under `scripts/` are useful for manual diagnostics but are not a replacement for automated pytest suites.
- Additional endpoint suites can be added incrementally in `backend/tests/controllers/` using the same fixture and mocking approach.
