import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { AiRecommendationButton } from '../../Common/AiRecommendationButton';
import { generateUiUxSuggestion } from '../../../services/anthropic';
import { BaseComponent } from '../../../types/uiUxArchitecture';

interface ComponentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: BaseComponent;
  onSave: (component: BaseComponent) => void;
  onDelete?: () => void;
}

export const ComponentModal: React.FC<ComponentModalProps> = ({ open, onOpenChange, component, onSave, onDelete }) => {
  const [localComponent, setLocalComponent] = useState(component);
  const [newProp, setNewProp] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setLocalComponent(component);
  }, [component, open]);

  const handleChange = (path: string[], value: any) => {
    setLocalComponent(prev => {
      const newComp = JSON.parse(JSON.stringify(prev));
      let current = newComp;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newComp;
    });
  };

  const addRequiredProp = () => {
    if (newProp && !localComponent.main.required_props.includes(newProp)) {
      setLocalComponent(prev => ({
        ...prev,
        main: {
          ...prev.main,
          required_props: [...prev.main.required_props, newProp]
        }
      }));
      setNewProp('');
    }
  };

  const removeRequiredProp = (prop: string) => {
    setLocalComponent(prev => ({
      ...prev,
      main: {
        ...prev.main,
        required_props: prev.main.required_props.filter(p => p !== prop)
      }
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
            <DialogDescription>
              Define component properties, category, and usage details.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Component Name</Label>
              <Input 
                value={localComponent.main.name} 
                onChange={e => handleChange(['main', 'name'], e.target.value)}
                placeholder="e.g., Button, Card, Header"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Input 
                value={localComponent.type} 
                onChange={e => handleChange(['type'], e.target.value)}
                placeholder="e.g., atom, molecule, organism"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Input 
                value={localComponent.main.category} 
                onChange={e => handleChange(['main', 'category'], e.target.value)}
                placeholder="e.g., Navigation, Input, Display"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Description</Label>
                <AiRecommendationButton
                  onGenerate={(apiKey, globalContext) => generateUiUxSuggestion(
                    apiKey,
                    "UI/UX Architecture", 
                    'component',
                    localComponent.main.name || "Unnamed Component",
                    `Category: ${localComponent.main.category}\nType: ${localComponent.type}`,
                    globalContext,
                    'description'
                  )}
                  onSuccess={(result) => handleChange(['main', 'description'], result)}
                  label="AI Suggest"
                />
              </div>
              <Textarea 
                value={localComponent.main.description || ''} 
                onChange={e => handleChange(['main', 'description'], e.target.value)}
                placeholder="Describe the component's purpose and usage..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>File Path (Reference)</Label>
              <Input 
                value={localComponent.advanced.file_path} 
                onChange={e => handleChange(['advanced', 'file_path'], e.target.value)}
                placeholder="src/components/..."
              />
            </div>

            <div className="space-y-2">
              <Label>Required Props</Label>
              <div className="flex gap-2 mb-2">
                <Input 
                  value={newProp} 
                  onChange={e => setNewProp(e.target.value)}
                  placeholder="Add prop name"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addRequiredProp()}
                />
                <Button onClick={addRequiredProp} type="button">Add</Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {localComponent.main.required_props.map(prop => (
                  <Badge key={prop} variant="secondary" className="flex items-center gap-1">
                    {prop}
                    <X 
                      size={12} 
                      className="cursor-pointer hover:text-destructive"
                      onClick={() => removeRequiredProp(prop)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between gap-2 mt-4">
            {onDelete ? (
               <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
            ) : <div></div>}
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={() => onSave(localComponent)}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Delete Component</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{localComponent.main.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (onDelete) onDelete();
              setShowDeleteConfirm(false);
            }}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
