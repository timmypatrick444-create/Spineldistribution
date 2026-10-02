# Spinel Distribution - Zero-Install cPanel Production Deployment Guide

This application is **100% pre-compiled and bundled for production**.
- **NO `npm install` needed on cPanel**
- **NO `npm run build` needed on cPanel**
- **Single Process Execution**: Uses **only 1 Node.js process** and **~35MB RAM**, avoiding cPanel's *Entry Processes* (EP) and *Number of Processes* (NPROC) limits.

---

## 1. Connecting cPanel MySQL Database for "Request Quote"

When visitors submit a quote on the **Request Quote** page, it persists directly to your cPanel MySQL/MariaDB database in the **`Request_Quote`** table.

### Step A: Create MySQL Database in cPanel
1. In cPanel, open **MySQL Databases**.
2. Create a new database (e.g., `spinel_db`). Note full name: `yourcpaneluser_spinel_db`.
3. Create a new user (e.g., `spinel_user`) and a secure password.
4. Under **Add User To Database**, select the user and database, click **Add**, check **ALL PRIVILEGES**, and click **Make Changes**.

*(Note: Both the `Request_Quote` and `Users` tables are **created and verified automatically** by the app on boot. You can also import `cpanel_quotes_table.sql` and `cpanel_users_table.sql` in phpMyAdmin if preferred).*

### Step B: Add Credentials to cPanel Node.js App
In cPanel &rarr; **Setup Node.js App**, edit your application, scroll to **Environment variables**, and add:

| Variable Name | Recommended Value | Note |
|---|---|---|
| **`DB_HOST`** | `127.0.0.1` | **Always use `127.0.0.1`** (avoids socket mismatch) |
| **`DB_USER`** | `yourcpaneluser_dbuser` | Full cPanel database username |
| **`DB_PASSWORD`** | `your_secure_password` | Database user password |
| **`DB_NAME`** | `yourcpaneluser_dbname` | Full cPanel database name |
| **`DB_PORT`** | `3306` | Default MySQL port |
| **`SMTP_HOST`** | `mail.yourdomain.com` *(Optional)* | cPanel Mail Server hostname |
| **`SMTP_PORT`** | `587` (or `465`) *(Optional)* | Outgoing Mail Port |
| **`SMTP_USER`** | `noreply@yourdomain.com` *(Optional)* | Full cPanel Webmail email address |
| **`SMTP_PASS`** | `your_webmail_password` *(Optional)* | Webmail email account password |

*(Alternatively, you can place a `.env` file containing these variables in your `public_html/` folder).*

---

## 2. Customer Authentication & "Users" Database Table

1. **Table Structure (`Users`)**:
   - `ID` (INT AUTO_INCREMENT PRIMARY KEY)
   - `Full_Name` (VARCHAR(255))
   - `Email` (VARCHAR(255) UNIQUE) — Enforces that no registered email can sign up twice with clear error messages.
   - `Password` (VARCHAR(255)) — **Hashed with bcryptjs** for high enterprise security.
   - `Verification_Status` (VARCHAR(50), default `'Verified'`)
   - `Created_At` (DATETIME DEFAULT CURRENT_TIMESTAMP)

2. **How to create or update this field in phpMyAdmin**:
   - If creating fresh: import `cpanel_users_table.sql`.
   - If you already created the table, run:
     ```sql
     -- Remove Role:
     ALTER TABLE `Users` DROP COLUMN `Role`;

     -- Replace Is_Verified with Verification_Status:
     ALTER TABLE `Users` CHANGE COLUMN `Is_Verified` `Verification_Status` VARCHAR(50) DEFAULT 'Verified';

     -- Or simply add Verification_Status if it is not there yet:
     ALTER TABLE `Users` ADD COLUMN IF NOT EXISTS `Verification_Status` VARCHAR(50) DEFAULT 'Verified';
     ```

3. **6-Digit Email OTP Verification**:
   - When a user submits the signup form, a secure 6-digit OTP code is generated and dispatched to their email address.
   - The user is immediately navigated to the **OTP Verification Page**.
   - The account is **only inserted into the `Users` table** when the user enters the matching 6-digit code.
   - Invalid OTP codes display clear error messages with remaining attempt counts.
   - Passwords are encrypted with salted **bcryptjs** before storage.
   - Only registered users with verified credentials can log in.

---

## 3. Picture File Storage on cPanel (`Images/Request_Quotes/`)

When users attach an image, blueprint, or equipment photo on the **Request Quote** page:
1. **Physical File Saved on Disk**: The binary image is saved directly onto your cPanel server inside the app root at:
   ```
   Images/Request_Quotes/quote_<timestamp>_<random>.jpg
   ```
2. **Database Table Column**: The `Image` column in the **`Request_Quote`** table stores the exact web path:
   ```sql
   /Images/Request_Quotes/quote_1790848319727_8359.jpg
   ```
3. **Instant Web Delivery**: Images are served directly via Apache/LiteSpeed & Express at `https://yourdomain.com/Images/Request_Quotes/...` with HTTP caching enabled.
4. **Zero Configuration**: The server automatically creates the `Images/Request_Quotes` folder in the app root directory on first boot.

---

## 3. Fixing "Upgrade Required" (HTTP 426) on cPanel

If your browser displays **"Upgrade Required"**:
1. **Visit via HTTPS**: Always use **`https://yourdomain.com`** (not `http://`).
2. **Node.js Version**: In cPanel &rarr; **Setup Node.js App**, ensure the version is set to **`20.x`** (or `18.x` / `22.x`), then click **Save** and **Restart**.

---

## 4. Files to Upload to cPanel (0 Installs Required)

Upload these files directly into your domain root (e.g. `public_html/`):

| File / Folder | Purpose |
|---|---|
| **`app.js`** | Standalone production server (Express + MySQL2 + API routes bundled). |
| **`server.cjs`** | Identical backup server bundle. |
| **`client-build/`** *(or `dist/`)* | Pre-compiled React frontend (storefront, admin portal, CSS, images). |
| **`Images/Request_Quotes/`** | Directory in app root where quote picture attachments are saved. |
| **`.htaccess`** | HTTPS redirection & Passenger config. |
| **`package.json`** | Metadata required by cPanel "Setup Node.js App". |
| **`.env`** *(Optional)* | Database & environment variables. |

*(Do **not** upload `node_modules/` or `src/` to cPanel).*

---

## 5. Quick Setup Summary

1. Upload `app.js`, `client-build/` (or `dist/`), `.htaccess`, and `package.json` to `public_html`.
2. In cPanel **Setup Node.js App**:
   - **Node.js version**: `20.x` (or `18.x` / `22.x`)
   - **Application mode**: `Production`
   - **Application root**: `public_html`
   - **Application startup file**: `app.js`
   - **Environment variables**: Add `DB_HOST=127.0.0.1`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Click **Save** and **Restart**.
