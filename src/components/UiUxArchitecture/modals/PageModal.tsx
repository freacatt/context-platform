import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { Page, BaseComponent, PageComponent } from '../../../types/uiUxArchitecture';
import { AiRecommendationButton } from '../../Common/AiRecommendationButton';
import { generateUiUxSuggestion } from '../../../services/anthropic';

interface PageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page;
  availableComponents: BaseComponent[];
  onSave: (page: Page) => void;
  onDelete?: () => void;
}

export const PageModal: React.FC<PageModalProps> = ({ open, onOpenChange, page, availableComponents, onSave, onDelete }) => {
  const [localPage, setLocalPage] = useState<Page>(page);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setLocalPage(page);
  }, [page, open]);

  const handleChange = (path: string[], value: any) => {
    setLocalPage(prev => {
      const newPage = JSON.parse(JSON.stringify(prev));
      let current = newPage;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newPage;
    });
  };

  const addComponent = () => {
    if (selectedComponentId) {
      const newComponent: PageComponent = {
        component_id: selectedComponentId,
        position: 'default',
        props: {},
        instance_count: '1',
        data_source: ''
      };
      
      setLocalPage(prev => ({
        ...prev,
        main: {
          ...prev.main,
          components: [...prev.main.components, newComponent]
        }
      }));
      setSelectedComponentId('');
    }
  };

  const removeComponent = (index: number) => {
    setLocalPage(prev => ({
      ...prev,
      main: {
        ...prev.main,
        components: prev.main.components.filter((_, i) => i !== index)
      }
    }));
  };

  const getComponentName = (id: string) => {
    return availableComponents.find(c => c.component_id === id)?.main.name || id;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Page</DialogTitle>
            <DialogDescription>
              Configure page routing, layout, components, and conditions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label>Page Title</Label>
                <Input 
                  value={localPage.main.title} 
                  onChange={e => handleChange(['main', 'title'], e.target.value)}
                  placeholder="e.g., Dashboard"
                />
              </div>

              <div className="space-y-2">
                <Label>Route</Label>
                <Input 
                  value={localPage.main.route} 
                  onChange={e => handleChange(['main', 'route'], e.target.value)}
                  placeholder="e.g., /dashboard"
                />
              </div>

              <div className="space-y-2">
                <Label>Layout</Label>
                <Input 
                  value={localPage.main.layout} 
                  onChange={e => handleChange(['main', 'layout'], e.target.value)}
                  placeholder="e.g., MainLayout"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="requires_auth"
                  checked={localPage.main.requires_auth} 
                  onCheckedChange={checked => handleChange(['main', 'requires_auth'], checked)}
                />
                <Label htmlFor="requires_auth">Requires Authentication</Label>
              </div>

              <div className="space-y-2">
                <Label>Data Fetching Endpoint</Label>
                <Input 
                  value={localPage.advanced.data_fetching.endpoint} 
                  onChange={e => handleChange(['advanced', 'data_fetching', 'endpoint'], e.target.value)}
                  placeholder="/api/..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Description</Label>
                  <AiRecommendationButton
                    onGenerate={(apiKey, globalContext) => generateUiUxSuggestion(
                      apiKey,
                      "UI/UX Architecture",
                      'page',
                      localPage.main.title || "Unnamed Page",
                      `Route: ${localPage.main.route}\nRequires Auth: ${localPage.main.requires_auth}`,
                      globalContext,
                      'description'
                    )}
                    onSuccess={(result) => handleChange(['main', 'description'], result)}
                    label="AI Suggest"
                  />
                </div>
                <Textarea 
                  value={localPage.main.description || ''} 
                  onChange={e => handleChange(['main', 'description'], e.target.value)}
                  placeholder="Describe the page's purpose..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Condition (When to show)</Label>
                <Textarea 
                  value={localPage.main.condition || ''} 
                  onChange={e => handleChange(['main', 'condition'], e.target.value)}
                  placeholder="e.g. User is logged in and has admin role..."
                  className="min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold">Components</h3>
              
              <div className="flex gap-2">
                <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select component to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableComponents.map(comp => (
                      <SelectItem key={comp.component_id} value={comp.component_id}>
                        {comp.main.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addComponent} disabled={!selectedComponentId} size="icon">
                  <Plus size={16} />
                </Button>
              </div>

              <div className="border rounded-md p-2 bg-muted/20 min-h-[300px] max-h-[400px] overflow-y-auto">
                {localPage.main.components.length === 0 && (
                  <div className="text-center p-4 text-muted-foreground text-sm">No components added</div>
                )}
                {localPage.main.components.map((comp, index) => (
                  <Card key={index} className="mb-2">
                    <CardContent className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{getComponentName(comp.component_id)}</div>
                        <div className="text-xs text-muted-foreground">Position: {comp.position}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8" onClick={() => removeComponent(index)}>
                        <Trash2 size={14} />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between gap-2 mt-4">
            {onDelete ? (
               <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete Page</Button>
            ) : <div></div>}
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={() => onSave(localPage)}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{localPage.main.title}"? This action cannot be undone.
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
