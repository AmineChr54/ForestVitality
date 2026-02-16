# Forest Vitality - Production Deployment Guide

## Overview
This guide walks you through deploying the Forest Vitality application to production with security hardening and best practices.

## Prerequisites
- Docker and Docker Compose installed
- Access to the production server
- SSL certificates (recommended for HTTPS)

## Step 1: Environment Setup

### 1.1 Configure Production Secrets
Copy the example file and update with production values:
```bash
cd infra
cp .env.prod.example .env.prod
```

**CRITICAL**: Update the following in `.env.prod`:
- `KEYCLOAK_ADMIN_PASSWORD` - Strong admin password
- `POSTGRES_PASSWORD` - Strong database password
- `MINIO_ROOT_PASSWORD` - Strong MinIO password
- `AWS_SECRET_ACCESS_KEY` - Strong S3 secret key

### 1.2 Verify .gitignore
Ensure `.env.prod` is in `.gitignore` to prevent committing secrets:
```bash
grep "infra/.env.prod" ../.gitignore
```

## Step 2: Build and Deploy

### 2.1 Build the Stack
```bash
# Assumes you are in infra/
docker-compose -f docker-compose.prod.yml build
```

### 2.2 Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 2.3 Verify Services
Check all containers are running:
```bash
docker-compose -f docker-compose.prod.yml ps
```

Expected output: All services should show "Up" status.

## Step 3: Post-Deployment Verification

### 3.1 Health Checks
Verify each service is healthy:
```bash
# OpenSearch
curl http://localhost:9200/_cat/health

# MinIO
curl http://localhost:9000/minio/health/live

# Backend API
curl http://localhost/api/health
```

### 3.2 Access Points
- **Frontend**: http://localhost (or your domain)
- **Backend API Docs**: http://localhost/api/docs
- **Keycloak Admin**: http://localhost:8080
- **MinIO Console**: http://localhost:9001

## Step 4: Production Hardening Checklist

- [x] Secrets moved to `.env.prod`
- [x] `.env.prod` added to `.gitignore`
- [x] Restart policies configured (`unless-stopped`)
- [x] Health checks enabled for critical services
- [x] Backend running as non-root user
- [x] Gunicorn production server (4 workers)
- [ ] HTTPS/SSL configured (recommended)
- [ ] Firewall rules configured
- [ ] Backup strategy for volumes
- [ ] Monitoring/logging configured

## Step 5: HTTPS Setup (Recommended)

For production, use a reverse proxy (Nginx/Traefik) with SSL certificates:

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Configure reverse proxy to terminate SSL
3. Update `KEYCLOAK_URL` and frontend URLs accordingly

## Maintenance

### View Logs
```bash
# All services
docker-compose -f infra/docker-compose.prod.yml logs -f

# Specific service
docker-compose -f infra/docker-compose.prod.yml logs -f backend
```

### Restart Services
```bash
docker-compose -f infra/docker-compose.prod.yml restart backend
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f infra/docker-compose.prod.yml up -d --build
```

### Backup Volumes
```bash
# Backup MinIO data
docker run --rm -v forest-vitality_minio_data_prod:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup.tar.gz /data

# Backup Keycloak DB
docker exec keycloak-db pg_dump -U keycloak keycloak > keycloak-backup.sql
```

## Troubleshooting

### Service Won't Start
Check logs for the specific service:
```bash
docker-compose -f infra/docker-compose.prod.yml logs service-name
```

### Environment Variables Not Loading
Verify `infra/.env.prod` exists and contains all required variables.

### Permission Denied Errors
The backend now runs as a non-root user. Ensure file permissions are correct:
```bash
chmod -R 755 backend/
```
