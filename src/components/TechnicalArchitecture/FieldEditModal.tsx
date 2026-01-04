import React, { useState, useEffect } from 'react';
import { Dialog, Flex, Text, TextArea, Button, Box } from '@radix-ui/themes';
import { AiRecommendationButton } from '../Common/AiRecommendationButton';
import { generateTechnicalArchitectureSuggestion } from '../../services/anthropic';
import { TechnicalArchitecture } from '../../types';

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
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 700 }}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
            {description || "Provide details for this architectural decision."}
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Flex justify="between" align="center" mb="1">
              <Text as="label" size="2" weight="bold">
                {fieldType === 'list' ? 'Items (one per line)' : 
                 fieldType === 'map' ? 'Key: Value pairs (one per line)' : 'Content'}
              </Text>
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
            </Flex>
            <TextArea 
              value={textValue} 
              onChange={(e) => setTextValue(e.target.value)} 
              placeholder={
                  fieldType === 'list' ? "Item 1\nItem 2\nItem 3" : 
                  fieldType === 'map' ? "Key: Value\nAnother Key: Value" : 
                  "Type your content here..."
              }
              rows={12}
              className="mt-1 font-mono text-sm"
              style={{ resize: 'vertical' }}
            />
          </Box>

          <Flex gap="3" justify="end" mt="4">
            <Button variant="soft" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} color="purple">
              Save Changes
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default FieldEditModal;
