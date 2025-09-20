-- Fix infinite recursion in group_members RLS policy
-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view group members of groups they belong to" ON public.group_members;

-- Create a security definer function to check if user is group member
CREATE OR REPLACE FUNCTION public.is_user_group_member(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id_param 
    AND (created_by = user_id_param)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create new policy using the security definer function
CREATE POLICY "Users can view group members of groups they belong to" 
ON public.group_members 
FOR SELECT 
USING (
  public.is_user_group_member(group_id, auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_members.group_id 
    AND created_by = auth.uid()
  )
);