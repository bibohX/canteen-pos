-- Grant necessary permissions to the 'anon' role, which is used by the client-side application.

-- 1. Grant usage on the public schema.
-- This allows the 'anon' role to even see the schema.
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Grant SELECT access on all tables.
-- This allows the app to read data from these tables.
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT ON TABLE public.orders TO anon;
GRANT SELECT ON TABLE public.order_items TO anon;

-- 3. Grant permissions for creating, updating, and deleting data.
-- These are required for the Admin Dashboard and POS functionality.
GRANT INSERT, UPDATE, DELETE ON TABLE public.products TO anon;
GRANT INSERT, UPDATE ON TABLE public.profiles TO anon;
GRANT INSERT ON TABLE public.orders TO anon; -- For creating top-up records

-- 4. Grant permission to execute the checkout function.
-- This allows the Staff POS to process orders.
GRANT EXECUTE ON FUNCTION public.process_order(p_user_id uuid, p_items public.cart_item[]) TO anon;


-- NOTE ON SECURITY:
-- These grants provide broad access for development purposes. For a production application,
-- you should enable Row Level Security (RLS) on your tables and define specific,
-
-- fine-grained policies to control who can see and do what.
-- For example, a user should only be able to see their own profile, not all profiles.
-- The current setup allows any app user to read all data in these tables.
