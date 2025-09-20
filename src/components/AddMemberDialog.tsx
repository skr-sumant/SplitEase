import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X } from 'lucide-react';

interface Member {
  name: string;
  email: string;
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onSuccess: () => void;
}

export const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  open,
  onOpenChange,
  groupId,
  onSuccess,
}) => {
  const [members, setMembers] = useState<Member[]>([{ name: '', email: '' }]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addMember = () => {
    setMembers([...members, { name: '', email: '' }]);
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, field: keyof Member, value: string) => {
    const updatedMembers = [...members];
    updatedMembers[index][field] = value;
    setMembers(updatedMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validMembers = members.filter(m => m.name.trim() && m.email.trim());
    if (validMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one member with name and email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const memberInserts = validMembers.map(member => ({
        group_id: groupId,
        name: member.name.trim(),
        email: member.email.trim(),
        user_id: null, // Will be linked when user signs up with this email
      }));

      const { error } = await supabase
        .from('group_members')
        .insert(memberInserts);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${validMembers.length} member(s) added successfully`,
      });
      
      // Reset form
      setMembers([{ name: '', email: '' }]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
          <DialogDescription>
            Add new members to this group. They will be notified when expenses are shared.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Members</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMember}
                className="gap-2"
              >
                <Plus className="h-3 w-3" />
                Add Another
              </Button>
            </div>

            {members.map((member, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Member name"
                    value={member.name}
                    onChange={(e) => updateMember(index, 'name', e.target.value)}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Member email"
                    value={member.email}
                    onChange={(e) => updateMember(index, 'email', e.target.value)}
                    required
                  />
                </div>
                {members.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeMember(index)}
                    className="mt-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Members'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};