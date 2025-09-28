import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Receipt, IndianRupee } from 'lucide-react';
import { GroupDialog } from '@/components/GroupDialog';
import { GroupCard } from '@/components/GroupCard';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count: number;
  total_expenses: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          created_at,
          group_members!inner(count),
          expenses(amount)
        `);

      if (error) throw error;

      const formattedGroups = data?.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        created_at: group.created_at,
        member_count: group.group_members?.length || 0,
        total_expenses: group.expenses?.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0) || 0,
      })) || [];

      setGroups(formattedGroups);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast({
      title: "Success",
      description: "Signed out successfully!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">SplitEase</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
             Welcome , {user?.user_metadata.full_name || user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Your Groups</h2>
            <p className="text-muted-foreground">Manage your expense groups</p>
          </div>
          <Button onClick={() => setShowCreateGroup(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{groups.length}</p>
                  <p className="text-muted-foreground">Total Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <IndianRupee className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ₹{groups.reduce((sum, g) => sum + g.total_expenses, 0).toFixed(2)}
                  </p>
                  <p className="text-muted-foreground">Total Expenses</p>
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
                  <p className="text-2xl font-bold">
                    {groups.reduce((sum, g) => sum + g.member_count, 0)}
                  </p>
                  <p className="text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {groups.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent>
              <div className="mb-4">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first group to start splitting expenses
              </p>
              <Button onClick={() => setShowCreateGroup(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} onUpdate={fetchGroups} />
            ))}
          </div>
        )}
      </main>

      <GroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onSuccess={fetchGroups}
      />
    </div>
  );
};

export default Dashboard;