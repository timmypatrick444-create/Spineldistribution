-- =====================================================================
-- SPINEL DISTRIBUTION - CPANEL MYSQL DATABASE SCHEMA FOR "Users"
-- =====================================================================
-- TABLE NAME: Users
-- TOTAL COLUMNS: 6
--
-- 1. ID                  : Auto-incrementing primary key
-- 2. Full_Name           : Customer / Contractor legal or business name
-- 3. Email               : Unique customer login email address
-- 4. Password            : Secure bcrypt hashed password string
-- 5. Verification_Status : 'Pending' upon signup -> 'Verified' after entering 6-digit OTP
-- 6. Created_At          : Account registration timestamp
-- =====================================================================

CREATE TABLE IF NOT EXISTS `Users` (
  `ID` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique User ID',
  `Full_Name` VARCHAR(255) NOT NULL COMMENT 'Full Legal or Business Name',
  `Email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Official Email Address (Unique)',
  `Password` VARCHAR(255) NOT NULL COMMENT 'Bcrypt Hashed Password',
  `Verification_Status` VARCHAR(50) DEFAULT 'Pending' COMMENT 'Email Verification Status (Pending or Verified)',
  `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Registration timestamp',
  INDEX `idx_users_email` (`Email`),
  INDEX `idx_users_created_at` (`Created_At`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registered Spinel Customers and Accounts';

-- =====================================================================
-- MIGRATION QUERIES FOR EXISTING "Users" TABLE IN PHPMYADMIN / CPANEL:
-- =====================================================================
-- If you already created the `Users` table, run these SQL commands in phpMyAdmin:
--
-- 1. Remove the `Role` column:
--    ALTER TABLE `Users` DROP COLUMN `Role`;
--
-- 2. Set default for `Verification_Status` to 'Pending':
--    ALTER TABLE `Users` CHANGE COLUMN `Is_Verified` `Verification_Status` VARCHAR(50) DEFAULT 'Pending';
--
-- 3. If `Verification_Status` already exists, update its default:
--    ALTER TABLE `Users` ALTER COLUMN `Verification_Status` SET DEFAULT 'Pending';
--
-- Sample verification query:
-- SELECT ID, Full_Name, Email, Verification_Status, Created_At FROM `Users` ORDER BY `ID` DESC;
