import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from 'lucide-react';
import { createPyramid } from '../../services/pyramidService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CreatePyramidModal: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    
    setLoading(true);
    try {
      const pyramidId = await createPyramid(user.uid, title);
      setOpen(false);
      // Reset state
      setTitle('');
      
      // Small delay to allow modal to close visually before navigating
      setTimeout(() => {
        navigate(`/pyramid/${pyramidId}`);
      }, 100);
    } catch (error) {
      console.error(error);
      alert('Failed to create pyramid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> New Pyramid
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create New Pyramid</DialogTitle>
          <DialogDescription>
            Start a new problem-solving session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="title">
              Pyramid Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Q3 Sales Strategy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!title.trim() || loading}>
            {loading ? 'Creating...' : 'Create Pyramid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePyramidModal;
