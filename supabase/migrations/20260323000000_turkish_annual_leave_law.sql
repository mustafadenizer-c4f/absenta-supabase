-- Migration: Turkish Annual Leave Law (4857 sayılı İş Kanunu)
-- Adds birth_date to users, extends leave_balances with seniority fields,
-- and creates the collective_leaves table.

-- 1. Add birth_date column to users (for age-based minimum entitlement calculation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE public.users ADD COLUMN birth_date DATE;
  END IF;
END $$;

-- 2. Extend leave_balances with seniority-based entitlement fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leave_balances' AND column_name = 'base_entitlement'
  ) THEN
    ALTER TABLE public.leave_balances ADD COLUMN base_entitlement INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leave_balances' AND column_name = 'negative_from_previous'
  ) THEN
    ALTER TABLE public.leave_balances ADD COLUMN negative_from_previous NUMERIC NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leave_balances' AND column_name = 'seniority_tier'
  ) THEN
    ALTER TABLE public.leave_balances ADD COLUMN seniority_tier TEXT CHECK (seniority_tier IN ('ineligible', 'tier1', 'tier2', 'tier3'));
  END IF;
END $$;

-- 3. Create collective_leaves table
CREATE TABLE IF NOT EXISTS public.collective_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('company', 'group', 'department', 'team')),
  scope_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on collective_leaves and add policies
ALTER TABLE public.collective_leaves ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read collective leaves for their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collective_leaves' AND policyname = 'Users can read collective leaves for their company'
  ) THEN
    CREATE POLICY "Users can read collective leaves for their company"
      ON public.collective_leaves FOR SELECT
      USING (
        company_id IN (
          SELECT u.company_id FROM public.users u WHERE u.id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow admins and supervisors to insert collective leaves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collective_leaves' AND policyname = 'Admins can manage collective leaves'
  ) THEN
    CREATE POLICY "Admins can manage collective leaves"
      ON public.collective_leaves FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'supervisor')
        )
      );
  END IF;
END $$;
