# setup_users.ps1
# This script automates User Creation and Role Mapping in Keycloak

$KEYCLOAK_EXEC = "docker exec -i keycloak /opt/keycloak/bin/kcadm.sh"

Write-Host "Re-synchronizing Keycloak users and roles..."

# 0. Auth to Keycloak Admin
Invoke-Expression "$KEYCLOAK_EXEC config credentials --server http://localhost:8080 --realm master --user admin --password admin"

# 1. Update Viewer User
Write-Host "Updating Viewer User profile..."
try {
    $userJson = Invoke-Expression "$KEYCLOAK_EXEC get users -r geo-platform -q username=viewuser --fields id"
    if ($userJson) {
        $viewId = ($userJson | ConvertFrom-Json)[0].id
        if ($viewId) {
            Invoke-Expression "$KEYCLOAK_EXEC update users/$viewId -r geo-platform -s email=viewer@forest.com -s firstName=Viewer -s lastName=User -s emailVerified=true"
            Write-Host "Viewer user updated."
        }
    }
} catch {
    Write-Host "Error updating viewer user."
}

# 2. Update Analyst User
Write-Host "Updating Analyst User profile..."
try {
    $userJson = Invoke-Expression "$KEYCLOAK_EXEC get users -r geo-platform -q username=analystuser --fields id"
    if ($userJson) {
        $analystId = ($userJson | ConvertFrom-Json)[0].id
        if ($analystId) {
            Invoke-Expression "$KEYCLOAK_EXEC update users/$analystId -r geo-platform -s email=analyst@forest.com -s firstName=Analyst -s lastName=User -s emailVerified=true"
            Write-Host "Analyst user updated."
        }
    }
} catch {
    Write-Host "Error updating analyst user."
}

# Update Admin User
Write-Host "Updating Admin User profile..."
try {
    # 1. Create 'admin' role if it doesn't exist
    Invoke-Expression "$KEYCLOAK_EXEC create roles -r geo-platform -s name=admin"
    
    # 2. Get Admin ID
    $userJson = Invoke-Expression "$KEYCLOAK_EXEC get users -r geo-platform -q username=adminuser --fields id"
    if ($userJson) {
        $adminId = ($userJson | ConvertFrom-Json)[0].id
        if ($adminId) {
            # 3. Update profile
            Invoke-Expression "$KEYCLOAK_EXEC update users/$adminId -r geo-platform -s email=admin@forest.com -s firstName=Admin -s lastName=User -s emailVerified=true"
            
            # 4. Assign 'admin' role
            Invoke-Expression "$KEYCLOAK_EXEC add-roles -r geo-platform --uusername adminuser --rolename admin"
            
            Write-Host "Admin user updated and role assigned."
        }
    }
} catch {
    Write-Host "Error updating admin user."
}

Write-Host "User setup complete."
