import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_HIERARCHY_PROFILES = ['flat', 'groups', 'departments', 'teams']

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // --- Caller Authorization ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'supervisor') {
      return new Response(JSON.stringify({ error: 'Only supervisors can create companies' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Request Body Validation ---
    const { name, hierarchy_profile, phone, contact_email, contract_number } = await req.json()

    if (!name || !hierarchy_profile || !phone || !contact_email || !contract_number) {
      return new Response(JSON.stringify({ error: 'All fields are required: name, hierarchy_profile, phone, contact_email, contract_number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isValidEmail(contact_email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!VALID_HIERARCHY_PROFILES.includes(hierarchy_profile)) {
      return new Response(JSON.stringify({ error: `Invalid hierarchy_profile. Must be one of: ${VALID_HIERARCHY_PROFILES.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Step 1: Insert company ---
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        hierarchy_profile,
        phone,
        contact_email,
        contract_number,
        status: true,
      })
      .select()
      .single()

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: `Failed to create company: ${companyError?.message ?? 'Unknown error'}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Step 2: Create Supabase Auth user ---
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
      email: contact_email,
      password: 'Pp123456',
      email_confirm: true,
    })

    if (authUserError) {
      // Rollback: delete the company we just created
      await supabaseAdmin.from('companies').delete().eq('id', company.id)

      // Handle duplicate email
      if (authUserError.message?.toLowerCase().includes('already registered')) {
        return new Response(JSON.stringify({ error: 'email already in use' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: `Failed to create auth user: ${authUserError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Step 3: Insert user row ---
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: contact_email,
        full_name: name,
        role: 'admin',
        company_id: company.id,
        requires_password_change: true,
      })

    if (userInsertError) {
      // Rollback: delete auth user and company
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      await supabaseAdmin.from('companies').delete().eq('id', company.id)

      return new Response(JSON.stringify({ error: `Failed to create admin user record: ${userInsertError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ company, admin_user_id: authUser.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
