import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Create user function started.");

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, role, full_name, studentId, balance } = await req.json();
    console.log("Received data for new user:", { email, role, full_name });

    // Basic validation
    if (!email || !password || !role || !full_name) {
      return new Response(JSON.stringify({ error: 'Email, password, role, and full_name are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service_role key
    // These environment variables are automatically available in Supabase Edge Functions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log("Supabase admin client created.");

    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the user since an admin is creating them
    });

    if (authError) {
      console.error("Auth error:", authError.message);
      throw new Error(`Auth error: ${authError.message}`);
    }

    const newUserId = authData.user.id;
    console.log("Successfully created user in auth.users with ID:", newUserId);

    // 2. Create the profile in public.profiles
    const profileData: any = {
      id: newUserId,
      full_name: full_name,
      email: email,
      role: role,
    };

    if (role === 'STUDENT') {
      profileData.student_id = studentId;
      profileData.balance = balance || 0;
    }
    console.log("Preparing to insert into profiles:", profileData);

    const { error: profileError } = await supabaseAdmin.from('profiles').insert(profileData);

    if (profileError) {
      // If profile creation fails, delete the auth user to keep things clean (transactional).
      console.error("Profile error, attempting to clean up auth user:", profileError.message);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      console.log("Cleaned up auth user:", newUserId);
      throw new Error(`Profile error: ${profileError.message}`);
    }

    console.log("Successfully created user profile.");

    return new Response(JSON.stringify({ message: 'User created successfully', userId: newUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Caught a top-level error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
