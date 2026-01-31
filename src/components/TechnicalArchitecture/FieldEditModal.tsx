import React, { useState, useEffect } from 'react';
import { AiRecommendationButton } from '../Common/AiRecommendationButton';
import { generateTechnicalArchitectureSuggestion } from '../../services/anthropic';
import { TechnicalArchitecture } from '../../types';

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface FieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  value: any;
  onSave: (newValue: any) => void;
  fieldType: 'string' | 'list' | 'object' | 'map'; // map is for Record<string, string>
  architectureTitle: string;
  fieldPath: string[]; // For context in AI generation
}

const FieldEditModal: React.FC<FieldEditModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  value, 
  onSave,
  fieldType,
  architectureTitle,
  fieldPath
}) => {
  const [textValue, setTextValue] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
        // Convert current value to string format for editing
        if (value === undefined || value === null) {
            setTextValue('');
        } else if (fieldType === 'list' && Array.isArray(value)) {
            setTextValue(value.join('\n'));
        } else if (fieldType === 'map' && typeof value === 'object') {
            // Convert Record<string, string> to "Key: Value" lines
            setTextValue(Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('\n'));
        } else if (typeof value === 'object') {
             setTextValue(JSON.stringify(value, null, 2));
        } else {
            setTextValue(String(value));
        }
    }
  }, [isOpen, value, fieldType]);

  const handleSave = () => {
    let parsedValue: any = textValue;

    if (fieldType === 'list') {
        parsedValue = textValue.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } else if (fieldType === 'map') {
        const newMap: Record<string, string> = {};
        textValue.split('\n').forEach(line => {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex > 0) {
                const key = line.substring(0, separatorIndex).trim();
                const val = line.substring(separatorIndex + 1).trim();
                if (key) newMap[key] = val;
            }
        });
        parsedValue = newMap;
    }
    // 'string' type just uses textValue as is

    onSave(parsedValue);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || "Provide details for this architectural decision."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="font-bold">
                {fieldType === 'list' ? 'Items (one per line)' : 
                 fieldType === 'map' ? 'Key: Value pairs (one per line)' : 'Content'}
              </Label>
              <AiRecommendationButton
                onGenerate={(apiKey, globalContext) => generateTechnicalArchitectureSuggestion(
                  apiKey,
                  architectureTitle,
                  title,
                  description || "",
                  fieldPath.join(' > '),
                  globalContext
                )}
                onSuccess={(suggestion) => {
                  setTextValue(prev => {
                      if (!prev.trim()) return suggestion;
                      return `${prev}\n\n${suggestion}`;
                  });
                }}
                label="AI Recommendation"
                color="purple"
              />
            </div>
            <Textarea 
              value={textValue} 
              onChange={(e) => setTextValue(e.target.value)} 
              placeholder={
                  fieldType === 'list' ? "Item 1\nItem 2\nItem 3" : 
                  fieldType === 'map' ? "Key: Value\nAnother Key: Value" : 
                  "Type your content here..."
              }
              rows={12}
              className="mt-1 font-mono text-sm resize-y"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FieldEditModal;
