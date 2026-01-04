import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, Text, TextField, Box, Select, Checkbox, Card, Heading, Grid, IconButton, TextArea, Tabs } from '@radix-ui/themes';
import { Plus, X, Trash2 } from 'lucide-react';
import { Page, BaseComponent, PageComponent } from '../../../types/uiUxArchitecture';

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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 800 }}>
        <Dialog.Title>Edit Page</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Configure page routing, layout, components, and conditions.
        </Dialog.Description>

        <Grid columns="2" gap="4">
          <Flex direction="column" gap="3">
            <Box>
              <Text size="2" mb="1">Page Title</Text>
              <TextField.Root 
                value={localPage.main.title} 
                onChange={e => handleChange(['main', 'title'], e.target.value)}
                placeholder="e.g., Dashboard"
              />
            </Box>

            <Box>
              <Text size="2" mb="1">Route</Text>
              <TextField.Root 
                value={localPage.main.route} 
                onChange={e => handleChange(['main', 'route'], e.target.value)}
                placeholder="e.g., /dashboard"
              />
            </Box>

            <Box>
              <Text size="2" mb="1">Layout</Text>
              <TextField.Root 
                value={localPage.main.layout} 
                onChange={e => handleChange(['main', 'layout'], e.target.value)}
                placeholder="e.g., MainLayout"
              />
            </Box>

            <Flex align="center" gap="2">
              <Checkbox 
                checked={localPage.main.requires_auth} 
                onCheckedChange={checked => handleChange(['main', 'requires_auth'], checked)}
              />
              <Text size="2">Requires Authentication</Text>
            </Flex>

            <Box>
              <Text size="2" mb="1">Data Fetching Endpoint</Text>
              <TextField.Root 
                value={localPage.advanced.data_fetching.endpoint} 
                onChange={e => handleChange(['advanced', 'data_fetching', 'endpoint'], e.target.value)}
                placeholder="/api/..."
              />
            </Box>

            <Box>
              <Text size="2" mb="1">Description</Text>
              <TextArea 
                value={localPage.main.description || ''} 
                onChange={e => handleChange(['main', 'description'], e.target.value)}
                placeholder="Describe the page's purpose..."
                style={{ minHeight: 80, resize: 'vertical' }}
              />
            </Box>

            <Box>
              <Text size="2" mb="1">Condition (When to show)</Text>
              <TextArea 
                value={localPage.main.condition || ''} 
                onChange={e => handleChange(['main', 'condition'], e.target.value)}
                placeholder="e.g. User is logged in and has admin role..."
                style={{ minHeight: 60, resize: 'vertical' }}
              />
            </Box>
          </Flex>

          <Flex direction="column" gap="3">
            <Heading size="3">Components</Heading>
            
            <Flex gap="2">
              <Select.Root value={selectedComponentId} onValueChange={setSelectedComponentId}>
                <Select.Trigger placeholder="Select component to add" style={{ flex: 1 }} />
                <Select.Content>
                  {availableComponents.map(comp => (
                    <Select.Item key={comp.component_id} value={comp.component_id}>
                      {comp.main.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Button onClick={addComponent} disabled={!selectedComponentId}>
                <Plus size={16} />
              </Button>
            </Flex>

            <Box style={{ maxHeight: 300, overflowY: 'auto' }} className="border rounded p-2 bg-slate-50">
              {localPage.main.components.length === 0 && (
                <Text size="2" color="gray" className="text-center block p-4">No components added</Text>
              )}
              {localPage.main.components.map((comp, index) => (
                <Card key={index} mb="2">
                  <Flex justify="between" align="center">
                    <Box>
                      <Text size="2" weight="bold">{getComponentName(comp.component_id)}</Text>
                      <Text size="1" color="gray">Position: {comp.position}</Text>
                    </Box>
                    <IconButton variant="ghost" color="red" onClick={() => removeComponent(index)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </Flex>
                </Card>
              ))}
            </Box>
          </Flex>
        </Grid>

        <Flex gap="3" mt="4" justify="between">
          {onDelete && (
             <Button variant="soft" color="red" onClick={() => setShowDeleteConfirm(true)}>Delete Page</Button>
          )}
          <Flex gap="3" ml="auto">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button onClick={() => onSave(localPage)}>Save Changes</Button>
          </Flex>
        </Flex>
      </Dialog.Content>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Delete Page</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Are you sure you want to delete "{localPage.main.title}"? This action cannot be undone.
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
