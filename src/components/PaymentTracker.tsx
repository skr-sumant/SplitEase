import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { IndianRupee, Plus, User, Calendar, Calculator, AlertCircle, CheckCircle, ArrowUpRight, Mail } from 'lucide-react';
import { calculatePending, generatePaymentMessage, type MemberPayment, type PaymentCalculationResult } from '@/lib/expenseCalculator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Payment {
  id: string;
  paid_by_name: string;
  paid_by_email?: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
}

interface Member {
  id: string;
  name: string;
  email?: string;
}

interface PaymentTrackerProps {
  expenseId: string;
  totalAmount: number;
  members: Member[];
  onPaymentAdded: () => void;
}

export const PaymentTracker: React.FC<PaymentTrackerProps> = ({
  expenseId,
  totalAmount,
  members,
  onPaymentAdded
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [newPayment, setNewPayment] = useState({
    paidBy: '',
    amount: '',
    paymentMethod: 'cash',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, [expenseId]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_payments')
        .select('*')
        .eq('expense_id', expenseId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedMember = members.find(m => m.id === newPayment.paidBy);
    if (!selectedMember) {
      toast({
        title: "Error",
        description: "Please select a member",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newPayment.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('expense_payments')
        .insert({
          expense_id: expenseId,
          paid_by_user_id: selectedMember.id,
          paid_by_name: selectedMember.name,
          paid_by_email: selectedMember.email,
          amount: amount,
          payment_method: newPayment.paymentMethod,
          notes: newPayment.notes || null
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Payment recorded successfully",
      });

      setNewPayment({
        paidBy: '',
        amount: '',
        paymentMethod: 'cash',
        notes: ''
      });
      setIsDialogOpen(false);
      fetchPayments();
      onPaymentAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    
    // Get members who owe money
    const membersWhoOwe = calculationResults.filter(result => result.status === 'owes');
    
    if (membersWhoOwe.length === 0) {
      toast({
        title: "No reminders needed",
        description: "All members are settled up!",
      });
      setSendingReminders(false);
      return;
    }

    try {
      // Send reminders to each member who owes money
      const reminderPromises = membersWhoOwe.map(async (result) => {
        const member = members.find(m => m.name === result.member);
        if (!member?.email) {
          console.warn(`No email found for member: ${result.member}`);
          return;
        }

        const reminderMessage = generatePaymentMessage(result);
        
        const { error } = await supabase.functions.invoke('send-payment-reminder', {
          body: {
            memberName: result.member,
            memberEmail: member.email,
            amount: result.pending,
            reminderMessage: reminderMessage,
            reminderType: 'email'
          }
        });

        if (error) throw error;
      });

      await Promise.all(reminderPromises);

      toast({
        title: "Reminders sent!",
        description: `Payment reminders sent to ${membersWhoOwe.length} member(s)`,
      });
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast({
        title: "Error sending reminders",
        description: error.message || "Failed to send some reminders",
        variant: "destructive",
      });
    } finally {
      setSendingReminders(false);
    }
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = totalAmount - totalPaid;

  // Calculate pending amounts using the new logic
  const memberPayments: MemberPayment = {};
  
  // Initialize all members with 0 payments
  members.forEach(member => {
    memberPayments[member.name] = 0;
  });
  
  // Add actual payments for each member
  payments.forEach(payment => {
    if (memberPayments.hasOwnProperty(payment.paid_by_name)) {
      memberPayments[payment.paid_by_name] += payment.amount;
    }
  });

  const calculationResults = calculatePending(totalAmount, memberPayments);

  if (loading) return <div>Loading payments...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Payment Tracking</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paidBy">Paid By</Label>
                  <Select value={newPayment.paidBy} onValueChange={(value) => 
                    setNewPayment(prev => ({ ...prev, paidBy: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={newPayment.paymentMethod} onValueChange={(value) => 
                    setNewPayment(prev => ({ ...prev, paymentMethod: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes..."
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Record Payment</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Expense</p>
            <p className="text-lg font-semibold">₹{totalAmount.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold text-green-600">₹{totalPaid.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className={`text-lg font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{remaining.toFixed(2)}
            </p>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Payment History</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{payment.paid_by_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(payment.payment_date).toLocaleDateString()}
                        <Badge variant="outline" className="text-xs">
                          {payment.payment_method}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{payment.amount.toFixed(2)}</p>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground">{payment.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Settlement Calculation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Settlement Breakdown</h4>
            </div>
            
            {calculationResults.some(result => result.status === 'owes') && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendReminders}
                disabled={sendingReminders}
                className="gap-1"
              >
                <Mail className="h-4 w-4" />
                {sendingReminders ? 'Sending...' : 'Send Reminders'}
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            {calculationResults.map((result) => (
              <div 
                key={result.member} 
                className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                  result.status === 'owes' 
                    ? 'border-l-red-500 bg-red-50/50' 
                    : result.status === 'receives' 
                    ? 'border-l-green-500 bg-green-50/50' 
                    : 'border-l-blue-500 bg-blue-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.status === 'owes' ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : result.status === 'receives' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  )}
                  
                  <div>
                    <p className="text-sm font-medium">{result.member}</p>
                    <p className="text-xs text-muted-foreground">
                      Paid: ₹{memberPayments[result.member].toFixed(2)} | Share: ₹{(totalAmount / members.length).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  {result.status === 'owes' && (
                    <div>
                      <p className="text-sm font-medium text-red-700">Owes ₹{result.pending.toFixed(2)}</p>
                      <p className="text-xs text-red-600">Needs to pay</p>
                    </div>
                  )}
                  {result.status === 'receives' && (
                    <div>
                      <p className="text-sm font-medium text-green-700">Gets ₹{result.pending.toFixed(2)}</p>
                      <p className="text-xs text-green-600">Should receive</p>
                    </div>
                  )}
                  {result.status === 'settled' && (
                    <div>
                      <p className="text-sm font-medium text-blue-700">Settled</p>
                      <p className="text-xs text-blue-600">All good!</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {remaining <= 0 && (
          <Badge className="w-full justify-center bg-green-100 text-green-800 hover:bg-green-100">
            ✓ Expense Fully Paid
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};