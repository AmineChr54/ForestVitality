# 🎯 RBAC Quick Reference

## Role → Permission Mapping

| Feature | ADMIN | FOREST_ANALYST | DATA_MANAGER | VIEWER |
|---------|-------|----------------|--------------|--------|
| **User Management** | ✅ | ❌ | ❌ | ❌ |
| **Run Analysis** | ✅ | ✅ | ❌ | ❌ |
| **View Analysis** | ✅ | ✅ | ✅ | ✅ |
| **Export Reports** | ✅ | ✅ | ❌ | ❌ |
| **Ingest Data** | ✅ | ❌ | ✅ | ❌ |
| **Manage Metadata** | ✅ | ❌ | ✅ | ❌ |
| **View All Municipalities** | ✅ | ❌* | ✅ | ✅ |
| **Audit Logs** | ✅ | ❌ | ❌ | ❌ |
| **AI Insights** | ✅ | ✅ | ❌ | ❌ |

*Forest Analysts see only assigned municipalities

---

## Backend Endpoints Protection

```python
# ✅ PROTECTED
POST   /api/v1/analysis          → analysis:run
POST   /api/v1/ingest            → data:ingest  
GET    /api/v1/municipality      → regions:read

# ⚠️ NEEDS PROTECTION
GET    /api/v1/sentinel/fetch    → scenes:read
POST   /api/v1/save-log          → logs:create
GET    /api/v1/logs/{id}         → logs:read
```

---

## Frontend Route Protection

```tsx
// Admin Only
/admin/users        → ADMIN
/admin/audit        → ADMIN

// Data Manager
/data/ingest        → ADMIN, DATA_MANAGER
/data/catalog       → ADMIN, DATA_MANAGER

// Analyst
/dashboard/analysis → ADMIN, FOREST_ANALYST
/ai-insights        → ADMIN, FOREST_ANALYST

// Everyone
/dashboard/region   → ALL (authenticated)
/dashboard/compare  → ALL (authenticated)
```

---

## Permission Strings

```
# Analysis
analysis:read
analysis:run
analysis:export

# Data Management
data:ingest
data:delete
scenes:read
scenes:write
scenes:metadata

# Regions
regions:read
regions:write

# Admin
users:manage
users:create
users:delete
audit:read

# Reporting
reports:generate
reports:view
logs:create
logs:read
```

---

## Quick Code Snippets

### Backend: Protect Endpoint
```python
from backend_app.security.http.security_dependencies import get_current_principal
from backend_app.security.bundles.security.domain.principal import Principal

@router.post("/your-endpoint")
def your_function(
    principal: Principal = Depends(get_current_principal),
):
    security_service.assert_permission(principal, "your:permission")
    # Your code here
```

### Frontend: Protect Route
```tsx
import { RoleGuard } from '../security/ui/RoleGuard';

<RoleGuard allowedRoles={['ADMIN', 'FOREST_ANALYST']}>
  <YourComponent />
</RoleGuard>
```

### Frontend: Conditional Render
```tsx
import { Can } from '../security/ui/Can';
import { canAnalyze } from '../utils/roleUtils';

<Can perform={canAnalyze}>
  <AnalysisButton />
</Can>
```

---

## Troubleshooting

**403 Forbidden Error:**
1. Check user has correct role in Keycloak
2. Verify token contains role (decode at jwt.io)
3. Check `role_mapper.py` includes the role
4. Check `permission_mapper.py` grants required permission

**Endpoint Not Protected:**
1. Add `principal = Depends(get_current_principal)` to function signature
2. Call `security_service.assert_permission(principal, "permission")`
3. Restart backend

**Frontend Shows Wrong UI:**
1. Clear browser localStorage
2. Re-login
3. Check user roles in auth state
4. Verify role utility functions

---

## Testing Checklist

- [ ] Admin can access everything
- [ ] Forest Analyst can run analysis but not ingest
- [ ] Data Manager can ingest but not run detailed analysis
- [ ] Viewer can only view, no write operations
- [ ] Unauthenticated users redirected to login
- [ ] Municipality filtering works for analysts
- [ ] Audit logs capture sensitive operations

---

**Files Modified:**
- ✅ `backend/security/api/components/role_mapper.py`
- ✅ `backend/security/api/components/permission_mapper.py`
- ✅ `backend/security/http/permission_decorators.py` (NEW)
- ✅ `backend/security/api/components/municipality_access.py` (NEW)
- ✅ `backend/security/api/components/audit_logger.py` (NEW)
- ✅ `backend/controllers/analysis_controller.py`
- ✅ `backend/controllers/ingest_controller.py`
- ✅ `backend/controllers/municipality_controller.py`
- ✅ `frontend/src/security/ui/RoleGuard.tsx` (NEW)
- ✅ `frontend/src/security/ui/Can.tsx` (NEW)
- ✅ `frontend/src/config/dashboardConfig.ts` (NEW)
