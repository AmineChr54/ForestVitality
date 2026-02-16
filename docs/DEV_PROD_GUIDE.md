# Forest Vitality - Development vs. Deployment Guide

This guide explains how to work with the application in both local development and production-like deployment environments.

## 1. Development Environment (`task dev`)

In this mode, you run the backend and frontend locally on your host machine for hot-reloading and easy debugging, while infrastructure services (DB, Keycloak, etc.) run in Docker.

### Architecture
- **Frontend**: Runs on host (`localhost:5173`) via Vite.
- **Backend**: Runs on host (`localhost:8000`) via Uvicorn.
- **Infrastructure**: Runs in Docker (`localhost:5432`, `:8080`, `:9000`, etc.).

### How to Run
```powershell
task dev
```
*This command uses `Taskfile.yml` to start infrastructure via Docker and then launches backend and frontend in parallel.*

### Configuration
- **Backend**: Reads from `.env` in the root.
- **Frontend**: Reads from `frontend/.env.local`.
  - `VITE_API_BASE_URL=http://localhost:8000` (Direct call to backend).

### Workflow
1. Make changes to code (Frontend or Backend).
2. Changes are automatically detected and reloaded.
3. Access App: `http://localhost:5173`
4. Access Docs: `http://localhost:8000/docs`

---

## 2. Deployment Environment (`docker-compose.prod.yml`)

In this mode, the **entire stack** is containerized. This mimics a production environment where the frontend is served by Nginx and communicates with the backend via an internal network or reverse proxy.

### Architecture
- **Frontend**: Runs in Docker (Nginx) on port `80`.
- **Backend**: Runs in Docker (`backend`) on port `8000` (internal) via Gunicorn/Uvicorn.
- **Infrastructure**: Runs in Docker (same as dev).

### How to Run
```powershell
# Stop any running dev containers first
task stop

# Build and start the production stack
docker-compose -f docker-compose.prod.yml up --build -d
```

### Configuration
- **Backend**: Environment variables are defined in `infra/.env.prod`.
- **Frontend**: Reads from `frontend/.env.production` **at build time**.
  - `VITE_API_BASE_URL=/api` (Calls are proxied by Nginx).
- **Nginx**: Configured in `frontend/nginx.conf` to serve static files and proxy `/api/*` to the `backend` container.

### Workflow
1. Use this mode to verify the Docker build and Nginx configuration.
2. **NOTE**: Hot-reloading is **DISABLED**. You must rebuild containers to see changes:
   ```powershell
   docker-compose -f docker-compose.prod.yml up --build -d --no-deps frontend backend
   ```
3. Access App: `http://localhost` (Port 80)
4. Access Docs: `http://localhost/api/docs` (Proxied)

---

## Key Differences Summary

| Feature | Development (`task dev`) | Deployment (`docker-compose.prod.yml`) |
| :--- | :--- | :--- |
| **Run Command** | `task dev` | `docker-compose -f docker-compose.prod.yml up -d` |
| **Frontend URL** | `http://localhost:5173` | `http://localhost` |
| **Backend URL** | `http://localhost:8000` | `internal:8000` (Proxied via `/api`) |
| **Hot Reloading** | Yes (Fast) | No (Requires Rebuild) |
| **Frontend Env** | `frontend/.env.local` | `frontend/.env.production` |
| **Routing** | Direct CORS calls | Nginx Reverse Proxy |

## Troubleshooting
- **"CORS Error" in Dev**: Ensure backend `CORSMiddleware` includes `localhost:5173`.
- **"404 Not Found" in Prod**: Check `frontend/nginx.conf` proxy rules.
- **Env Var not updating in Prod**: You MUST rebuild the frontend container (`docker-compose build --no-cache frontend`) because Vite bakes variables into the HTML/JS/CSS.
