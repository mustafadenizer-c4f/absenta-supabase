-- Add hierarchy_profile to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS hierarchy_profile TEXT NOT NULL DEFAULT 'departments'
    CHECK (hierarchy_profile IN ('flat', 'groups', 'departments', 'teams'));

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add team_id to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);
