


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'owner',
    'admin',
    'staff',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."ban_type" AS ENUM (
    'sell_ban',
    'full_ban'
);


ALTER TYPE "public"."ban_type" OWNER TO "postgres";


CREATE TYPE "public"."listing_status" AS ENUM (
    'active',
    'sold',
    'paused',
    'draft',
    'hidden',
    'flagged'
);


ALTER TYPE "public"."listing_status" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'processing',
    'delivered',
    'cancelled',
    'disputed'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."post_status" AS ENUM (
    'public',
    'hidden',
    'flagged'
);


ALTER TYPE "public"."post_status" OWNER TO "postgres";


CREATE TYPE "public"."post_takedown_status" AS ENUM (
    'pending',
    'author_responded',
    'cancelled',
    'confirmed'
);


ALTER TYPE "public"."post_takedown_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_type" AS ENUM (
    'posts',
    'listings'
);


ALTER TYPE "public"."subscription_type" OWNER TO "postgres";


CREATE TYPE "public"."takedown_status" AS ENUM (
    'pending',
    'seller_responded',
    'cancelled',
    'confirmed'
);


ALTER TYPE "public"."takedown_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_order_status_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- If current status is disputed
    IF (OLD.status = 'disputed') THEN
        -- Allow if it's a staff member
        IF (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)) THEN
            RETURN NEW;
        END IF;

        -- Allow if it's the buyer AND they are resolving it (changing from disputed to delivered)
        IF (auth.uid() = OLD.buyer_id AND NEW.status = 'delivered') THEN
            RETURN NEW;
        END IF;

        -- Otherwise, block it
        RAISE EXCEPTION 'Disputed orders can only be managed by staff or resolved by the buyer.';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_order_status_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_listing_favorites_on_hide"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if the listing has become "hidden" or "unavailable"
  IF (NEW.is_invisible = true AND (OLD.is_invisible = false OR OLD.is_invisible IS NULL)) OR
     (NEW.status IN ('sold', 'hidden') AND OLD.status = 'active') THEN
    
    -- Delete all favorite records for this listing
    DELETE FROM public.listing_favorites 
    WHERE listing_id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cleanup_listing_favorites_on_hide"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_resolved_listing_takedowns"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.listing_takedowns
  WHERE resolved_at IS NOT NULL
  AND resolved_at < now() - interval '1 day';
END;
$$;


ALTER FUNCTION "public"."cleanup_resolved_listing_takedowns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_resolved_post_takedowns"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- ELITE LOGIC: Only delete if the record HAS a resolved_at timestamp AND it's older than 1 day
  -- If resolved_at is NULL (Pending/Responded), the record is NEVER deleted
  DELETE FROM public.post_takedowns
  WHERE resolved_at IS NOT NULL
  AND resolved_at < now() - interval '1 day';
END;
$$;


ALTER FUNCTION "public"."cleanup_resolved_post_takedowns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_order_dispute_messages"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.order_messages WHERE order_id = p_order_id;
END;
$$;


ALTER FUNCTION "public"."delete_order_dispute_messages"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_own_user"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- Ensure the user is authenticated and can only delete their own record
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from auth.users
  -- This will cascade delete their profile and other linked data
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."delete_own_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_seller_stats"("p_seller_id" "uuid") RETURNS TABLE("avg_rating" numeric, "total_reviews" bigint, "total_sales" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    COALESCE(AVG(r.rating)::NUMERIC(3,2), 0) AS avg_rating,
    COUNT(DISTINCT r.id) AS total_reviews,
    COUNT(DISTINCT o.id) AS total_sales
  FROM profiles p
  LEFT JOIN orders o ON o.seller_id = p.id AND o.status = 'delivered'
  LEFT JOIN reviews r ON r.seller_id = p.id
  WHERE p.id = p_seller_id;
$$;


ALTER FUNCTION "public"."get_seller_stats"("p_seller_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_service_stats"("p_seller_id" "uuid", "p_game" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text") RETURNS TABLE("avg_rating" numeric, "total_reviews" bigint, "total_sales" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    COALESCE(AVG(r.rating)::NUMERIC(3,2), 0),
    COUNT(DISTINCT r.id),
    COUNT(DISTINCT o.id)
  FROM listings l
  LEFT JOIN orders o ON o.listing_id = l.id AND o.status = 'delivered'
  LEFT JOIN reviews r ON r.listing_id = l.id
  WHERE l.seller_id = p_seller_id
    AND (p_game IS NULL OR l.game = p_game)
    AND (p_category IS NULL OR l.category = p_category);
$$;


ALTER FUNCTION "public"."get_service_stats"("p_seller_id" "uuid", "p_game" "text", "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_listing_takedown_resolution_timer"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (NEW.status = 'cancelled'::public.takedown_status OR NEW.status = 'confirmed'::public.takedown_status) 
     AND (OLD.status != NEW.status OR OLD.resolved_at IS NULL) THEN
    NEW.resolved_at = now();
  ELSIF (NEW.status = 'pending'::public.takedown_status OR NEW.status = 'seller_responded'::public.takedown_status) THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_listing_takedown_resolution_timer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_listing_visibility_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_order_count integer;
    v_review_count integer;
BEGIN
    -- Handle DELETE: Decide between Hard Delete (Purge) or Soft Delete
    IF (TG_OP = 'DELETE') THEN
        -- Check for associated data
        SELECT count(*) INTO v_order_count FROM public.orders WHERE listing_id = OLD.id;
        SELECT count(*) INTO v_review_count FROM public.reviews WHERE listing_id = OLD.id;

        -- If no orders and no reviews, allow the hard delete to happen
        IF (v_order_count = 0 AND v_review_count = 0) THEN
            RETURN OLD;
        ELSE
            -- Otherwise, perform soft delete instead
            UPDATE public.listings 
            SET is_invisible = TRUE, 
                status = 'hidden',
                updated_at = now()
            WHERE id = OLD.id;

            -- Cancel Active Orders (this shouldn't happen if v_order_count was 0, but good for safety)
            UPDATE public.orders
            SET status = 'cancelled',
                updated_at = now()
            WHERE listing_id = OLD.id
            AND status IN ('pending', 'processing');

            -- Return NULL to block the actual row deletion
            RETURN NULL;
        END IF;
    END IF;

    -- Handle UPDATE: Standard visibility logic
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.status != 'active' AND OLD.status = 'active') OR (NEW.is_invisible = TRUE AND OLD.is_invisible = FALSE) THEN
            -- Update all Active Orders (Pending/Processing) to Cancelled
            UPDATE public.orders
            SET status = 'cancelled',
                updated_at = now()
            WHERE listing_id = NEW.id
            AND status IN ('pending', 'processing');
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_listing_visibility_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_order_message_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_buyer_id UUID;
  v_seller_id UUID;
BEGIN
  -- Get order participants
  SELECT buyer_id, seller_id INTO v_buyer_id, v_seller_id
  FROM public.orders
  WHERE id = NEW.order_id;

  -- If sender is buyer, mark as unread for seller, read for buyer
  IF NEW.sender_id = v_buyer_id THEN
    UPDATE public.orders 
    SET seller_read = false, buyer_read = true, updated_at = now() 
    WHERE id = NEW.order_id;
  -- If sender is seller, mark as unread for buyer, read for seller
  ELSIF NEW.sender_id = v_seller_id THEN
    UPDATE public.orders 
    SET buyer_read = false, seller_read = true, updated_at = now() 
    WHERE id = NEW.order_id;
  -- If sender is staff, mark as unread for both
  ELSE
    UPDATE public.orders 
    SET seller_read = false, buyer_read = false, staff_read = true, updated_at = now() 
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_order_message_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_one_time_listing_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_stock integer;
BEGIN
    -- Get current stock
    SELECT stock INTO v_stock FROM public.listings WHERE id = NEW.listing_id;

    -- If stock is set (not null) and order reaches confirmed status
    IF v_stock IS NOT NULL AND (NEW.status IN ('processing', 'delivered')) AND (OLD.status NOT IN ('processing', 'delivered')) THEN
        
        -- Decrement stock
        IF v_stock > 0 THEN
            UPDATE public.listings 
            SET stock = v_stock - 1,
                -- If stock becomes 0 after this decrement, mark as sold
                status = CASE WHEN v_stock - 1 <= 0 THEN 'sold'::listing_status ELSE status END,
                updated_at = now()
            WHERE id = NEW.listing_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_one_time_listing_sale"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_takedown_resolution_timer"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If status changes TO a resolved state, start the 24h timer
  IF (NEW.status = 'cancelled'::public.post_takedown_status OR NEW.status = 'confirmed'::public.post_takedown_status) 
     AND (OLD.status != NEW.status OR OLD.resolved_at IS NULL) THEN
    NEW.resolved_at = now();
  -- If it moves away from resolved (unlikely but safe), kill the timer
  ELSIF (NEW.status = 'pending'::public.post_takedown_status OR NEW.status = 'author_responded'::public.post_takedown_status) THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_takedown_resolution_timer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_required_role" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role public.app_role;
BEGIN
    SELECT role INTO user_role FROM public.user_roles WHERE id = _user_id;
    IF user_role IS NULL THEN RETURN FALSE; END IF;
    IF user_role = 'owner' THEN RETURN TRUE; END IF;
    IF _required_role = 'owner' THEN RETURN user_role = 'owner'; END IF;
    IF _required_role = 'admin' THEN RETURN user_role = 'admin'; END IF;
    IF _required_role = 'staff' THEN RETURN user_role = 'staff'; END IF;
    IF _required_role = 'user' THEN RETURN TRUE; END IF;
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_required_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_banned"("_user_id" "uuid", "_ban_type" "public"."ban_type" DEFAULT NULL::"public"."ban_type") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = _user_id
      AND active = true
      AND (_ban_type IS NULL OR ban_type = _ban_type OR ban_type = 'full_ban')
  )
$$;


ALTER FUNCTION "public"."is_user_banned"("_user_id" "uuid", "_ban_type" "public"."ban_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_management_action"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_username text;
BEGIN
    SELECT username INTO current_username FROM public.profiles WHERE id = auth.uid();
    
    INSERT INTO public.audit_logs (
        user_id,
        username,
        action_type,
        target_table,
        target_record_id,
        description,
        old_data,
        new_data
    ) VALUES (
        auth.uid(),
        COALESCE(current_username, 'System/Unknown'),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text 
            ELSE NEW.id::text 
        END,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'Created new record in ' || TG_TABLE_NAME
            WHEN TG_OP = 'UPDATE' THEN 'Updated record in ' || TG_TABLE_NAME
            WHEN TG_OP = 'DELETE' THEN 'Deleted record from ' || TG_TABLE_NAME
        END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_management_action"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_order_messages_read"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1. Mark individual messages as read (where current user is NOT the sender)
  UPDATE public.order_messages
  SET read = true
  WHERE order_id = p_order_id
  AND sender_id != auth.uid();

  -- 2. Update the main order read flags (existing logic)
  UPDATE public.orders
  SET 
    buyer_read = CASE WHEN buyer_id = auth.uid() THEN true ELSE buyer_read END,
    seller_read = CASE WHEN seller_id = auth.uid() THEN true ELSE seller_read END,
    staff_read = CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('staff', 'admin', 'owner')) THEN true ELSE staff_read END
  WHERE id = p_order_id;
END;
$$;


ALTER FUNCTION "public"."mark_order_messages_read"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_seller_orders_read"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.orders 
    SET seller_read = TRUE 
    WHERE seller_id = auth.uid() 
    AND status != 'disputed'; -- Keep disputed unread until chat is opened
END;
$$;


ALTER FUNCTION "public"."mark_seller_orders_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_dispute"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_seller_id uuid;
    v_listing_title text;
    v_staff_id uuid;
BEGIN
    -- Only run if status changed to 'disputed'
    IF (OLD.status != 'disputed' AND NEW.status = 'disputed') THEN
        -- BLOCK if it was already disputed once
        IF (OLD.was_disputed = TRUE) THEN
            RAISE EXCEPTION 'This order has already been through a dispute process and cannot be disputed again.';
        END IF;

        SELECT o.seller_id, l.title INTO v_seller_id, v_listing_title
        FROM orders o
        JOIN listings l ON l.id = o.listing_id
        WHERE o.id = NEW.id;

        -- Notify Seller
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
            v_seller_id,
            'Order Disputed',
            'Your order for "' || v_listing_title || '" has been disputed by the buyer.',
            'dispute',
            '/dashboard'
        );

        -- Notify Staff (all users with staff role)
        FOR v_staff_id IN SELECT id FROM user_roles WHERE role IN ('staff'::app_role, 'admin'::app_role, 'owner'::app_role) LOOP
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (
                v_staff_id,
                'New Dispute',
                'A new dispute has been filed for "' || v_listing_title || '".',
                'staff_dispute',
                '/staff'
            );
        END LOOP;
        
        NEW.dispute_at = now();
        -- Mark as was_disputed as soon as it starts (or we can do it on resolve)
        -- Doing it on start ensures even if they cancel immediately, it counts as 1 dispute.
        NEW.was_disputed = TRUE;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_dispute"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_new_listing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Handle both INSERT and status UPDATE to 'active'
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active')) THEN
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT 
      s.follower_id,
      'New Listing from ' || p.username,
      NEW.title,
      'new_listing',
      '/games?game=' || NEW.game || '&listingId=' || NEW.id
    FROM public.user_subscriptions s
    JOIN public.profiles p ON p.id = NEW.seller_id
    WHERE s.following_id = NEW.seller_id 
      AND s.sub_type = 'listings';
  END IF;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."notify_on_new_listing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_new_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Handle both INSERT and status UPDATE to 'public'
  -- TG_OP check handles the OLD reference restriction for INSERTS
  IF (TG_OP = 'INSERT' AND NEW.status = 'public') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'public' AND (OLD.status IS NULL OR OLD.status != 'public')) THEN
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT 
      s.follower_id,
      'New Post from ' || p.username,
      NEW.title,
      'new_post',
      '/news/' || NEW.id
    FROM public.user_subscriptions s
    JOIN public.profiles p ON p.id = NEW.author_id
    WHERE s.following_id = NEW.author_id 
      AND s.sub_type = 'posts';
  END IF;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."notify_on_new_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_order_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_buyer_id uuid;
    v_seller_id uuid;
    v_listing_title text;
    v_sender_username text;
    v_staff_id uuid;
BEGIN
    -- Get order and listing info
    SELECT o.buyer_id, o.seller_id, l.title INTO v_buyer_id, v_seller_id, v_listing_title
    FROM public.orders o
    JOIN public.listings l ON l.id = o.listing_id
    WHERE o.id = NEW.order_id;

    -- Get sender username
    SELECT username INTO v_sender_username FROM public.profiles WHERE id = NEW.sender_id;

    -- UPDATE READ FLAGS ON ORDER
    -- If sender is buyer, seller and staff haven't read this new message
    IF (NEW.sender_id = v_buyer_id) THEN
        UPDATE public.orders SET seller_read = FALSE, staff_read = FALSE WHERE id = NEW.order_id;
    -- If sender is seller, buyer and staff haven't read this new message
    ELSIF (NEW.sender_id = v_seller_id) THEN
        UPDATE public.orders SET buyer_read = FALSE, staff_read = FALSE WHERE id = NEW.order_id;
    -- If sender is staff, buyer and seller haven't read this new message
    ELSE
        UPDATE public.orders SET buyer_read = FALSE, seller_read = FALSE WHERE id = NEW.order_id;
    END IF;

    -- Legacy Notification System (keep for the notification bell/dropdown)
    -- Notify Buyer
    IF (NEW.sender_id != v_buyer_id) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        VALUES (v_buyer_id, 'New Message', v_sender_username || ': ' || LEFT(NEW.message, 50), 'dispute_message', '/order-history', jsonb_build_object('order_id', NEW.order_id));
    END IF;

    -- Notify Seller
    IF (NEW.sender_id != v_seller_id) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        VALUES (v_seller_id, 'New Message', v_sender_username || ': ' || LEFT(NEW.message, 50), 'dispute_message', '/dashboard', jsonb_build_object('order_id', NEW.order_id));
    END IF;

    -- Notify Staff
    FOR v_staff_id IN SELECT id FROM public.user_roles WHERE role IN ('staff', 'admin', 'owner') AND id != NEW.sender_id LOOP
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        VALUES (v_staff_id, 'Staff: New Message', v_sender_username || ' [' || v_listing_title || ']: ' || LEFT(NEW.message, 50), 'staff_dispute_message', '/staff', jsonb_build_object('order_id', NEW.order_id));
    END LOOP;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_order_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_seller_on_dispute"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'disputed' AND (OLD.status IS NULL OR OLD.status != 'disputed') THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.seller_id,
      'dispute',
      'Order Disputed',
      'A buyer has filed a dispute on order #' || LEFT(NEW.id::text, 8) || '. Please review.',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_seller_on_dispute"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."passive_cleanup_resolved_listing_takedowns_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.cleanup_resolved_listing_takedowns();
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."passive_cleanup_resolved_listing_takedowns_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."passive_cleanup_resolved_takedowns_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.cleanup_resolved_post_takedowns();
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."passive_cleanup_resolved_takedowns_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_dispute"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_buyer_id uuid;
    v_status order_status;
    v_username text;
BEGIN
    SELECT buyer_id, status INTO v_buyer_id, v_status FROM public.orders WHERE id = p_order_id;
    SELECT username INTO v_username FROM public.profiles WHERE id = auth.uid();

    IF v_buyer_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the buyer can resolve their dispute';
    END IF;

    IF v_status != 'disputed' THEN
        RAISE EXCEPTION 'Order is not in disputed status';
    END IF;

    -- Update order: clear dispute data and set status to delivered
    UPDATE public.orders 
    SET status = 'delivered',
        dispute_reason = NULL,
        dispute_at = NULL,
        was_disputed = TRUE, -- Ensure it's marked
        updated_at = now()
    WHERE id = p_order_id;

    -- Delete dispute messages (chat data)
    PERFORM public.delete_order_dispute_messages(p_order_id);

    -- Log action
    INSERT INTO public.audit_logs (user_id, username, action_type, target_table, target_record_id, description)
    VALUES (auth.uid(), COALESCE(v_username, 'System'), 'UPDATE', 'orders', p_order_id::text, 'Buyer resolved dispute for order');
END;
$$;


ALTER FUNCTION "public"."resolve_dispute"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_dispute_as_staff"("p_order_id" "uuid", "p_resolution" "public"."order_status") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_status order_status;
    v_username text;
BEGIN
    -- Check if caller is staff
    IF NOT (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)) THEN
        RAISE EXCEPTION 'Unauthorized: Staff only';
    END IF;

    SELECT status INTO v_status FROM public.orders WHERE id = p_order_id;
    SELECT username INTO v_username FROM public.profiles WHERE id = auth.uid();

    IF v_status != 'disputed' THEN
        RAISE EXCEPTION 'Order is not in disputed status';
    END IF;

    IF p_resolution NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid resolution status. Must be delivered or cancelled.';
    END IF;

    -- Update order: clear dispute data and set resolution status
    UPDATE public.orders 
    SET status = p_resolution,
        dispute_reason = NULL,
        dispute_at = NULL,
        was_disputed = TRUE, -- Ensure it's marked
        updated_at = now()
    WHERE id = p_order_id;

    -- Delete dispute messages (chat data)
    PERFORM public.delete_order_dispute_messages(p_order_id);

    -- Log action
    INSERT INTO public.audit_logs (user_id, username, action_type, target_table, target_record_id, description)
    VALUES (auth.uid(), COALESCE(v_username, 'Staff'), 'UPDATE', 'orders', p_order_id::text, 'Staff resolved dispute as ' || p_resolution);
END;
$$;


ALTER FUNCTION "public"."resolve_dispute_as_staff"("p_order_id" "uuid", "p_resolution" "public"."order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_post_dislikes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET dislikes_count = dislikes_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_post_dislikes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_post_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_post_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_dislikes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE posts SET dislikes_count = dislikes_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE posts SET dislikes_count = dislikes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_post_dislikes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_post_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "public"."app_role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    performer_role public.app_role;
    performer_username text;
BEGIN
    SELECT role INTO performer_role FROM public.user_roles WHERE id = auth.uid();
    SELECT username INTO performer_username FROM public.profiles WHERE id = auth.uid();
    
    -- Only Owner can set Owner role
    IF new_role = 'owner' AND (performer_role IS NULL OR performer_role != 'owner') THEN
        RAISE EXCEPTION 'Only owners can appoint other owners';
    END IF;

    -- Only Admin/Owner can change roles
    IF performer_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized to change roles';
    END IF;

    INSERT INTO public.user_roles (id, role)
    VALUES (target_user_id, new_role)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

    -- Log action to the new audit_logs table
    INSERT INTO public.audit_logs (
        user_id, 
        username,
        action_type, 
        target_table, 
        target_record_id, 
        description,
        new_data
    )
    VALUES (
        auth.uid(), 
        COALESCE(performer_username, 'System'),
        'UPDATE', 
        'user_roles', 
        target_user_id::text, 
        'Updated user role to ' || new_role,
        jsonb_build_object('new_role', new_role)
    );
END;
$$;


ALTER FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "public"."app_role") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "username" "text",
    "action_type" "text" NOT NULL,
    "target_table" "text",
    "target_record_id" "text",
    "description" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buyer_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "favorite_games" "text"[] DEFAULT '{}'::"text"[],
    "favorite_categories" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."buyer_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faq_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" "text" DEFAULT 'General'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "published" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."faq_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "tag_name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."game_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."help_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" DEFAULT 'Getting Started'::"text" NOT NULL,
    "icon" "text" DEFAULT 'BookOpen'::"text",
    "published" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."help_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."listing_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_takedown_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "takedown_id" "uuid",
    "sender_id" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."listing_takedown_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_takedowns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "reason" "text",
    "seller_response" "text",
    "status" "public"."takedown_status" DEFAULT 'pending'::"public"."takedown_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."listing_takedowns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "game" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "quantity" "text",
    "image_url" "text",
    "status" "public"."listing_status" DEFAULT 'active'::"public"."listing_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_invisible" boolean DEFAULT false,
    "is_one_time_listing" boolean DEFAULT false,
    "stock" integer,
    "category" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "listings_price_check" CHECK (("price" > (0)::numeric))
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "link" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read" boolean DEFAULT false
);


ALTER TABLE "public"."order_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "buyer_uuid" "text",
    "payment_method" "text",
    "dispute_reason" "text",
    "dispute_at" timestamp with time zone,
    "was_disputed" boolean DEFAULT false,
    "seller_read" boolean DEFAULT false,
    "buyer_read" boolean DEFAULT false,
    "staff_read" boolean DEFAULT true
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "rating" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_comments_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_dislikes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."post_dislikes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_takedown_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "takedown_id" "uuid",
    "sender_id" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."post_takedown_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_takedowns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "reason" "text",
    "author_response" "text",
    "status" "public"."post_takedown_status" DEFAULT 'pending'::"public"."post_takedown_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."post_takedowns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "game" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "image_url" "text",
    "likes_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "links" "text"[] DEFAULT '{}'::"text"[],
    "status" "public"."post_status" DEFAULT 'public'::"public"."post_status" NOT NULL,
    "toc" "jsonb" DEFAULT '[]'::"jsonb",
    "dislikes_count" integer DEFAULT 0
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "buyer_verified" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" DEFAULT 'General'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supported_games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."supported_games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_staff" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_bans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "banned_by" "uuid" NOT NULL,
    "ban_type" "public"."ban_type" NOT NULL,
    "reason" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_bans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'user'::"public"."app_role" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid",
    "following_id" "uuid",
    "sub_type" "public"."subscription_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."buyer_preferences"
    ADD CONSTRAINT "buyer_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buyer_preferences"
    ADD CONSTRAINT "buyer_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "changelog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faq_items"
    ADD CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_tags"
    ADD CONSTRAINT "game_tags_game_id_tag_name_key" UNIQUE ("game_id", "tag_name");



ALTER TABLE ONLY "public"."game_tags"
    ADD CONSTRAINT "game_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."help_articles"
    ADD CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_favorites"
    ADD CONSTRAINT "listing_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_favorites"
    ADD CONSTRAINT "listing_favorites_user_id_listing_id_key" UNIQUE ("user_id", "listing_id");



ALTER TABLE ONLY "public"."listing_takedown_messages"
    ADD CONSTRAINT "listing_takedown_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_takedowns"
    ADD CONSTRAINT "listing_takedowns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_dislikes"
    ADD CONSTRAINT "post_dislikes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_dislikes"
    ADD CONSTRAINT "post_dislikes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_takedown_messages"
    ADD CONSTRAINT "post_takedown_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_takedowns"
    ADD CONSTRAINT "post_takedowns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_reviewer_id_key" UNIQUE ("order_id", "reviewer_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supported_games"
    ADD CONSTRAINT "supported_games_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."supported_games"
    ADD CONSTRAINT "supported_games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_replies"
    ADD CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_bans"
    ADD CONSTRAINT "user_bans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("id", "role");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_follower_id_following_id_sub_type_key" UNIQUE ("follower_id", "following_id", "sub_type");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_listing_favorites_listing" ON "public"."listing_favorites" USING "btree" ("listing_id");



CREATE INDEX "idx_listing_favorites_user" ON "public"."listing_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_listings_seller_id" ON "public"."listings" USING "btree" ("seller_id");



CREATE INDEX "idx_listings_status" ON "public"."listings" USING "btree" ("status");



CREATE INDEX "idx_orders_buyer_id" ON "public"."orders" USING "btree" ("buyer_id");



CREATE INDEX "idx_orders_seller_id" ON "public"."orders" USING "btree" ("seller_id");



CREATE OR REPLACE TRIGGER "before_order_status_update" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."check_order_status_update"();



CREATE OR REPLACE TRIGGER "on_listing_hidden_cleanup_favorites" AFTER UPDATE OF "is_invisible", "status" ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_listing_favorites_on_hide"();



CREATE OR REPLACE TRIGGER "on_listing_invisible_cancel_orders" BEFORE DELETE OR UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_listing_visibility_change"();



CREATE OR REPLACE TRIGGER "on_listing_resolution_cleanup_trigger" AFTER UPDATE OF "status" ON "public"."listing_takedowns" FOR EACH STATEMENT EXECUTE FUNCTION "public"."passive_cleanup_resolved_listing_takedowns_trigger"();



CREATE OR REPLACE TRIGGER "on_listing_takedown_resolution_timer" BEFORE UPDATE ON "public"."listing_takedowns" FOR EACH ROW EXECUTE FUNCTION "public"."handle_listing_takedown_resolution_timer"();



CREATE OR REPLACE TRIGGER "on_new_listing_notification" AFTER INSERT OR UPDATE OF "status" ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_new_listing"();



CREATE OR REPLACE TRIGGER "on_new_order_message_notification" AFTER INSERT ON "public"."order_messages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_order_message_notification"();



CREATE OR REPLACE TRIGGER "on_new_post_notification" AFTER INSERT OR UPDATE OF "status" ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_new_post"();



CREATE OR REPLACE TRIGGER "on_order_disputed" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."notify_seller_on_dispute"();



CREATE OR REPLACE TRIGGER "on_order_disputed_notify" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_dispute"();



CREATE OR REPLACE TRIGGER "on_order_message_sent" AFTER INSERT ON "public"."order_messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_order_message"();



CREATE OR REPLACE TRIGGER "on_order_success_deactivate_listing" AFTER INSERT OR UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_one_time_listing_sale"();



CREATE OR REPLACE TRIGGER "on_post_dislike_sync_final" AFTER INSERT OR DELETE ON "public"."post_dislikes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_post_dislikes_count"();



CREATE OR REPLACE TRIGGER "on_post_like_sync_final" AFTER INSERT OR DELETE ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_post_likes_count"();



CREATE OR REPLACE TRIGGER "on_post_takedowns_updated" BEFORE UPDATE ON "public"."post_takedowns" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_resolution_cleanup_trigger" AFTER UPDATE OF "status" ON "public"."post_takedowns" FOR EACH STATEMENT EXECUTE FUNCTION "public"."passive_cleanup_resolved_takedowns_trigger"();



CREATE OR REPLACE TRIGGER "on_takedown_resolution_timer" BEFORE UPDATE ON "public"."post_takedowns" FOR EACH ROW EXECUTE FUNCTION "public"."handle_takedown_resolution_timer"();



CREATE OR REPLACE TRIGGER "tr_log_games" AFTER INSERT OR DELETE OR UPDATE ON "public"."supported_games" FOR EACH ROW EXECUTE FUNCTION "public"."log_management_action"();



CREATE OR REPLACE TRIGGER "tr_log_post_takedowns" AFTER INSERT OR DELETE OR UPDATE ON "public"."post_takedowns" FOR EACH ROW EXECUTE FUNCTION "public"."log_management_action"();



CREATE OR REPLACE TRIGGER "tr_log_support_tickets" AFTER INSERT OR DELETE OR UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."log_management_action"();



CREATE OR REPLACE TRIGGER "tr_log_takedowns" AFTER INSERT OR DELETE OR UPDATE ON "public"."listing_takedowns" FOR EACH ROW EXECUTE FUNCTION "public"."log_management_action"();



CREATE OR REPLACE TRIGGER "tr_log_ticket_replies" AFTER INSERT OR DELETE OR UPDATE ON "public"."ticket_replies" FOR EACH ROW EXECUTE FUNCTION "public"."log_management_action"();



CREATE OR REPLACE TRIGGER "tr_log_user_bans" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_bans" FOR EACH ROW EXECUTE FUNCTION "public"."log_management_action"();



CREATE OR REPLACE TRIGGER "tr_log_user_roles" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."log_management_action"();



CREATE OR REPLACE TRIGGER "update_bans_updated_at" BEFORE UPDATE ON "public"."user_bans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_buyer_preferences_updated_at" BEFORE UPDATE ON "public"."buyer_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_faq_items_updated_at" BEFORE UPDATE ON "public"."faq_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_help_articles_updated_at" BEFORE UPDATE ON "public"."help_articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_listings_updated_at" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_post_comments_updated_at" BEFORE UPDATE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_post_takedowns_updated_at" BEFORE UPDATE ON "public"."post_takedowns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_support_tickets_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_takedowns_updated_at" BEFORE UPDATE ON "public"."listing_takedowns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "changelog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."game_tags"
    ADD CONSTRAINT "game_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."game_tags"
    ADD CONSTRAINT "game_tags_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."supported_games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_favorites"
    ADD CONSTRAINT "listing_favorites_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_favorites"
    ADD CONSTRAINT "listing_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_takedown_messages"
    ADD CONSTRAINT "listing_takedown_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_takedown_messages"
    ADD CONSTRAINT "listing_takedown_messages_takedown_id_fkey" FOREIGN KEY ("takedown_id") REFERENCES "public"."listing_takedowns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_takedowns"
    ADD CONSTRAINT "listing_takedowns_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_takedowns"
    ADD CONSTRAINT "listing_takedowns_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_seller_id_profiles_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."order_messages"
    ADD CONSTRAINT "order_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_messages"
    ADD CONSTRAINT "order_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_id_profiles_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_id_profiles_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_dislikes"
    ADD CONSTRAINT "post_dislikes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_dislikes"
    ADD CONSTRAINT "post_dislikes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_takedown_messages"
    ADD CONSTRAINT "post_takedown_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_takedown_messages"
    ADD CONSTRAINT "post_takedown_messages_takedown_id_fkey" FOREIGN KEY ("takedown_id") REFERENCES "public"."post_takedowns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_takedowns"
    ADD CONSTRAINT "post_takedowns_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supported_games"
    ADD CONSTRAINT "supported_games_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ticket_replies"
    ADD CONSTRAINT "ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_bans"
    ADD CONSTRAINT "user_bans_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_bans"
    ADD CONSTRAINT "user_bans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_id_profiles_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Active listings viewable by everyone" ON "public"."listings" FOR SELECT USING ((("status" = 'active'::"public"."listing_status") AND ("is_invisible" = false)));



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage bans" ON "public"."user_bans" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage orders" ON "public"."orders" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Authors can update their own post takedowns" ON "public"."post_takedowns" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "post_takedowns"."post_id") AND ("posts"."author_id" = "auth"."uid"())))));



CREATE POLICY "Authors can view their own post takedowns" ON "public"."post_takedowns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "post_takedowns"."post_id") AND ("posts"."author_id" = "auth"."uid"())))));



CREATE POLICY "FAQs are viewable by everyone" ON "public"."faq_items" FOR SELECT USING (true);



CREATE POLICY "Game tags are viewable by everyone" ON "public"."game_tags" FOR SELECT USING (true);



CREATE POLICY "Game tags viewable by everyone" ON "public"."game_tags" FOR SELECT USING (true);



CREATE POLICY "Help articles are viewable by everyone" ON "public"."help_articles" FOR SELECT USING (true);



CREATE POLICY "Insert messages" ON "public"."order_messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_messages"."order_id") AND (("orders"."buyer_id" = "auth"."uid"()) OR ("orders"."seller_id" = "auth"."uid"()))))) OR "public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"))));



CREATE POLICY "Listing favorites are viewable by everyone" ON "public"."listing_favorites" FOR SELECT USING (true);



CREATE POLICY "Manage changelog" ON "public"."audit_logs" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Post likes are viewable by everyone" ON "public"."post_likes" FOR SELECT USING (true);



CREATE POLICY "Post moderation" ON "public"."posts" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Posts visibility" ON "public"."posts" FOR SELECT USING ((("status" = 'public'::"public"."post_status") OR ("auth"."uid"() = "author_id") OR "public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role")));



CREATE POLICY "Profiles viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."post_dislikes" FOR SELECT USING (true);



CREATE POLICY "Reviews viewable by everyone" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Sellers can update their own listing takedowns" ON "public"."listing_takedowns" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."listings"
  WHERE (("listings"."id" = "listing_takedowns"."listing_id") AND ("listings"."seller_id" = "auth"."uid"())))));



CREATE POLICY "Sellers can view their own listing takedowns" ON "public"."listing_takedowns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."listings"
  WHERE (("listings"."id" = "listing_takedowns"."listing_id") AND ("listings"."seller_id" = "auth"."uid"())))));



CREATE POLICY "Staff can insert listing takedowns" ON "public"."listing_takedowns" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Staff can insert post takedowns" ON "public"."post_takedowns" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Staff can manage FAQs" ON "public"."faq_items" USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Staff can manage game tags" ON "public"."game_tags" USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Staff can manage help articles" ON "public"."help_articles" USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Staff can manage supported games" ON "public"."supported_games" USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Staff can moderate any listing" ON "public"."listings" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Staff can reply to any ticket" ON "public"."ticket_replies" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role")));



CREATE POLICY "Staff can update listing takedowns" ON "public"."listing_takedowns" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Staff can update post takedowns" ON "public"."post_takedowns" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Staff can view all listing takedowns" ON "public"."listing_takedowns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Staff can view all listings" ON "public"."listings" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Staff can view all post takedowns" ON "public"."post_takedowns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Staff can view all roles" ON "public"."user_roles" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Staff view all orders" ON "public"."orders" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Staff view bans" ON "public"."user_bans" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Subscriptions are viewable by everyone" ON "public"."user_subscriptions" FOR SELECT USING (true);



CREATE POLICY "Support access" ON "public"."support_tickets" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role")));



CREATE POLICY "Support moderation" ON "public"."support_tickets" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "Supported games are viewable by everyone" ON "public"."supported_games" FOR SELECT USING (true);



CREATE POLICY "Supported games viewable by everyone" ON "public"."supported_games" FOR SELECT USING (true);



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Ticket replies viewable by ticket owner and staff" ON "public"."ticket_replies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_replies"."ticket_id") AND (("support_tickets"."user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"))))));



CREATE POLICY "Users can create listings" ON "public"."listings" FOR INSERT WITH CHECK (("auth"."uid"() = "seller_id"));



CREATE POLICY "Users can create posts" ON "public"."posts" FOR INSERT WITH CHECK ((("auth"."uid"() = "author_id") AND "public"."has_role"("auth"."uid"(), 'user'::"public"."app_role")));



CREATE POLICY "Users can create reviews for their own orders" ON "public"."reviews" FOR INSERT WITH CHECK ((("auth"."uid"() = "reviewer_id") AND (EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "reviews"."order_id") AND ("orders"."buyer_id" = "auth"."uid"()) AND ("orders"."status" = 'delivered'::"public"."order_status"))))));



CREATE POLICY "Users can create tickets" ON "public"."support_tickets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own dislikes" ON "public"."post_dislikes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own favorites" ON "public"."listing_favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."post_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own orders" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Users can insert their own dislikes" ON "public"."post_dislikes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own favorites" ON "public"."listing_favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."post_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own listings" ON "public"."listings" USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "Users can manage their own subscriptions" ON "public"."user_subscriptions" USING (("auth"."uid"() = "follower_id")) WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can reply to own tickets" ON "public"."ticket_replies" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_replies"."ticket_id") AND ("support_tickets"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can see messages for their own listing takedowns" ON "public"."listing_takedown_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."listing_takedowns" "td"
     JOIN "public"."listings" "l" ON (("td"."listing_id" = "l"."id")))
  WHERE (("td"."id" = "listing_takedown_messages"."takedown_id") AND (("l"."seller_id" = "auth"."uid"()) OR ("td"."staff_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"])))))));



CREATE POLICY "Users can see messages for their own post takedowns" ON "public"."post_takedown_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."post_takedowns" "td"
     JOIN "public"."posts" "p" ON (("td"."post_id" = "p"."id")))
  WHERE (("td"."id" = "post_takedown_messages"."takedown_id") AND (("p"."author_id" = "auth"."uid"()) OR ("td"."staff_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"])))))));



CREATE POLICY "Users can send messages for their own listing takedowns" ON "public"."listing_takedown_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."listing_takedowns" "td"
     JOIN "public"."listings" "l" ON (("td"."listing_id" = "l"."id")))
  WHERE (("td"."id" = "listing_takedown_messages"."takedown_id") AND (("l"."seller_id" = "auth"."uid"()) OR ("td"."staff_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"])))))));



CREATE POLICY "Users can send messages for their own post takedowns" ON "public"."post_takedown_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."post_takedowns" "td"
     JOIN "public"."posts" "p" ON (("td"."post_id" = "p"."id")))
  WHERE (("td"."id" = "post_takedown_messages"."takedown_id") AND (("p"."author_id" = "auth"."uid"()) OR ("td"."staff_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['staff'::"public"."app_role", 'admin'::"public"."app_role", 'owner'::"public"."app_role"])))))));



CREATE POLICY "Users can update own listings" ON "public"."listings" FOR UPDATE USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own orders" ON "public"."orders" FOR UPDATE USING ((("auth"."uid"() = "buyer_id") OR ("auth"."uid"() = "seller_id")));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own listings" ON "public"."listings" FOR SELECT USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own role" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users view own orders" ON "public"."orders" FOR SELECT USING ((("auth"."uid"() = "buyer_id") OR ("auth"."uid"() = "seller_id")));



CREATE POLICY "View changelog" ON "public"."audit_logs" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role"));



CREATE POLICY "View messages" ON "public"."order_messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR (EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_messages"."order_id") AND (("orders"."buyer_id" = "auth"."uid"()) OR ("orders"."seller_id" = "auth"."uid"()))))) OR "public"."has_role"("auth"."uid"(), 'staff'::"public"."app_role")));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buyer_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faq_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."help_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_takedown_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_takedowns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_dislikes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_takedown_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_takedowns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supported_games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_bans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."audit_logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."game_tags";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."support_tickets";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."supported_games";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ticket_replies";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_roles";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_order_status_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_order_status_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_order_status_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_listing_favorites_on_hide"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_listing_favorites_on_hide"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_listing_favorites_on_hide"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_resolved_listing_takedowns"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_resolved_listing_takedowns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_resolved_listing_takedowns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_resolved_post_takedowns"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_resolved_post_takedowns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_resolved_post_takedowns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_order_dispute_messages"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_order_dispute_messages"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_order_dispute_messages"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_own_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_own_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_own_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_seller_stats"("p_seller_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_seller_stats"("p_seller_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_seller_stats"("p_seller_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_service_stats"("p_seller_id" "uuid", "p_game" "text", "p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_service_stats"("p_seller_id" "uuid", "p_game" "text", "p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_service_stats"("p_seller_id" "uuid", "p_game" "text", "p_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_listing_takedown_resolution_timer"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_listing_takedown_resolution_timer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_listing_takedown_resolution_timer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_listing_visibility_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_listing_visibility_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_listing_visibility_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_order_message_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_order_message_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_order_message_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_one_time_listing_sale"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_one_time_listing_sale"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_one_time_listing_sale"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_takedown_resolution_timer"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_takedown_resolution_timer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_takedown_resolution_timer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_required_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_required_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_required_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_banned"("_user_id" "uuid", "_ban_type" "public"."ban_type") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_banned"("_user_id" "uuid", "_ban_type" "public"."ban_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_banned"("_user_id" "uuid", "_ban_type" "public"."ban_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_management_action"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_management_action"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_management_action"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_order_messages_read"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_order_messages_read"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_order_messages_read"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_seller_orders_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_seller_orders_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_seller_orders_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_dispute"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_dispute"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_dispute"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_new_listing"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_new_listing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_new_listing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_new_post"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_new_post"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_new_post"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_order_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_order_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_order_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_seller_on_dispute"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_seller_on_dispute"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_seller_on_dispute"() TO "service_role";



GRANT ALL ON FUNCTION "public"."passive_cleanup_resolved_listing_takedowns_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."passive_cleanup_resolved_listing_takedowns_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."passive_cleanup_resolved_listing_takedowns_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."passive_cleanup_resolved_takedowns_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."passive_cleanup_resolved_takedowns_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."passive_cleanup_resolved_takedowns_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_dispute"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_dispute"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_dispute"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_dispute_as_staff"("p_order_id" "uuid", "p_resolution" "public"."order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_dispute_as_staff"("p_order_id" "uuid", "p_resolution" "public"."order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_dispute_as_staff"("p_order_id" "uuid", "p_resolution" "public"."order_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_post_dislikes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_post_dislikes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_post_dislikes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_post_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_post_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_post_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_dislikes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_dislikes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_dislikes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "public"."app_role") TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."buyer_preferences" TO "anon";
GRANT ALL ON TABLE "public"."buyer_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."buyer_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."faq_items" TO "anon";
GRANT ALL ON TABLE "public"."faq_items" TO "authenticated";
GRANT ALL ON TABLE "public"."faq_items" TO "service_role";



GRANT ALL ON TABLE "public"."game_tags" TO "anon";
GRANT ALL ON TABLE "public"."game_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."game_tags" TO "service_role";



GRANT ALL ON TABLE "public"."help_articles" TO "anon";
GRANT ALL ON TABLE "public"."help_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."help_articles" TO "service_role";



GRANT ALL ON TABLE "public"."listing_favorites" TO "anon";
GRANT ALL ON TABLE "public"."listing_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."listing_takedown_messages" TO "anon";
GRANT ALL ON TABLE "public"."listing_takedown_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_takedown_messages" TO "service_role";



GRANT ALL ON TABLE "public"."listing_takedowns" TO "anon";
GRANT ALL ON TABLE "public"."listing_takedowns" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_takedowns" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_messages" TO "anon";
GRANT ALL ON TABLE "public"."order_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."order_messages" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."post_comments" TO "anon";
GRANT ALL ON TABLE "public"."post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."post_dislikes" TO "anon";
GRANT ALL ON TABLE "public"."post_dislikes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_dislikes" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."post_takedown_messages" TO "anon";
GRANT ALL ON TABLE "public"."post_takedown_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."post_takedown_messages" TO "service_role";



GRANT ALL ON TABLE "public"."post_takedowns" TO "anon";
GRANT ALL ON TABLE "public"."post_takedowns" TO "authenticated";
GRANT ALL ON TABLE "public"."post_takedowns" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."supported_games" TO "anon";
GRANT ALL ON TABLE "public"."supported_games" TO "authenticated";
GRANT ALL ON TABLE "public"."supported_games" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_replies" TO "anon";
GRANT ALL ON TABLE "public"."ticket_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_replies" TO "service_role";



GRANT ALL ON TABLE "public"."user_bans" TO "anon";
GRANT ALL ON TABLE "public"."user_bans" TO "authenticated";
GRANT ALL ON TABLE "public"."user_bans" TO "service_role";



GRANT ALL ON TABLE "public"."user_follows" TO "anon";
GRANT ALL ON TABLE "public"."user_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."user_follows" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();


  create policy "Authenticated users can upload post images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'post-images'::text));



  create policy "Images are viewable by everyone"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = ANY (ARRAY['post-images'::text, 'game-images'::text, 'avatars'::text, 'listings'::text])));



  create policy "Post images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'post-images'::text));



  create policy "Public Access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Staff can delete game images"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'game-images'::text) AND (public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role))));



  create policy "Staff can upload game images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'game-images'::text) AND (public.has_role(auth.uid(), 'staff'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'owner'::public.app_role))));



  create policy "Staff can upload images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (public.has_role(auth.uid(), 'staff'::public.app_role));



  create policy "Staff can upload post images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'post-images'::text));



  create policy "Users can delete own listing images"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'listing-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete own post images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'post-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update their own avatar"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload listing images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'listing-images'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Users can upload their own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



