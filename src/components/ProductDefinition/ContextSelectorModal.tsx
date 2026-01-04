import React, { useState, useEffect } from 'react';
import { Dialog, Flex, Text, Button, Checkbox, Tabs, ScrollArea, Box, Card } from '@radix-ui/themes';
import { BookOpen, FileText, Server, CheckSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserPyramids } from '../../services/pyramidService';
import { getUserProductDefinitions } from '../../services/productDefinitionService';
import { getUserContextDocuments } from '../../services/contextDocumentService';
import { getUserTechnicalArchitectures } from '../../services/technicalArchitectureService';
import { getTechnicalTasks } from '../../services/technicalTaskService';
import { Pyramid, ProductDefinition, ContextDocument, TechnicalArchitecture, ContextSource } from '../../types';
import { TechnicalTask } from '../../types/technicalTask';

interface ContextSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sources: ContextSource[]) => void;
  initialSelectedSources: ContextSource[];
  currentDefinitionId: string | null;
}

const ContextSelectorModal: React.FC<ContextSelectorModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialSelectedSources, 
  currentDefinitionId 
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("pyramids");
  const [loading, setLoading] = useState<boolean>(false);
  
  // Available sources
  const [pyramids, setPyramids] = useState<Pyramid[]>([]);
  const [definitions, setDefinitions] = useState<ProductDefinition[]>([]);
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [architectures, setArchitectures] = useState<TechnicalArchitecture[]>([]);
  const [tasks, setTasks] = useState<TechnicalTask[]>([]);

  // Selection state: array of { type, id }
  const [selected, setSelected] = useState<ContextSource[]>([]);

  useEffect(() => {
    if (initialSelectedSources) {
      setSelected(prev => {
        // Prevent infinite loop if the array content is the same
        if (JSON.stringify(prev) === JSON.stringify(initialSelectedSources)) {
          return prev;
        }
        return initialSelectedSources;
      });
    }
  }, [initialSelectedSources, isOpen]);

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true);
      Promise.all([
        getUserPyramids(user.uid),
        getUserProductDefinitions(user.uid),
        getUserContextDocuments(user.uid),
        getUserTechnicalArchitectures(user.uid),
        getTechnicalTasks(user.uid)
      ]).then(([pyramidsData, definitionsData, documentsData, architecturesData, tasksData]) => {
        setPyramids(pyramidsData);
        setDefinitions(definitionsData.filter(d => d.id !== currentDefinitionId)); // Exclude self
        setDocuments(documentsData);
        setArchitectures(architecturesData);
        setTasks(tasksData);
      }).catch(err => {
        console.error("Failed to load context sources", err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, user, currentDefinitionId]);

  const handleToggle = (type: 'contextDocument' | 'productDefinition' | 'pyramid' | 'technicalArchitecture' | 'technicalTask', item: { id: string, title: string }) => {
    setSelected(prev => {
      const exists = prev.find(s => s.type === type && s.id === item.id);
      if (exists) {
        return prev.filter(s => !(s.type === type && s.id === item.id));
      } else {
        return [...prev, { type, id: item.id, title: item.title }];
      }
    });
  };

  const isSelected = (type: 'contextDocument' | 'productDefinition' | 'pyramid' | 'technicalArchitecture' | 'technicalTask', id: string) => {
    return selected.some(s => s.type === type && s.id === id);
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const renderList = (items: Array<{ id: string, title: string, type?: string }>, sourceType: 'contextDocument' | 'productDefinition' | 'pyramid' | 'technicalArchitecture' | 'technicalTask') => (
    <ScrollArea type="auto" style={{ height: 300 }}>
      <Flex direction="column" gap="2" p="2">
        {items.length === 0 ? (
          <Text color="gray" size="2">No items found.</Text>
        ) : (
          items.map(item => (
            <Card key={item.id} variant="surface" style={{ padding: '8px' }}>
              <Flex align="center" gap="2">
                <Checkbox 
                  checked={isSelected(sourceType, item.id)}
                  onCheckedChange={() => handleToggle(sourceType, item)}
                />
                {sourceType === 'contextDocument' && (
                  item.type === 'notion' ? 
                    <BookOpen size={16} className="text-blue-500" /> : 
                    <FileText size={16} className="text-amber-500" />
                )}
                {sourceType === 'technicalArchitecture' && (
                    <Server size={16} className="text-purple-500" />
                )}
                {sourceType === 'technicalTask' && (
                    <CheckSquare size={16} className="text-green-500" />
                )}
                <Text size="2">{item.title}</Text>
              </Flex>
            </Card>
          ))
        )}
      </Flex>
    </ScrollArea>
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Select Context Sources</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Select Pyramids, Product Definitions, Documents, Architectures, or Tasks to use as context for AI recommendations.
        </Dialog.Description>

        {loading ? (
          <Flex justify="center" p="4"><Text>Loading sources...</Text></Flex>
        ) : (
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Trigger value="pyramids">Pyramids ({pyramids.length})</Tabs.Trigger>
              <Tabs.Trigger value="definitions">Product Defs ({definitions.length})</Tabs.Trigger>
              <Tabs.Trigger value="documents">Documents ({documents.length})</Tabs.Trigger>
              <Tabs.Trigger value="architectures">Architectures ({architectures.length})</Tabs.Trigger>
              <Tabs.Trigger value="tasks">Tasks ({tasks.length})</Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              <Tabs.Content value="pyramids">
                {renderList(pyramids, 'pyramid')}
              </Tabs.Content>

              <Tabs.Content value="definitions">
                {renderList(definitions, 'productDefinition')}
              </Tabs.Content>

              <Tabs.Content value="documents">
                {renderList(documents, 'contextDocument')}
              </Tabs.Content>

              <Tabs.Content value="architectures">
                {renderList(architectures, 'technicalArchitecture')}
              </Tabs.Content>

              <Tabs.Content value="tasks">
                {renderList(tasks, 'technicalTask')}
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        )}

        <Flex gap="3" justify="end" mt="4">
          <Button variant="soft" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Context ({selected.length})
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ContextSelectorModal;
