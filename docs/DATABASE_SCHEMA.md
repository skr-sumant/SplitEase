# Database Schema Documentation

Complete database schema for the SplitEase expense tracking application using Supabase (PostgreSQL).

## Overview

The database is designed to handle:
- User authentication and profiles
- Group management and membership
- Expense tracking and splitting
- Payment records and history
- Real-time updates and notifications

## Schema Diagram

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   profiles  │    │    groups    │    │ group_members│
├─────────────┤    ├──────────────┤    ├─────────────┤
│ id (PK)     │    │ id (PK)      │◄───┤ id (PK)     │
│ user_id     │    │ name         │    │ group_id    │
│ email       │    │ description  │    │ user_id     │
│ full_name   │    │ created_by   │    │ name        │
│ avatar_url  │    │ created_at   │    │ email       │
│ created_at  │    │ updated_at   │    │ joined_at   │
│ updated_at  │    └──────────────┘    └─────────────┘
└─────────────┘                              │
                                             │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  expenses   │◄───┤ expense_splits│    │expense_payments│
├─────────────┤    ├──────────────┤    ├─────────────┤
│ id (PK)     │    │ id (PK)      │    │ id (PK)     │
│ group_id    │    │ expense_id   │    │ expense_id  │
│ title       │    │ user_id      │    │ paid_by_user_id│
│ amount      │    │ member_name  │    │ paid_by_name│
│ description │    │ member_email │    │ paid_by_email│
│ paid_by     │    │ amount       │    │ amount      │
│ created_at  │    │ paid         │    │ payment_date│
│ updated_at  │    │ paid_at      │    │ payment_method│
└─────────────┘    │ payment_ref  │    │ notes       │
                   │ payment_method│    │ created_at  │
                   └──────────────┘    └─────────────┘
```

## 1. Profiles Table

Stores additional user information beyond Supabase auth.

```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Columns
- **id**: Primary key (UUID)
- **user_id**: References auth.users table (unique)
- **email**: User's email address
- **full_name**: Display name
- **avatar_url**: Profile picture URL
- **created_at**: Record creation timestamp
- **updated_at**: Last update timestamp

### RLS Policies
```sql
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

### Triggers
```sql
-- Auto-create profile on user registration
CREATE TRIGGER handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Auto-update timestamps
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## 2. Groups Table

Represents expense groups (families, trips, roommates, etc.).

```sql
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Columns
- **id**: Primary key (UUID)
- **name**: Group display name
- **description**: Optional group description
- **created_by**: Group owner (user ID)
- **created_at**: Creation timestamp
- **updated_at**: Last update timestamp

### RLS Policies
```sql
-- Users can view groups they belong to
CREATE POLICY "Users can view groups they belong to" 
ON public.groups FOR SELECT 
USING ((created_by = auth.uid()) OR is_member_of_group(id, auth.uid()));

-- Users can create groups
CREATE POLICY "Users can create groups" 
ON public.groups FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Group creators can update their groups
CREATE POLICY "Group creators can update their groups" 
ON public.groups FOR UPDATE 
USING (created_by = auth.uid());

-- Group creators can delete their groups
CREATE POLICY "Group creators can delete their groups" 
ON public.groups FOR DELETE 
USING (created_by = auth.uid());
```

## 3. Group Members Table

Tracks membership in expense groups.

```sql
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Columns
- **id**: Primary key (UUID)
- **group_id**: Reference to groups table
- **user_id**: Optional reference to registered user
- **name**: Member display name
- **email**: Member email (for non-registered users)
- **joined_at**: When member joined group

### Key Features
- **Flexible membership**: Members can be registered users or just names/emails
- **Cascade deletion**: Members are removed when group is deleted
- **Real-time updates**: Changes propagate to connected clients

### RLS Policies
```sql
-- Users can view group members of groups they belong to
CREATE POLICY "Users can view group members of groups they belong to" 
ON public.group_members FOR SELECT 
USING (is_group_owner(group_id, auth.uid()) OR is_member_of_group(group_id, auth.uid()));

-- Group creators can manage group members
CREATE POLICY "Group creators can manage group members" 
ON public.group_members FOR ALL 
USING (is_group_owner(group_id, auth.uid()))
WITH CHECK (is_group_owner(group_id, auth.uid()));
```

## 4. Expenses Table

Records individual expenses within groups.

```sql
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  paid_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Columns
- **id**: Primary key (UUID)
- **group_id**: Reference to groups table
- **title**: Expense description/title
- **amount**: Total expense amount (positive decimal)
- **description**: Optional detailed description
- **paid_by**: User who initially paid the expense
- **created_at**: Creation timestamp
- **updated_at**: Last update timestamp

### Constraints
- **amount > 0**: Ensures positive expense amounts
- **Foreign key cascade**: Expenses deleted when group is deleted

### RLS Policies
```sql
-- Users can view expenses of groups they belong to
CREATE POLICY "Users can view expenses of groups they belong to" 
ON public.expenses FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM groups 
  WHERE groups.id = expenses.group_id 
  AND (groups.created_by = auth.uid() OR is_member_of_group(groups.id, auth.uid()))
));

-- Group members can create expenses
CREATE POLICY "Group members can create expenses" 
ON public.expenses FOR INSERT 
WITH CHECK (paid_by = auth.uid() AND EXISTS (
  SELECT 1 FROM groups 
  WHERE groups.id = expenses.group_id 
  AND (groups.created_by = auth.uid() OR is_member_of_group(groups.id, auth.uid()))
));

-- Expense creators can update their expenses
CREATE POLICY "Expense creators can update their expenses" 
ON public.expenses FOR UPDATE 
USING (paid_by = auth.uid());

-- Expense creators can delete their expenses
CREATE POLICY "Expense creators can delete their expenses" 
ON public.expenses FOR DELETE 
USING (paid_by = auth.uid());
```

## 5. Expense Splits Table

Tracks how expenses are divided among group members.

```sql
CREATE TABLE public.expense_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  member_email TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  payment_method TEXT DEFAULT 'pending'
);
```

### Columns
- **id**: Primary key (UUID)
- **expense_id**: Reference to expenses table
- **user_id**: Optional reference to registered user
- **member_name**: Name of person who owes money
- **member_email**: Email for notifications
- **amount**: Amount owed by this person
- **paid**: Whether this split has been paid
- **paid_at**: Timestamp when marked as paid
- **payment_reference**: External payment reference
- **payment_method**: How payment was made (cash, venmo, etc.)

### Key Features
- **Flexible splits**: Can split unequally among members
- **Payment tracking**: Track payment status and methods
- **Guest support**: Works with non-registered users

### RLS Policies
```sql
-- Users can view expense splits of groups they belong to
CREATE POLICY "Users can view expense splits of groups they belong to" 
ON public.expense_splits FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM expenses e 
  JOIN groups g ON e.group_id = g.id 
  WHERE e.id = expense_splits.expense_id 
  AND (g.created_by = auth.uid() OR is_member_of_group(g.id, auth.uid()))
));

-- Expense creators can manage splits
CREATE POLICY "Expense creators can manage splits" 
ON public.expense_splits FOR ALL 
USING (EXISTS (
  SELECT 1 FROM expenses 
  WHERE expenses.id = expense_splits.expense_id 
  AND expenses.paid_by = auth.uid()
));

-- Users can update their own split payment status
CREATE POLICY "Users can update their own split payment status" 
ON public.expense_splits FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

## 6. Expense Payments Table

Records actual payments made against expenses.

```sql
CREATE TABLE public.expense_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  paid_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_by_name TEXT NOT NULL,
  paid_by_email TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Columns
- **id**: Primary key (UUID)
- **expense_id**: Reference to expenses table
- **paid_by_user_id**: Optional reference to registered user
- **paid_by_name**: Name of person who made payment
- **paid_by_email**: Email of payer
- **amount**: Payment amount
- **payment_date**: When payment was made
- **payment_method**: How payment was made
- **notes**: Optional payment notes
- **created_at**: Record creation timestamp

### Use Cases
- Track who contributed money upfront
- Record partial payments
- Maintain payment history
- Generate payment reports

### RLS Policies
```sql
-- Users can view payments of groups they belong to
CREATE POLICY "Users can view payments of groups they belong to" 
ON public.expense_payments FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM expenses e 
  JOIN groups g ON e.group_id = g.id 
  WHERE e.id = expense_payments.expense_id 
  AND (g.created_by = auth.uid() OR is_member_of_group(g.id, auth.uid()))
));

-- Group members can add payments
CREATE POLICY "Group members can add payments" 
ON public.expense_payments FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM expenses e 
  JOIN groups g ON e.group_id = g.id 
  WHERE e.id = expense_payments.expense_id 
  AND (g.created_by = auth.uid() OR is_member_of_group(g.id, auth.uid()))
));

-- Users can update payments they created
CREATE POLICY "Users can update payments they created" 
ON public.expense_payments FOR UPDATE 
USING (paid_by_user_id = auth.uid());

-- Users can delete payments they created
CREATE POLICY "Users can delete payments they created" 
ON public.expense_payments FOR DELETE 
USING (paid_by_user_id = auth.uid());
```

## 7. Database Functions

### Security Helper Functions

```sql
-- Check if user is group owner
CREATE OR REPLACE FUNCTION public.is_group_owner(group_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id_param AND g.created_by = user_id_param
  );
$$;

-- Check if user is member of group
CREATE OR REPLACE FUNCTION public.is_member_of_group(group_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id_param AND gm.user_id = user_id_param
  );
$$;

-- Check if user has access to group (owner or member)
CREATE OR REPLACE FUNCTION public.is_user_group_member(group_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id_param 
    AND (created_by = user_id_param)
  );
END;
$$;
```

### Utility Functions

```sql
-- Auto-create user profile on registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

## 8. Indexes for Performance

```sql
-- Group membership lookups
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);

-- Expense queries
CREATE INDEX idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at DESC);

-- Expense splits queries
CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON public.expense_splits(user_id);
CREATE INDEX idx_expense_splits_paid ON public.expense_splits(paid);

-- Payment queries
CREATE INDEX idx_expense_payments_expense_id ON public.expense_payments(expense_id);
CREATE INDEX idx_expense_payments_user_id ON public.expense_payments(paid_by_user_id);
CREATE INDEX idx_expense_payments_date ON public.expense_payments(payment_date DESC);

-- Profile lookups
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
```

## 9. Data Validation

### Check Constraints
```sql
-- Ensure positive amounts
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);
ALTER TABLE public.expense_payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
ALTER TABLE public.expense_splits ADD CONSTRAINT splits_amount_non_negative CHECK (amount >= 0);

-- Ensure valid email format (basic check)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure payment method is valid
ALTER TABLE public.expense_payments ADD CONSTRAINT valid_payment_method 
CHECK (payment_method IN ('cash', 'venmo', 'paypal', 'bank_transfer', 'credit_card', 'other'));
```

### Triggers for Data Integrity
```sql
-- Ensure group creators are automatically members
CREATE OR REPLACE FUNCTION ensure_group_creator_is_member()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, name, email)
  SELECT 
    NEW.id,
    NEW.created_by,
    COALESCE(p.full_name, p.email),
    p.email
  FROM public.profiles p
  WHERE p.user_id = NEW.created_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_creator_membership
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION ensure_group_creator_is_member();
```

## 10. Real-time Configuration

### Enable Real-time Replication
```sql
-- Enable real-time for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_payments;
```

### Real-time Filters
Real-time subscriptions are automatically filtered by RLS policies, ensuring users only receive updates for data they have access to.

## 11. Backup and Recovery

### Automated Backups
Supabase automatically:
- Takes daily backups (7-day retention on free tier)
- Provides point-in-time recovery
- Maintains WAL (Write-Ahead Logging)

### Manual Backup Strategy
```bash
# Backup specific tables
pg_dump -h your-db-host -p 5432 -U postgres \
  -t public.groups \
  -t public.group_members \
  -t public.expenses \
  -t public.expense_splits \
  -t public.expense_payments \
  > splitease_backup.sql
```

## 12. Migration Strategy

### Version Control
All schema changes are tracked in `supabase/migrations/` with:
- Timestamp-based file naming
- SQL migration files
- Rollback procedures when needed

### Migration Best Practices
1. **Test migrations** in development first
2. **Backup before migration** in production
3. **Use transactions** for atomic changes
4. **Consider downtime** for major changes
5. **Monitor performance** after migration

This schema provides a robust foundation for the SplitEase expense tracking application with proper security, performance, and scalability considerations.