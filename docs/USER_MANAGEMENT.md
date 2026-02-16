# 👥 User Management Guide

This document explains the user authentication setup for the Forest Vitality project and highlights the value of our automation script.

---

## 💡 Concept: With vs. Without Automation

To help the team understand why we use the `setup_users.ps1` script:

### ❌ Without Automation (Manual Mode)
Normally, if we didn't have this script, every team member would have to:
1.  **Access**: Open `http://localhost:8080` (Keycloak Admin Console).
2.  **Login**: Sign in to the "Master Realm" with `admin/admin`.
3.  **Navigation**: Go to the **"Users"** menu for the `geo-platform` realm.
4.  **Creation**: Click **"Add user"**, type the name (e.g., `forestanalyzer`).
5.  **Security**: Go to the **"Credentials"** tab, click **"Set password"**, type `forest123`, and uncheck "Temporary".
6.  **Permissions**: Go to the **"Role Mapping"** tab, find the `forest_analyst` role, and assign it.
7.  **Repetition**: Repeat steps 4 to 6 for every single user (`adminuser`, `datauser`, `viewuser`).

**The Downside**: This process is tedious (takes ~10 mins), prone to typos, and must be repeated every time the Docker environment is reset.

### ✅ With Automation (Robot Mode)
The `setup_users.ps1` script uses the Keycloak **CLI (Command Line Interface)** tool already inside the Docker container.
*   **Speed**: It configures all users, passwords, and roles in less than 5 seconds.
*   **Consistency**: Every developer has the exact same accounts and permissions.
*   **Reliability**: If you reset your Docker containers, you simply run the script once and everything is back to normal instantly.

---

## 🚀 How to use the script?

1.  **Start the project**: Ensure Docker is running via `npx task dev` or Docker Desktop.
2.  **Run the Script**: Open a terminal at the project root and run:
    ```powershell
    .\setup_users.ps1
    ```
3.  **Done!**: You can now log in at `http://localhost:5173`.

---

## 🔑 Default User Credentials

| Role | Username | Password | Email |
| :--- | :--- | :--- | :--- |
| **Forest Analyst** | `forestanalyzer` | `forest123` | `analyst@forest.com` |
| **Administrator** | `adminuser` | `admin123` | `admin@forest.com` |
| **Data Manager** | `datauser` | `data123` | `data@forest.com` |
| **Viewer** | `viewuser` | `view123` | `viewer@forest.com` |

---

## 🧪 How to Test?

Open the **Token Generator**: [http://localhost:8000/token-generator](http://localhost:8000/token-generator)
Select a user role and click **"Generate Token"**. If you see a **GREEN** success box, the automation worked perfectly!
