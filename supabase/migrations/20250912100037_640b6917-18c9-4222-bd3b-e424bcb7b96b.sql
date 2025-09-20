-- Break RLS recursion between groups and group_members
-- 1) Drop existing SELECT policies that cause cross-table recursion
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Users can view group members of groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can manage group members" ON public.group_members;

-- 2) Create helper security definer functions (avoid querying same table as the policy's relation)
CREATE OR REPLACE FUNCTION public.is_member_of_group(group_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id_param AND gm.user_id = user_id_param
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(group_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id_param AND g.created_by = user_id_param
  );
$$;

-- 3) Recreate policies using the helper functions to avoid recursion
-- Groups: do NOT reference group_members directly; only use function
CREATE POLICY "Users can view groups they belong to"
ON public.groups
FOR SELECT
USING (
  created_by = auth.uid() OR public.is_member_of_group(id, auth.uid())
);

-- Group members: reference groups via helper function (safe, not same table)
CREATE POLICY "Users can view group members of groups they belong to"
ON public.group_members
FOR SELECT
USING (
  public.is_group_owner(group_id, auth.uid()) OR public.is_member_of_group(group_id, auth.uid())
);

-- Group creators can manage group members (INSERT/UPDATE/DELETE)
CREATE POLICY "Group creators can manage group members"
ON public.group_members
FOR ALL
USING (public.is_group_owner(group_id, auth.uid()))
WITH CHECK (public.is_group_owner(group_id, auth.uid()));