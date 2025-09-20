-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create group members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id),
  UNIQUE(group_id, email)
);

-- Enable RLS on group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create expense splits table
CREATE TABLE public.expense_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(expense_id, user_id),
  UNIQUE(expense_id, member_email)
);

-- Enable RLS on expense_splits
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Group policies - users can see groups they are members of or created
CREATE POLICY "Users can view groups they belong to" 
ON public.groups 
FOR SELECT 
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Group creators can delete their groups" 
ON public.groups 
FOR DELETE 
USING (created_by = auth.uid());

-- Group members policies
CREATE POLICY "Users can view group members of groups they belong to" 
ON public.group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Group creators can manage group members" 
ON public.group_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND created_by = auth.uid()
  )
);

-- Expense policies
CREATE POLICY "Users can view expenses of groups they belong to" 
ON public.expenses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Group members can create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (
  paid_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Expense creators can update their expenses" 
ON public.expenses 
FOR UPDATE 
USING (paid_by = auth.uid());

CREATE POLICY "Expense creators can delete their expenses" 
ON public.expenses 
FOR DELETE 
USING (paid_by = auth.uid());

-- Expense splits policies
CREATE POLICY "Users can view expense splits of groups they belong to" 
ON public.expense_splits 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.groups g ON e.group_id = g.id
    WHERE e.id = expense_id AND (
      g.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Expense creators can manage splits" 
ON public.expense_splits 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE id = expense_id AND paid_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own split payment status" 
ON public.expense_splits 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());