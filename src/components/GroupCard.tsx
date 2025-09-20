import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, Calendar } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count: number;
  total_expenses: number;
}

interface GroupCardProps {
  group: Group;
  onUpdate: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group }) => {
  const navigate = useNavigate();

  const handleViewGroup = () => {
    navigate(`/group/${group.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewGroup}>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span className="truncate">{group.name}</span>
        </CardTitle>
        {group.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {group.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{group.member_count} members</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>${group.total_expenses.toFixed(2)} total</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
          </div>

          <Button className="w-full mt-4" onClick={handleViewGroup}>
            View Group
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};