import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  name: string;
  email?: string;
  user_id?: string;
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  members: Member[];
  onSuccess: () => void;
}

interface SplitMember extends Member {
  selected: boolean;
  amount: number;
}

export const ExpenseDialog: React.FC<ExpenseDialogProps> = ({
  open,
  onOpenChange,
  groupId,
  members,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [splitMembers, setSplitMembers] = useState<SplitMember[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open && members.length > 0) {
      const equalSplit = parseFloat(amount) / members.length || 0;
      setSplitMembers(
        members.map(member => ({
          ...member,
          selected: true,
          amount: equalSplit,
        }))
      );
    }
  }, [open, members, amount]);

  const updateSplitAmount = (memberId: string, newAmount: string) => {
    setSplitMembers(prev =>
      prev.map(member =>
        member.id === memberId
          ? { ...member, amount: parseFloat(newAmount) || 0 }
          : member
      )
    );
  };

  const toggleMemberSelection = (memberId: string) => {
    setSplitMembers(prev =>
      prev.map(member =>
        member.id === memberId
          ? { ...member, selected: !member.selected }
          : member
      )
    );
  };

  const splitEqually = () => {
    const selectedMembers = splitMembers.filter(m => m.selected);
    if (selectedMembers.length === 0) return;

    const equalAmount = parseFloat(amount) / selectedMembers.length;
    setSplitMembers(prev =>
      prev.map(member =>
        member.selected
          ? { ...member, amount: equalAmount }
          : member
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !user) return;

    const selectedMembers = splitMembers.filter(m => m.selected);
    if (selectedMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one member to split with",
        variant: "destructive",
      });
      return;
    }

    const totalSplit = selectedMembers.reduce((sum, m) => sum + m.amount, 0);
    const expenseAmount = parseFloat(amount);

    if (Math.abs(totalSplit - expenseAmount) > 0.01) {
      toast({
        title: "Error",
        description: "Split amounts must equal the total expense amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert([
          {
            group_id: groupId,
            title: title.trim(),
            amount: expenseAmount,
            description: description.trim() || null,
            paid_by: user.id,
          },
        ])
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create expense splits
      const splitInserts = selectedMembers.map(member => ({
        expense_id: expense.id,
        user_id: member.user_id,
        member_name: member.name,
        member_email: member.email,
        amount: member.amount,
        paid: false,
      }));

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitInserts);

      if (splitsError) throw splitsError;

      toast({
        title: "Success!",
        description: "Expense added successfully",
      });

      // Reset form
      setTitle('');
      setAmount('');
      setDescription('');
      setSplitMembers([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-title">Title *</Label>
            <Input
              id="expense-title"
              placeholder="e.g. Hotel booking, Restaurant bill"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-amount">Amount *</Label>
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-description">Description</Label>
            <Textarea
              id="expense-description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Split Between</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={splitEqually}
                disabled={!amount}
              >
                Split Equally
              </Button>
            </div>

            <div className="space-y-3">
              {splitMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={member.selected}
                    onCheckedChange={() => toggleMemberSelection(member.id)}
                  />
                  
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    {member.email && (
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                  
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={member.amount.toString()}
                      onChange={(e) => updateSplitAmount(member.id, e.target.value)}
                      disabled={!member.selected}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              Total: ${splitMembers.filter(m => m.selected).reduce((sum, m) => sum + m.amount, 0).toFixed(2)} 
              / ${amount || '0.00'}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};