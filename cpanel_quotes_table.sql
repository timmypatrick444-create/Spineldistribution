-- =====================================================================
-- SPINEL DISTRIBUTION - CPANEL MYSQL DATABASE SCHEMA FOR "Request_Quote"
-- =====================================================================
-- TABLE NAME: Request_Quote
-- TOTAL COLUMNS: 12
--
-- 1.  ID           : Auto-incrementing primary key
-- 2.  Company_Name : Company / Organization Name
-- 3.  Contact_Person: Contact Person Full Name
-- 4.  Email        : Official Business Email
-- 5.  Phone_Number : Phone / WhatsApp Number
-- 6.  Location     : Delivery Destination / City / Port of Entry
-- 7.  Product_SKU  : Product SKU / Model Number
-- 8.  Product_Name : Product Name / Specification
-- 9.  Unit         : Estimated Quantity Required
-- 10. Image        : Picture Data URL or hosted image link
-- 11. Description  : Additional Technical Requirements / Project Scope / BOM Notes
-- 12. Created_At   : Timestamp when quote was submitted
-- =====================================================================

CREATE TABLE IF NOT EXISTS `Request_Quote` (
  `ID` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique record ID',
  `Company_Name` VARCHAR(255) NOT NULL COMMENT 'Company or Organization Name',
  `Contact_Person` VARCHAR(255) NOT NULL COMMENT 'Contact Person Full Name',
  `Email` VARCHAR(255) NOT NULL COMMENT 'Official Business Email',
  `Phone_Number` VARCHAR(64) NOT NULL COMMENT 'Phone / WhatsApp Number',
  `Location` VARCHAR(255) DEFAULT 'Not specified' COMMENT 'Delivery Destination / City / Port of Entry',
  `Product_SKU` VARCHAR(128) NULL COMMENT 'Product SKU',
  `Product_Name` VARCHAR(255) NULL COMMENT 'Product Name',
  `Unit` INT DEFAULT 1 COMMENT 'Estimated Quantity Required',
  `Image` LONGTEXT NULL COMMENT 'Attach Equipment Picture / Diagram / Reference Photo',
  `Description` TEXT NULL COMMENT 'Additional Technical Requirements / Project Scope / BOM Notes',
  `Created_At` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Submission timestamp',
  INDEX `idx_email` (`Email`),
  INDEX `idx_created_at` (`Created_At`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enterprise Request Quote Submissions';

-- Sample verification query:
-- SELECT * FROM `Request_Quote` ORDER BY `ID` DESC;
