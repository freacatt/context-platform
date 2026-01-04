import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, Text, TextField, Box, TextArea, Badge, IconButton, Heading } from '@radix-ui/themes';
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Edit Component</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Define component properties, category, and usage details.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="2" mb="1">Component Name</Text>
            <TextField.Root 
              value={localComponent.main.name} 
              onChange={e => handleChange(['main', 'name'], e.target.value)}
              placeholder="e.g., Button, Card, Header"
            />
          </Box>

          <Box>
            <Text size="2" mb="1">Type</Text>
            <TextField.Root 
              value={localComponent.type} 
              onChange={e => handleChange(['type'], e.target.value)}
              placeholder="e.g., atom, molecule, organism"
            />
          </Box>

          <Box>
            <Text size="2" mb="1">Category</Text>
            <TextField.Root 
              value={localComponent.main.category} 
              onChange={e => handleChange(['main', 'category'], e.target.value)}
              placeholder="e.g., Navigation, Input, Display"
            />
          </Box>

          <Box>
            <Flex justify="between" align="center" mb="1">
              <Text size="2">Description</Text>
              <AiRecommendationButton
                onGenerate={(apiKey, globalContext) => generateUiUxSuggestion(
                  apiKey,
                  "UI/UX Architecture", // We might want a real title here, but this is fine for now
                  'component',
                  localComponent.main.name || "Unnamed Component",
                  `Category: ${localComponent.main.category}\nType: ${localComponent.type}`,
                  globalContext,
                  'description'
                )}
                onSuccess={(result) => handleChange(['main', 'description'], result)}
                label="AI Suggest"
              />
            </Flex>
            <TextArea 
              value={localComponent.main.description || ''} 
              onChange={e => handleChange(['main', 'description'], e.target.value)}
              placeholder="Describe the component's purpose and usage..."
              style={{ minHeight: 80, resize: 'vertical' }}
            />
          </Box>

          <Box>
            <Text size="2" mb="1">File Path (Reference)</Text>
            <TextField.Root 
              value={localComponent.advanced.file_path} 
              onChange={e => handleChange(['advanced', 'file_path'], e.target.value)}
              placeholder="src/components/..."
            />
          </Box>

          <Box>
            <Text size="2" mb="1">Required Props</Text>
            <Flex gap="2" mb="2">
              <TextField.Root 
                value={newProp} 
                onChange={e => setNewProp(e.target.value)}
                placeholder="Add prop name"
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && addRequiredProp()}
              />
              <Button onClick={addRequiredProp}>Add</Button>
            </Flex>
            <Flex gap="2" wrap="wrap">
              {localComponent.main.required_props.map(prop => (
                <Badge key={prop} size="2" variant="soft" color="indigo">
                  {prop}
                  <X 
                    size={12} 
                    style={{ marginLeft: 4, cursor: 'pointer' }} 
                    onClick={() => removeRequiredProp(prop)}
                  />
                </Badge>
              ))}
            </Flex>
          </Box>
        </Flex>

        <Flex gap="3" mt="4" justify="between">
          {onDelete && (
             <Button variant="soft" color="red" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
          )}
          <Flex gap="3" ml="auto">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button onClick={() => onSave(localComponent)}>Save Changes</Button>
          </Flex>
        </Flex>
      </Dialog.Content>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Delete Component</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Are you sure you want to delete "{localComponent.main.name}"? This action cannot be undone.
          </Dialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button color="red" onClick={() => {
              if (onDelete) onDelete();
              setShowDeleteConfirm(false);
            }}>
              Confirm Delete
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Dialog.Root>
  );
};
