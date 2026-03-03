-- FIX: Infinite RLS Recursion and Missing Notification Policies

-- 1. STABILIZE: user_roles (Remove recursion)
-- The "Staff can view all roles" policy was recursive because it queried the same table.
-- We replace it with a direct check against the JWT metadata if possible, 
-- or a non-recursive subquery if we must. 
-- However, for user_roles, we can use a simpler approach.

DROP POLICY IF EXISTS "Staff can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Allow users to see their own role (Non-recursive)
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = id);

-- Allow staff/admin/owner to see all roles (Non-recursive)
-- We use a direct check on the table without triggering the policy again 
-- by using a SECURITY DEFINER function or checking the auth.uid() directly.
-- A better way to avoid recursion in user_roles is to use a specific policy logic:
CREATE POLICY "Staff can view all roles" ON public.user_roles
  FOR SELECT USING (
    (SELECT role FROM public.user_roles WHERE id = auth.uid()) IN ('staff', 'admin', 'owner')
  );
-- Note: Subqueries in USING clauses can still be tricky. 
-- The most stable way is to use the has_role function which is already SECURITY DEFINER.
-- But wait, has_role queries user_roles. If has_role is SECURITY DEFINER, it bypasses RLS.
-- So we can use has_role safely here IF it's correctly defined.

-- Let's re-verify has_role is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role("_user_id" uuid, "_required_role" public.app_role) 
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER -- SECURITY DEFINER is key here
SET search_path = public
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

-- Now the policies can use has_role safely
DROP POLICY IF EXISTS "Staff can view all roles" ON public.user_roles;
CREATE POLICY "Staff can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'staff'));

-- 2. FIX: Missing Notifications RLS
-- Currently notifications are enabled for RLS but have no policies, so they are invisible.
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true); -- Triggers and system logic usually handle this

-- 3. FIX: Posts visibility (Ensure it's not recursive)
DROP POLICY IF EXISTS "Posts visibility" ON public.posts;
CREATE POLICY "Posts visibility" ON public.posts
  FOR SELECT USING (
    status = 'public' 
    OR auth.uid() = author_id 
    OR public.has_role(auth.uid(), 'staff')
  );

-- 4. FIX: Users can create posts (as requested)
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts" ON public.posts 
  FOR INSERT WITH CHECK (
    auth.uid() = author_id 
    AND public.has_role(auth.uid(), 'user')
  );
