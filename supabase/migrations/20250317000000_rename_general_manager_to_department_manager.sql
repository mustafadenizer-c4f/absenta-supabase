-- Rename general_manager role to department_manager

-- 1. Update existing users with general_manager role
UPDATE users SET role = 'department_manager' WHERE role = 'general_manager';

-- 2. Drop and re-create the role CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('staff', 'manager', 'group_manager', 'department_manager', 'admin', 'supervisor'));
