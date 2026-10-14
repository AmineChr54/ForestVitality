# Keycloak Realm Configuration

This directory contains the Keycloak realm export for the Forest Vitality platform.

## 📋 What's Included

The `realm-export.json` file contains:
- ✅ **Realm:** geo-platform
- ✅ **Client:** geo-platform-backend (for backend API)
- ✅ **Roles:**
  - `administrator` - Full system access
  - `forest_analyst` - Can run analyses, view data
  - `data_manager` - Can ingest satellite data
  - `viewer` - Read-only access
- ✅ **Test Users:**
  - `adminuser` / `admin123` (administrator role)
  - `testuser` / `test123` (forest_analyst role)

## 🚀 How to Use

### First Time Setup

1. **Start Docker containers:**
   ```bash
   cd infra
   docker-compose up -d
   ```

2. **Keycloak will automatically import the realm** on first startup (takes ~30 seconds)

3. **Verify import:**
   - Open http://localhost:8080
   - Login with: `admin` / `admin`
   - You should see **"geo-platform"** realm in the dropdown

4. **Test login:**
   - Use the test users in your frontend
   - Or get tokens via API (see below)

---

### Getting Access Tokens

**For Admin User:**
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8080/realms/geo-platform/protocol/openid-connect/token" -Method Post -ContentType "application/x-www-form-urlencoded" -Body @{
    grant_type = "password"
    client_id = "geo-platform-backend"
    username = "adminuser"
    password = "admin123"
}
$response.access_token
```

**For Forest Analyst:**
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8080/realms/geo-platform/protocol/openid-connect/token" -Method Post -ContentType "application/x-www-form-urlencoded" -Body @{
    grant_type = "password"
    client_id = "geo-platform-backend"
    username = "testuser"
    password = "test123"
}
$response.access_token
```

---

### Creating New Users

1. Go to Keycloak Admin: http://localhost:8080
2. Login: `admin` / `admin`
3. Select **"geo-platform"** realm
4. Go to **Users** → **Add user**
5. Fill in details and **Save**
6. Go to **Credentials** tab → Set password (uncheck "Temporary")
7. Go to **Role Mapping** tab → Assign role:
   - `administrator` - Full access
   - `forest_analyst` - Analyst capabilities
   - `data_manager` - Data ingestion only
   - `viewer` - Read-only

---

## 🔄 Updating the Realm Export

If you make changes to Keycloak (new roles, clients, etc.), re-export the realm:

### Via Admin UI:
1. Realm settings → Action → Partial export
2. Check: Export groups/roles, Export clients, Include users
3. Save as `realm-export.json` in this directory
4. Commit to Git

### Via Docker Command:
```bash
docker exec -it keycloak /opt/keycloak/bin/kc.sh export --dir /tmp --realm geo-platform --users realm_file
docker cp keycloak:/tmp/geo-platform-realm.json ./infra/keycloak/import/realm-export.json
```

---

## 🔐 Security Notes

- ⚠️ **Test passwords are weak** - Change in production!
- ⚠️ **Admin credentials** in docker-compose.yml should use secrets in production
- ✅ This configuration is for **development only**
- ✅ In production, use proper secret management and HTTPS

---

## 🐛 Troubleshooting

**Realm not imported?**
- Stop containers: `docker-compose down`
- Remove volumes: `docker volume rm infra_keycloak_db_data`
- Start again: `docker-compose up -d`
- Check logs: `docker logs keycloak`

**401 Unauthorized in API?**
- Token expired (5 min lifetime) - get a new one
- Wrong realm or client ID
- User doesn't have required role

**403 Forbidden in API?**
- User authenticated but lacks permission
- Check user's role assignment in Keycloak
- Verify role name matches (use underscores: `forest_analyst`)

---

## 📚 Role → Permission Mapping

| Role | Can Analyze | Can Ingest | Can Manage Users | View All Data |
|------|-------------|------------|------------------|---------------|
| administrator | ✅ | ✅ | ✅ | ✅ |
| forest_analyst | ✅ | ❌ | ❌ | Limited* |
| data_manager | ❌ | ✅ | ❌ | ✅ |
| viewer | ❌ | ❌ | ❌ | ✅ |

*Forest analysts can be restricted to specific municipalities (to be implemented)

---

**Last Updated:** January 2026
