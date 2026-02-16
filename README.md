# Forest Vitality

A forest vitality monitoring application using satellite imagery and vegetation indices.

---

## 🚀 Quick Start

### 1. Pre-Development Checklist

- [ ] `.env` files updated? (compare with `.env.example` in `backend/` and `frontend/`)
- [ ] `pip install -r requirements.txt` (backend)
- [ ] `npm install` (frontend)
- [ ] Docker Desktop App running

### 2. Start Development

```bash
task dev
task stop
```

---

## 🔐 Keycloak Configuration

> **Note:** Will be hosted 24/7 on a server in the future. Currently using static users.

| User         | Password    | Role             |
| ------------ | ----------- | ---------------- |
| `admin`    | `admin`   | `SYSTEM_ADMIN` |
| `testuser` | `test123` | `ANALYST`      |

---

## ✅ Best Practices After Finishing Tasks

| Did you...             | Action                                          |
| ---------------------- | ----------------------------------------------- |
| Use new packages?      | Update `requirements.txt` or `package.json` |
| Use new env variables? | Update `.env.example`                         |
| Add new init steps?    | Update this README                              |
