-- SQL to create an Admin user in Supabase.
-- This script performs a two-step process:
-- 1. Creates an authenticated user entry in Supabase's 'auth.users' table.
-- 2. Creates a corresponding profile entry in your 'public.profiles' table with the 'ADMIN' role.

-- IMPORTANT: This method bypasses email verification and other Supabase Auth flows.
-- It is primarily intended for development, initial setup, or specific admin tasks.
-- For production environments, consider using Supabase's `auth.signUp()` method
-- in your application code, and then assign roles/profiles post-signup.

-- --- STEP 1: CREATE THE AUTHENTICATED USER ---
-- Replace 'admin@example.com' and 'your_strong_password' below with your desired admin credentials.
-- Ensure the email is unique and not already used in your auth.users table.

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Often '00000000-0000-0000-0000-000000000000' for initial setups. Use your actual instance_id if known.
    gen_random_uuid(),                    -- Generates a new unique ID for this user.
    'authenticated',
    'authenticated',
    'admin@example.com',                  -- <<< YOUR DESIRED ADMIN EMAIL HERE
    crypt('your_strong_password', gen_salt('bf')), -- <<< YOUR DESIRED ADMIN PASSWORD HERE
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    now(),
    now()
)
RETURNING id; -- This line is crucial! It will return the UUID of the newly created user.
              -- YOU MUST COPY THIS UUID for the next step.

-- --- STEP 2: CREATE THE USER'S PROFILE IN public.profiles ---
-- After running STEP 1, copy the 'id' (UUID) that it returns.
-- Then, paste that UUID into the 'id' field below.
-- Also, ensure the email matches the one used in STEP 1.

INSERT INTO public.profiles (
    id,                                   -- <<< PASTE THE UUID COPIED FROM STEP 1 HERE
    full_name,
    role,
    email
) VALUES (
    'your-copied-uuid-here',              -- EXAMPLE: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
    'Administrator',
    'ADMIN',
    'admin@example.com'                   -- <<< MATCHES ADMIN EMAIL FROM STEP 1
);
