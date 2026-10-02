-- =====================================================================
-- SPINEL DISTRIBUTION - CPANEL MYSQL DATABASE SCHEMA FOR "Users"
-- =====================================================================
-- TABLE NAME: Users
-- TOTAL COLUMNS: 8
--
-- 1. ID                  : Auto-incrementing primary key
-- 2. Full_Name           : Customer / Contractor legal or business name
-- 3. Email               : Unique customer login email address
-- 4. Password            : Secure bcrypt hashed password string
-- 5. Verification_Status : 'Pending' upon signup -> 'Verified' after entering 6-digit OTP
-- 6. OTP_Code            : 6-digit verification code (NULL once verified)
-- 7. OTP_Expiry          : Code expiration timestamp
-- 8. Created_At          : Account registration timestamp
-- =====================================================================

CREATE TABLE IF NOT EXISTS `Users` (
  `ID` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique User ID',
  `Full_Name` VARCHAR(255) NOT NULL COMMENT 'Full Legal or Business Name',
  `Email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Official Email Address (Unique)',
  `Password` VARCHAR(255) NOT NULL COMMENT 'Bcrypt Hashed Password',
  `Verification_Status` VARCHAR(50) DEFAULT 'Pending' COMMENT 'Email Verification Status (Pending or Verified)',
  `OTP_Code` VARCHAR(10) NULL COMMENT 'Latest 6-digit verification code',
  `OTP_Expiry` DATETIME NULL COMMENT 'OTP expiration timestamp',
  `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Registration timestamp',
  INDEX `idx_users_email` (`Email`),
  INDEX `idx_users_created_at` (`Created_At`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registered Spinel Customers and Accounts';

-- =====================================================================
-- MIGRATION COMMANDS FOR EXISTING "Users" TABLE IN PHPMYADMIN / CPANEL:
-- =====================================================================
-- If you already created the `Users` table, run these SQL commands in phpMyAdmin:
--
-- 1. Remove the old `Role` column (if it exists):
--    ALTER TABLE `Users` DROP COLUMN IF EXISTS `Role`;
--
-- 2. Ensure Verification_Status is present with DEFAULT 'Pending':
--    ALTER TABLE `Users` ADD COLUMN IF NOT EXISTS `Verification_Status` VARCHAR(50) DEFAULT 'Pending';
--    ALTER TABLE `Users` ALTER COLUMN `Verification_Status` SET DEFAULT 'Pending';
--
-- 3. Add OTP persistence columns (for multi-worker cPanel Phusion Passenger):
--    ALTER TABLE `Users` ADD COLUMN IF NOT EXISTS `OTP_Code` VARCHAR(10) NULL;
--    ALTER TABLE `Users` ADD COLUMN IF NOT EXISTS `OTP_Expiry` DATETIME NULL;
--
-- Sample verification query:
-- SELECT ID, Full_Name, Email, Verification_Status, OTP_Code, Created_At FROM `Users` ORDER BY `ID` DESC;
