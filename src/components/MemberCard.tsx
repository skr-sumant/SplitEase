import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Calendar, Edit2 } from 'lucide-react';
import { EditMemberDialog } from './EditMemberDialog';

interface Member {
  id: string;
  name: string;
  email?: string;
  user_id?: string;
  joined_at: string;
}

interface MemberCardProps {
  member: Member;
  isOwner: boolean;
  onUpdate: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, isOwner, onUpdate }) => {
  const [showEditDialog, setShowEditDialog] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{member.name}</h3>
              {member.email && (
                <div className="flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{member.email}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={member.user_id ? "default" : "secondary"}>
              {member.user_id ? "Active" : "Pending"}
            </Badge>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditDialog(true)}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
      
      <EditMemberDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        member={member}
        onSuccess={onUpdate}
      />
    </Card>
  );
};