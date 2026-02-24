import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Clock, ArrowRight, Trash2, MoreVertical, Copy, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspacePath } from '@/hooks/useWorkspacePath';
import { Pyramid } from '../../types';

interface PyramidCardProps {
  pyramid: Pyramid;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, currentTitle: string) => void;
}

const PyramidCard: React.FC<PyramidCardProps> = ({ pyramid, onDelete, onDuplicate, onRename }) => {
  const navigate = useNavigate();
  const wp = useWorkspacePath();

  const handleOpen = () => {
    navigate(wp(`/pyramid/${pyramid.id}`));
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${pyramid.title}"?`)) {
      onDelete(pyramid.id);
    }
  };

  const handleDuplicate = () => {
    onDuplicate(pyramid.id);
  };

  const handleRename = () => {
    onRename(pyramid.id, pyramid.title);
  };

  // Format date safely
  const formatDate = (timestamp: Date | null | undefined) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Just now';
    
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card 
      className="cursor-pointer relative group h-full flex flex-col bg-card border-border shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl" 
      onClick={handleOpen}
    >
      <CardContent className="flex flex-col gap-3 h-full p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="block mb-1 truncate tracking-tight text-foreground text-lg font-bold" title={pyramid.title}>
              {pyramid.title}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock size={12} />
                <span className="text-xs font-medium">
                  {formatDate(pyramid.createdAt)}
                </span>
              </div>
            </div>
          </div>
          
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRename}>
                  <Edit2 size={14} className="mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy size={14} className="mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex justify-end items-center mt-auto pt-2">
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleOpen(); }}>
            Open <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PyramidCard;
