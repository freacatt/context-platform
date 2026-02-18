import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ThemeSpecification } from '../../../types/uiUxArchitecture';
import { AiRecommendationButton } from '../../Common/AiRecommendationButton';
import { generateUiUxSuggestion } from '../../../services/anthropic';

interface ThemeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeSpecification;
  onSave: (theme: ThemeSpecification) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ open, onOpenChange, theme, onSave }) => {
  const [localTheme, setLocalTheme] = useState<ThemeSpecification>(theme);

  useEffect(() => {
    setLocalTheme(theme);
  }, [theme, open]);

  const handleChange = (path: string[], value: string) => {
    setLocalTheme(prev => {
      const newTheme = JSON.parse(JSON.stringify(prev));
      let current = newTheme;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newTheme;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Theme Specification</DialogTitle>
          <DialogDescription>
            Configure the global design system, typography, and color palette.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="spacing">Spacing & Radius</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <div className="pt-4">
            <TabsContent value="colors" className="mt-0">
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(localTheme.main.colors).map((key) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key}</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={(localTheme.main.colors as any)[key]} 
                        onChange={e => handleChange(['main', 'colors', key], e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                      <div 
                        className="w-8 h-8 rounded border border-input"
                        style={{ backgroundColor: (localTheme.main.colors as any)[key] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="typography" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Input 
                  value={localTheme.main.typography.font_family} 
                  onChange={e => handleChange(['main', 'typography', 'font_family'], e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Base Font Size</Label>
                <Input 
                  value={localTheme.main.typography.font_size_base} 
                  onChange={e => handleChange(['main', 'typography', 'font_size_base'], e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Theme Description</Label>
                  <AiRecommendationButton
                    onGenerate={(apiKey, globalContext) => generateUiUxSuggestion(
                      apiKey,
                      "UI/UX Architecture",
                      'theme',
                      "Global Theme",
                      `Font Family: ${localTheme.main.typography.font_family}\nBase Size: ${localTheme.main.typography.font_size_base}`,
                      globalContext,
                      'description'
                    )}
                    onSuccess={(result) => handleChange(['main', 'description'], result)}
                    label="AI Suggest"
                  />
                </div>
                <Textarea 
                  value={localTheme.main.description || ''} 
                  onChange={e => handleChange(['main', 'description'], e.target.value)}
                  placeholder="Describe the overall theme and design philosophy..."
                  className="min-h-[80px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="spacing" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Spacing Unit</Label>
                <Input 
                  value={localTheme.main.spacing_unit} 
                  onChange={e => handleChange(['main', 'spacing_unit'], e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium mb-2">Border Radius</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.keys(localTheme.main.border_radius).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label className="uppercase text-xs">{key}</Label>
                      <Input 
                        value={(localTheme.main.border_radius as any)[key]} 
                        onChange={e => handleChange(['main', 'border_radius', key], e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-0">
              <div className="space-y-2">
                <h3 className="font-medium">Breakpoints</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.keys(localTheme.advanced.breakpoints).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize">{key}</Label>
                      <Input 
                        value={(localTheme.advanced.breakpoints as any)[key]} 
                        onChange={e => handleChange(['advanced', 'breakpoints', key], e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <h3 className="font-medium">Shadows</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.keys(localTheme.advanced.shadows).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize">{key}</Label>
                      <Input 
                        value={(localTheme.advanced.shadows as any)[key]} 
                        onChange={e => handleChange(['advanced', 'shadows', key], e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => onSave(localTheme)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
