-- Migration: Add organizational hierarchy (Company → Group → Department) and role-based management
-- This migration creates the companies, groups, and departments tables,
-- extends the users table with role and org assignment columns,
-- and migrates existing boolean flags to the new role field.

-- 1. Create companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create groups table (belongs to a company)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create departments table (belongs to a group)
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Alter users table: add role and org assignment columns
ALTER TABLE users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('staff', 'manager', 'group_manager', 'general_manager', 'admin')),
  ADD COLUMN company_id UUID REFERENCES companies(id),
  ADD COLUMN group_id UUID REFERENCES groups(id),
  ADD COLUMN department_id UUID REFERENCES departments(id),
  ADD COLUMN manager_id UUID REFERENCES users(id);

-- 5. Migrate existing boolean flags to the new role field
UPDATE users SET role = 'admin' WHERE is_admin = true;
UPDATE users SET role = 'manager' WHERE is_manager = true AND is_admin = false;
UPDATE users SET role = 'staff' WHERE is_manager = false AND is_admin = false;
