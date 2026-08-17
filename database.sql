-- ============================================================
-- Remedial School Affiliate Program — Database Schema
-- ============================================================
-- This file is the canonical schema reference. The running app
-- uses Prisma (SQLite by default, MySQL-compatible) which is
-- kept in sync via `bun run db:push`. This SQL mirrors the
-- MySQL target schema from the original specification.
--
-- To use with MySQL directly:
--   1. Create a database
--   2. Run this script
--   3. Point Prisma at it (see README "Switching to MySQL")
-- ============================================================

-- Agents table ------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  agent_id        VARCHAR(20) UNIQUE NOT NULL,           -- AGENT001
  full_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(100) UNIQUE NOT NULL,
  pin_hash        VARCHAR(255) NOT NULL,                  -- bcrypt-hashed 4-digit PIN
  phone           VARCHAR(20),
  commission_rate DECIMAL(5,2) DEFAULT 15.00,             -- percentage (15%)
  status          ENUM('Active','Inactive') DEFAULT 'Active',
  role            ENUM('agent','admin') DEFAULT 'agent',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agents_email (email),
  INDEX idx_agents_status (status)
);

-- Claims table ------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id                     INT PRIMARY KEY AUTO_INCREMENT,
  claim_id               VARCHAR(20) UNIQUE NOT NULL,     -- CLAIM001
  agent_id               INT NOT NULL,
  agent_name             VARCHAR(100) NOT NULL,
  agent_email            VARCHAR(100) NOT NULL,
  parent_full_name       VARCHAR(100) NOT NULL,
  parent_phone           VARCHAR(20) NOT NULL,
  parent_email           VARCHAR(100),
  student_name           VARCHAR(100) NOT NULL,
  student_grade          VARCHAR(20) NOT NULL,            -- Grade 1 .. Grade 8
  student_school         VARCHAR(100),
  notes                  TEXT,
  status                 ENUM('Pending','Approved','Rejected','Paid') DEFAULT 'Pending',
  commission_amount      DECIMAL(10,2) DEFAULT 0.00,
  start_date             DATE,
  thirty_day_checkpoint  DATE,                            -- start_date + 30 days
  payment_method         ENUM('M-Pesa','EcoCash','Cash','Bank Transfer'),
  date_paid              DATE,
  admin_notes            TEXT,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_claims_agent FOREIGN KEY (agent_id)
    REFERENCES agents(id) ON DELETE CASCADE,
  INDEX idx_claims_agent_id (agent_id),
  INDEX idx_claims_status (status),
  INDEX idx_claims_claim_id (claim_id)
);

-- Admin settings table ---------------------------------------
CREATE TABLE IF NOT EXISTS admin_settings (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  setting_key   VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default settings -------------------------------------------
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('fixed_fee_per_student', '1000'),
  ('school_name', 'Remedial School Affiliate Program')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
