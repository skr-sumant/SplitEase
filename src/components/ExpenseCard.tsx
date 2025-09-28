import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, IndianRupee, Check, Clock, Mail, MessageCircle, MoreVertical, TrendingUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentTracker } from './PaymentTracker';

interface ExpenseSplit {
  id: string;
  member_name: string;
  member_email?: string;
  amount: number;
  paid: boolean;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  description?: string;
  created_at: string;
  paid_by: string;
  splits: ExpenseSplit[];
}

interface Member {
  id: string;
  name: string;
  email?: string;
}

interface ExpenseCardProps {
  expense: Expense;
  onUpdate: () => void;
  currentUserId?: string;
  groupName?: string;
  members?: Member[];
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ 
  expense, 
  onUpdate, 
  currentUserId,
  groupName = "Your Group",
  members = []
}) => {
  const { toast } = useToast();
  const [isReminderSending, setIsReminderSending] = useState<string | null>(null);
  
  const handleMarkAsPaid = async (splitId: string) => {
    try {
      const { error } = await supabase
        .from('expense_splits')
        .update({ 
          paid: true, 
          paid_at: new Date().toISOString() 
        })
        .eq('id', splitId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Payment marked as complete",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendReminder = async (split: ExpenseSplit, reminderType: 'email' | 'whatsapp') => {
    if (!split.member_email) {
      toast({
        title: "Error",
        description: "Member email not available for reminder",
        variant: "destructive",
      });
      return;
    }

    setIsReminderSending(split.id);

    try {
      // Generate payment link - for now using the app URL, in future could integrate with payment providers
      const paymentLink = `${window.location.origin}/expense/${expense.id}/pay?split=${split.id}`;
      
      const { error } = await supabase.functions.invoke('send-payment-reminder', {
        body: {
          expenseId: expense.id,
          memberEmail: split.member_email,
          memberName: split.member_name,
          expenseTitle: expense.title,
          amount: split.amount,
          groupName: groupName,
          reminderType: reminderType,
          paymentLink: paymentLink
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${reminderType === 'email' ? 'Email' : 'WhatsApp'} reminder sent to ${split.member_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send ${reminderType} reminder`,
        variant: "destructive",
      });
    } finally {
      setIsReminderSending(null);
    }
  };

  const totalPaid = expense.splits.filter(split => split.paid).length;
  const totalSplits = expense.splits.length;
  const userSplit = expense.splits.find(split => 
    split.member_email && currentUserId // Would need to match by email/user ID
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{expense.title}</h3>
            {expense.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {expense.description}
              </p>
            )}
          </div>
          <Badge variant={totalPaid === totalSplits ? "default" : "secondary"}>
            {totalPaid}/{totalSplits} paid
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">₹{expense.amount.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(expense.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Split Details</h4>
          <div className="space-y-2">
            {expense.splits.map((split) => (
              <div key={split.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  {split.paid ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{split.member_name}</p>
                    {split.member_email && (
                      <p className="text-xs text-muted-foreground">{split.member_email}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">₹{split.amount.toFixed(2)}</span>
                  {!split.paid && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsPaid(split.id)}
                        className="gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Mark Paid
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isReminderSending === split.id}
                            className="gap-1"
                          >
                            <MoreVertical className="h-3 w-3" />
                            {isReminderSending === split.id ? 'Sending...' : 'Remind'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleSendReminder(split, 'email')}
                            className="gap-2"
                          >
                            <Mail className="h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSendReminder(split, 'whatsapp')}
                            className="gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Send WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <PaymentTracker 
          expenseId={expense.id}
          totalAmount={expense.amount}
          members={members}
          onPaymentAdded={onUpdate}
        />
      </CardContent>
    </Card>
  );
};