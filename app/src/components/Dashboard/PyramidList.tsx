import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pyramid } from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical, Trash2, ArrowRight, Layers, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PyramidListProps {
  pyramids: Pyramid[];
  onDelete: (id: string, title: string) => void;
}

const PyramidList: React.FC<PyramidListProps> = ({ pyramids, onDelete }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {pyramids.map(pyramid => (
        <Card 
            key={pyramid.id} 
            className="cursor-pointer relative group h-full flex flex-col hover:shadow-md transition-all border-l-4 border-l-blue-500" 
            onClick={() => navigate(`/pyramid/${pyramid.id}`)}
        >
            <CardContent className="p-4 flex flex-col gap-3 h-full">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-bold text-lg mb-1 truncate text-foreground flex items-center gap-2">
                            <Layers size={16} className="text-blue-500" />
                            {pyramid.title}
                        </h3>
                        <div className="flex items-center gap-1">
                            <Clock size={12} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                                {pyramid.lastModified ? new Date(pyramid.lastModified).toLocaleDateString() : 'Just now'}
                            </span>
                        </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                    <MoreVertical size={16} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onDelete(pyramid.id, pyramid.title)} className="text-red-600 focus:text-red-600 cursor-pointer">
                                    <Trash2 size={14} className="mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                
                {pyramid.problemStatement && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {pyramid.problemStatement}
                    </p>
                )}

                <div className="flex justify-end items-center mt-auto pt-2">
                    <Button variant="ghost" size="sm" className="cursor-pointer">
                        Open <ArrowRight size={14} className="ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PyramidList;
