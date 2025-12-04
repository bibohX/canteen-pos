-- First, create a custom type to represent a cart item.
CREATE TYPE public.cart_item AS (
    product_id UUID,
    quantity INT
);

-- Then, create the function that will process the entire order transaction.
CREATE OR REPLACE FUNCTION public.process_order(
    p_user_id UUID,        -- The ID of the student making the purchase.
    p_items public.cart_item[] -- An array of the items in the cart.
)
RETURNS TEXT -- Returns a success or error message.
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to run with the permissions of the one who created it.
AS $$
DECLARE
    v_total_cost NUMERIC := 0;
    v_student_balance NUMERIC;
    v_order_id UUID;
    item public.cart_item;
    v_product_record RECORD;
BEGIN
    -- Lock the student's profile row to prevent race conditions.
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF v_student_balance IS NULL THEN
        RETURN 'Error: Student not found.';
    END IF;

    -- Calculate total cost from the database prices and check stock for every item.
    FOR item IN SELECT * FROM unnest(p_items)
    LOOP
        SELECT price, stock INTO v_product_record FROM public.products WHERE id = item.product_id FOR UPDATE;

        IF v_product_record IS NULL THEN
            RETURN 'Error: Product with ID ' || item.product_id || ' not found.';
        END IF;

        IF v_product_record.stock < item.quantity THEN
            RETURN 'Error: Insufficient stock for product ID ' || item.product_id || '.';
        END IF;

        v_total_cost := v_total_cost + (v_product_record.price * item.quantity);
    END LOOP;

    -- Check if the student can afford the purchase.
    IF v_student_balance < v_total_cost THEN
        RETURN 'Error: Insufficient balance.';
    END IF;

    -- All checks passed. Proceed with the transaction.

    -- 1. Create the main order record.
    INSERT INTO public.orders (user_id, total_amount, type)
    VALUES (p_user_id, v_total_cost, 'PURCHASE')
    RETURNING id INTO v_order_id;

    -- 2. Update student's balance.
    UPDATE public.profiles SET balance = balance - v_total_cost WHERE id = p_user_id;

    -- 3. Loop through items again to update stock and create order_item records.
    FOR item IN SELECT * FROM unnest(p_items)
    LOOP
        -- Decrease product stock.
        UPDATE public.products SET stock = stock - item.quantity WHERE id = item.product_id;

        -- Create the link record between the order and the product.
        INSERT INTO public.order_items (order_id, product_id, quantity)
        VALUES (v_order_id, item.product_id, item.quantity);
    END LOOP;

    -- If we got this far, everything was successful.
    RETURN 'Success';
END;
$$;
