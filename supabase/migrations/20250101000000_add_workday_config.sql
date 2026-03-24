-- Add workday_config column to companies table
-- Stores an array of integer day indices (0=Sunday, 1=Monday, ..., 6=Saturday)
-- NULL means use application default [1,2,3,4,5] (Monday-Friday)
ALTER TABLE companies ADD COLUMN workday_config integer[];
