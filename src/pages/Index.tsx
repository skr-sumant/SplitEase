import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, IndianRupee, Bell, Smartphone } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">SplitEase</h1>
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Split Bills with Ease</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Simplify group expenses, track payments, and settle up effortlessly. 
            Perfect for trips, dinners, roommates, and any shared expenses.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Start Splitting Bills
            </Button>
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-16">
          <Card className="text-center p-6">
            <CardContent className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Create Groups</h3>
              <p className="text-muted-foreground">
                Add friends, roommates, or travel companions to expense groups
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto">
                <IndianRupee className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Track Expenses</h3>
              <p className="text-muted-foreground">
                Log expenses and automatically split costs among group members
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Get Reminders</h3>
              <p className="text-muted-foreground">
                Automated email reminders help ensure everyone pays their share
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Real-time Updates</h3>
              <p className="text-muted-foreground">
                See payments instantly when members mark their expenses as paid
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of users who have simplified their group expenses
          </p>
          <Link to="/auth">
            <Button size="lg">Create Free Account</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 SplitEase. Making bill splitting simple.</p>
          <p> <strong>Made with ❤️ by the SplitEase Team.</strong> </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
