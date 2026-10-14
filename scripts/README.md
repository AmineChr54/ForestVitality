# Scripts

Small operational helpers for local development. They read configuration from `backend/.env`.

| Script | Purpose |
|--------|---------|
| `ingest_direct.py <product_id>` | Ingest a single Sentinel-2 product by ID, bypassing the API. Run from the `backend/` directory. |
| `list_minio.py` | List every object in the MinIO bucket. |
| `cleanup_minio_suffixes.py` | Delete legacy per-resolution objects (`*_10m` / `*_20m`) from MinIO. **Destructive.** |
| `setup_users.ps1` | Re-sync the development users and roles in the running Keycloak container (PowerShell). |
