-- Migration: Add supervisor role and extend companies table
-- Adds phone, contact_email, contract_number, status columns to companies.
-- Extends the users role CHECK constraint to include 'supervisor'.
-- Adds RLS policies for supervisor access to companies.

-- 1. Add new columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status BOOLEAN NOT NULL DEFAULT true;

-- 2. Extend role CHECK constraint to include 'supervisor'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('staff', 'manager', 'group_manager', 'general_manager', 'admin', 'supervisor'));

-- 3. Enable RLS on companies (idempotent)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for supervisor access to companies
CREATE POLICY "Supervisors can read all companies"
  ON companies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'supervisor'
  ));

CREATE POLICY "Supervisors can manage companies"
  ON companies FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'supervisor'
  ));
