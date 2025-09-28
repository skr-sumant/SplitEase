import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Users, Receipt, Trash2, UserPlus } from 'lucide-react';
import { ExpenseDialogWithPayments } from '@/components/ExpenseDialogWithPayments';
import { ExpenseCard } from '@/components/ExpenseCard';
import { MemberCard } from '@/components/MemberCard';
import { AddMemberDialog } from '@/components/AddMemberDialog';

interface GroupData {
  id: string;
  name: string;
  description?: string;
  created_by: string;
}

interface Member {
  id: string;
  name: string;
  email?: string;
  user_id?: string;
  joined_at: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  description?: string;
  created_at: string;
  paid_by: string;
  splits: Array<{
    id: string;
    member_name: string;
    member_email?: string;
    amount: number;
    paid: boolean;
  }>;
}

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const { toast } = useToast();

  // Real-time subscription for member updates
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel('group-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          console.log('Member change detected:', payload);
          // Refresh member data when changes occur
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchMembers = async () => {
    if (!groupId) return;
    
    try {
      const { data: membersData, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error) throw error;
      setMembers(membersData || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);

      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Fetch members
      await fetchMembers();

      // Fetch expenses with splits
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_splits(*)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;
      
      const formattedExpenses = expensesData?.map(expense => ({
        ...expense,
        splits: expense.expense_splits || [],
      })) || [];

      setExpenses(formattedExpenses);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch group data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p>Group not found</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const isOwner = user?.id === group.created_by;

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{group.name}</h1>
              {group.description && (
                <p className="text-muted-foreground">{group.description}</p>
              )}
            </div>
            {isOwner && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteGroup}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Group
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-muted-foreground">Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{expenses.length}</p>
                  <p className="text-muted-foreground">Expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{totalExpenses.toFixed(2)}</p>
                  <p className="text-muted-foreground">Total Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
            
            <Button onClick={() => setShowAddExpense(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>

          <TabsContent value="expenses" className="space-y-4">
            {expenses.length === 0 ? (
              <Card className="text-center p-8">
                <CardContent>
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first expense to start tracking
                  </p>
                  <Button onClick={() => setShowAddExpense(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <ExpenseCard 
                    key={expense.id} 
                    expense={expense} 
                    onUpdate={fetchGroupData}
                    currentUserId={user?.id}
                    groupName={group.name}
                    members={members}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Members ({members.length})</h3>
              {isOwner && (
                <Button onClick={() => setShowAddMember(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <MemberCard 
                  key={member.id} 
                  member={member} 
                  isOwner={isOwner}
                  onUpdate={fetchGroupData}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <ExpenseDialogWithPayments
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        groupId={groupId!}
        members={members}
        onSuccess={fetchGroupData}
      />
      
      <AddMemberDialog
        open={showAddMember}
        onOpenChange={setShowAddMember}
        groupId={groupId!}
        onSuccess={fetchGroupData}
      />
    </div>
  );
};

export default GroupDetail;