-- Add payment tracking to expenses
CREATE TABLE public.expense_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  paid_by_user_id UUID,
  paid_by_name TEXT NOT NULL,
  paid_by_email TEXT,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expense_payments
ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_payments
CREATE POLICY "Users can view payments of groups they belong to" 
ON public.expense_payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN groups g ON e.group_id = g.id
    WHERE e.id = expense_payments.expense_id 
    AND (
      g.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM group_members gm 
        WHERE gm.group_id = g.id AND gm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Group members can add payments" 
ON public.expense_payments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN groups g ON e.group_id = g.id
    WHERE e.id = expense_payments.expense_id 
    AND (
      g.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM group_members gm 
        WHERE gm.group_id = g.id AND gm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update payments they created" 
ON public.expense_payments 
FOR UPDATE 
USING (paid_by_user_id = auth.uid());

CREATE POLICY "Users can delete payments they created" 
ON public.expense_payments 
FOR DELETE 
USING (paid_by_user_id = auth.uid());

-- Add trigger for timestamp updates
CREATE TRIGGER update_expense_payments_updated_at
BEFORE UPDATE ON public.expense_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add a column to track payment links/references
ALTER TABLE public.expense_splits 
ADD COLUMN payment_reference TEXT,
ADD COLUMN payment_method TEXT DEFAULT 'pending';