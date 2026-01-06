import React, { useState, useEffect } from 'react';
import { Dialog, Flex, Text, Button, Checkbox, Tabs, ScrollArea, Box, Card } from '@radix-ui/themes';
import { BookOpen, FileText, Server, CheckSquare, Palette } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserPyramids } from '../../services/pyramidService';
import { getUserProductDefinitions } from '../../services/productDefinitionService';
import { getUserContextDocuments } from '../../services/contextDocumentService';
import { getUserDirectories } from '../../services/directoryService';
import { getUserTechnicalArchitectures } from '../../services/technicalArchitectureService';
import { getTechnicalTasks } from '../../services/technicalTaskService';
import { getUserUiUxArchitectures } from '../../services/uiUxArchitectureService';
import { getUserDiagrams } from '../../services/diagramService';
import { Pyramid, ProductDefinition, ContextDocument, TechnicalArchitecture, ContextSource, Diagram } from '../../types';
import { TechnicalTask } from '../../types/technicalTask';
import { UiUxArchitecture } from '../../types/uiUxArchitecture';

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
  const [uiUxArchitectures, setUiUxArchitectures] = useState<UiUxArchitecture[]>([]);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [directories, setDirectories] = useState<Array<{ id: string; title: string }>>([]);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  // Selection state: array of { type, id }
  const [selected, setSelected] = useState<ContextSource[]>([]);

  useEffect(() => {
    if (initialSelectedSources) {
      setSelected(prev => {
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
        getTechnicalTasks(user.uid),
        getUserUiUxArchitectures(user.uid),
        getUserDirectories(user.uid),
        getUserDiagrams(user.uid)
      ]).then(([pyramidsData, definitionsData, documentsData, architecturesData, tasksData, uiUxArchitecturesData, directoriesData, diagramsData]) => {
        setPyramids(pyramidsData);
        setDefinitions(definitionsData.filter(d => d.id !== currentDefinitionId));
        setDocuments(documentsData);
        setArchitectures(architecturesData);
        setTasks(tasksData);
        setUiUxArchitectures(uiUxArchitecturesData);
        setDirectories(directoriesData.map(d => ({ id: d.id, title: d.title })));
        setDiagrams(diagramsData);
      }).catch(err => {
        console.error("Failed to load context sources", err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, user, currentDefinitionId]);

  const handleToggle = (type: 'contextDocument' | 'productDefinition' | 'pyramid' | 'technicalArchitecture' | 'technicalTask' | 'uiUxArchitecture' | 'directory' | 'diagram', item: { id: string, title: string }) => {
    setSelected(prev => {
      const exists = prev.find(s => s.type === type && s.id === item.id);
      if (exists) {
        return prev.filter(s => !(s.type === type && s.id === item.id));
      } else {
        return [...prev, { type, id: item.id, title: item.title }];
      }
    });
  };

  const isSelected = (type: 'contextDocument' | 'productDefinition' | 'pyramid' | 'technicalArchitecture' | 'technicalTask' | 'uiUxArchitecture' | 'directory' | 'diagram', id: string) => {
    return selected.some(s => s.type === type && s.id === id);
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const renderList = (items: Array<{ id: string, title: string, type?: string }>, sourceType: 'contextDocument' | 'productDefinition' | 'pyramid' | 'technicalArchitecture' | 'technicalTask' | 'uiUxArchitecture' | 'diagram') => (
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
                {sourceType === 'uiUxArchitecture' && (
                    <Palette size={16} className="text-pink-500" />
                )}
                <Text size="2">{item.title}</Text>
              </Flex>
            </Card>
          ))
        )}
      </Flex>
    </ScrollArea>
  );

  const renderDocumentsAccordion = () => {
    const grouped: Record<string, ContextDocument[]> = {};
    const noDirDocs: ContextDocument[] = [];
    documents.forEach(doc => {
      const dirId = doc.directoryId || 'none';
      if (!doc.directoryId) {
        noDirDocs.push(doc);
      } else {
        if (!grouped[dirId]) grouped[dirId] = [];
        grouped[dirId].push(doc);
      }
    });

    const areAllDocsSelected = (docs: ContextDocument[]) =>
      docs.length > 0 && docs.every(d => isSelected('contextDocument', d.id));

    const toggleSelectDocs = (docs: ContextDocument[], select: boolean) => {
      setSelected(prev => {
        const withoutGroup = prev.filter(s => !(s.type === 'contextDocument' && docs.some(d => d.id === s.id)));
        if (!select) return withoutGroup;
        const additions = docs.map(d => ({ type: 'contextDocument', id: d.id, title: d.title }));
        return [...withoutGroup, ...additions];
      });
    };

    return (
      <ScrollArea type="auto" style={{ height: 300 }}>
        <Flex direction="column" gap="3">
          <Card variant="surface" style={{ padding: '8px' }}>
            <Flex align="center" gap="2" className="cursor-pointer" onClick={() => setExpandedDirs(prev => ({ ...prev, none: !prev.none }))}>
              <Checkbox 
                checked={areAllDocsSelected(noDirDocs)}
                onCheckedChange={(checked) => toggleSelectDocs(noDirDocs, !!checked)}
              />
              <Text size="2">No Directory</Text>
            </Flex>
            {expandedDirs.none && (
              <Box pt="2">
                <Flex direction="column" gap="2">
                  {noDirDocs.length === 0 ? (
                    <Text color="gray" size="2">No documents</Text>
                  ) : (
                    noDirDocs.map(item => (
                      <Card key={item.id} variant="surface" style={{ padding: '8px' }}>
                        <Flex align="center" gap="2">
                          <Checkbox 
                            checked={isSelected('contextDocument', item.id)}
                            onCheckedChange={() => handleToggle('contextDocument', { id: item.id, title: item.title })}
                          />
                          <FileText size={16} className="text-amber-500" />
                          <Text size="2">{item.title}</Text>
                        </Flex>
                      </Card>
                    ))
                  )}
                </Flex>
              </Box>
            )}
          </Card>

          {directories.map(dir => {
            const expanded = expandedDirs[dir.id] || false;
            return (
              <Card key={dir.id} variant="surface" style={{ padding: '8px' }}>
                <Flex align="center" gap="2" className="cursor-pointer" onClick={() => setExpandedDirs(prev => ({ ...prev, [dir.id]: !expanded }))}>
                  <Checkbox 
                    checked={areAllDocsSelected(grouped[dir.id] || [])}
                    onCheckedChange={(checked) => toggleSelectDocs(grouped[dir.id] || [], !!checked)}
                  />
                  <Text size="2">{dir.title}</Text>
                </Flex>
                {expanded && (
                  <Box pt="2">
                    <Flex direction="column" gap="2">
                      {(grouped[dir.id] || []).length === 0 ? (
                        <Text color="gray" size="2">No documents</Text>
                      ) : (
                        (grouped[dir.id] || []).map(item => (
                          <Card key={item.id} variant="surface" style={{ padding: '8px' }}>
                            <Flex align="center" gap="2">
                              <Checkbox 
                                checked={isSelected('contextDocument', item.id)}
                                onCheckedChange={() => handleToggle('contextDocument', { id: item.id, title: item.title })}
                              />
                              <FileText size={16} className="text-amber-500" />
                              <Text size="2">{item.title}</Text>
                            </Flex>
                          </Card>
                        ))
                      )}
                    </Flex>
                  </Box>
                )}
              </Card>
            );
          })}
        </Flex>
      </ScrollArea>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Select Context Sources</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Select Pyramids, Product Definitions, Documents, Architectures, Tasks, UI/UX, or Diagrams to use as context for AI recommendations.
        </Dialog.Description>

        {loading ? (
          <Flex justify="center" p="4"><Text>Loading sources...</Text></Flex>
        ) : (
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List style={{ flexWrap: 'wrap', gap: '4px' }}>
              <Tabs.Trigger value="pyramids">Pyramids ({pyramids.length})</Tabs.Trigger>
              <Tabs.Trigger value="definitions">Product Defs ({definitions.length})</Tabs.Trigger>
              <Tabs.Trigger value="documents">Documents ({documents.length})</Tabs.Trigger>
              <Tabs.Trigger value="architectures">Architectures ({architectures.length})</Tabs.Trigger>
              <Tabs.Trigger value="tasks">Tasks ({tasks.length})</Tabs.Trigger>
              <Tabs.Trigger value="uiUx">UI/UX ({uiUxArchitectures.length})</Tabs.Trigger>
              <Tabs.Trigger value="diagrams">Diagrams ({diagrams.length})</Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              <Tabs.Content value="pyramids">
                {renderList(pyramids, 'pyramid')}
              </Tabs.Content>

              <Tabs.Content value="definitions">
                {renderList(definitions, 'productDefinition')}
              </Tabs.Content>

              <Tabs.Content value="documents">
                {renderDocumentsAccordion()}
              </Tabs.Content>

              <Tabs.Content value="architectures">
                {renderList(architectures, 'technicalArchitecture')}
              </Tabs.Content>

              <Tabs.Content value="tasks">
                {renderList(tasks, 'technicalTask')}
              </Tabs.Content>

              <Tabs.Content value="uiUx">
                {renderList(uiUxArchitectures, 'uiUxArchitecture')}
              </Tabs.Content>
              
              <Tabs.Content value="diagrams">
                {renderList(diagrams, 'diagram')}
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
