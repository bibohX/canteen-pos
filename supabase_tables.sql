CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text,
    avatar_url text,
    role text NOT NULL,
    balance numeric DEFAULT 0,
    student_id text UNIQUE
);

CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    image text,
    category text,
    "isAvailable" boolean DEFAULT TRUE,
    stock integer DEFAULT 0
);

CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    total_amount numeric NOT NULL,
    type text NOT NULL
);

CREATE TABLE public.order_items (
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity integer NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
