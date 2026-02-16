# Forest Vitality Platform – Backend API (Draft)

This document defines the first backend endpoints used for data ingestion and index retrieval.

## 1. Health

**GET** `/health`  
Check if the backend is running.

**Response (200):**
```json
{ "status": "ok" }
