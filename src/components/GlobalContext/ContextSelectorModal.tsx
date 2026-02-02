import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Server, CheckSquare, Palette, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
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
  const { currentWorkspace } = useWorkspace();
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
      const wsId = currentWorkspace?.id;

      Promise.allSettled([
        getUserPyramids(user.uid, wsId),
        getUserProductDefinitions(user.uid, wsId),
        getUserContextDocuments(user.uid, wsId),
        getUserTechnicalArchitectures(user.uid, wsId),
        getTechnicalTasks(user.uid, wsId),
        getUserUiUxArchitectures(user.uid, wsId),
        getUserDirectories(user.uid, wsId),
        getUserDiagrams(user.uid, wsId)
      ]).then((results) => {
        const [
          pyramidsResult,
          definitionsResult,
          documentsResult,
          architecturesResult,
          tasksResult,
          uiUxArchitecturesResult,
          directoriesResult,
          diagramsResult
        ] = results;

        if (pyramidsResult.status === 'fulfilled') setPyramids(pyramidsResult.value);
        else console.error("Failed to fetch pyramids", pyramidsResult.reason);

        if (definitionsResult.status === 'fulfilled') setDefinitions(definitionsResult.value.filter(d => d.id !== currentDefinitionId));
        else console.error("Failed to fetch definitions", definitionsResult.reason);

        if (documentsResult.status === 'fulfilled') setDocuments(documentsResult.value);
        else console.error("Failed to fetch documents", documentsResult.reason);

        if (architecturesResult.status === 'fulfilled') setArchitectures(architecturesResult.value);
        else console.error("Failed to fetch technical architectures", architecturesResult.reason);

        if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value);
        else console.error("Failed to fetch technical tasks", tasksResult.reason);

        if (uiUxArchitecturesResult.status === 'fulfilled') setUiUxArchitectures(uiUxArchitecturesResult.value);
        else console.error("Failed to fetch UI/UX architectures", uiUxArchitecturesResult.reason);

        if (directoriesResult.status === 'fulfilled') setDirectories(directoriesResult.value.map(d => ({ id: d.id, title: d.title })));
        else console.error("Failed to fetch directories", directoriesResult.reason);

        if (diagramsResult.status === 'fulfilled') setDiagrams(diagramsResult.value);
        else console.error("Failed to fetch diagrams", diagramsResult.reason);

      }).catch(err => {
        console.error("Failed to load context sources", err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, user, currentDefinitionId, currentWorkspace]);

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
    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No items found.</p>
        ) : (
          items.map(item => (
            <Card key={item.id} className="bg-background">
              <CardContent className="p-2 flex items-center gap-2">
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
                <span className="text-sm">{item.title}</span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
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
      <ScrollArea className="h-[300px] w-full rounded-md border p-4">
        <div className="flex flex-col gap-3">
          <Card className="bg-background">
            <CardContent className="p-2">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedDirs(prev => ({ ...prev, none: !prev.none }))}>
                <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                    checked={areAllDocsSelected(noDirDocs)}
                    onCheckedChange={(checked) => toggleSelectDocs(noDirDocs, !!checked)}
                    />
                </div>
                {expandedDirs.none ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="text-sm font-medium">No Directory</span>
              </div>
              {expandedDirs.none && (
                <div className="pt-2 pl-6 flex flex-col gap-2">
                  {noDirDocs.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No documents</p>
                  ) : (
                    noDirDocs.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-1 border rounded bg-muted/30">
                        <Checkbox 
                          checked={isSelected('contextDocument', item.id)}
                          onCheckedChange={() => handleToggle('contextDocument', { id: item.id, title: item.title })}
                        />
                        <FileText size={16} className="text-amber-500" />
                        <span className="text-sm">{item.title}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {directories.map(dir => {
            const expanded = expandedDirs[dir.id] || false;
            return (
              <Card key={dir.id} className="bg-background">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedDirs(prev => ({ ...prev, [dir.id]: !expanded }))}>
                     <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                        checked={areAllDocsSelected(grouped[dir.id] || [])}
                        onCheckedChange={(checked) => toggleSelectDocs(grouped[dir.id] || [], !!checked)}
                        />
                    </div>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="text-sm font-medium">{dir.title}</span>
                  </div>
                  {expanded && (
                    <div className="pt-2 pl-6 flex flex-col gap-2">
                      {(grouped[dir.id] || []).length === 0 ? (
                        <p className="text-muted-foreground text-xs">No documents</p>
                      ) : (
                        (grouped[dir.id] || []).map(item => (
                          <div key={item.id} className="flex items-center gap-2 p-1 border rounded bg-muted/30">
                            <Checkbox 
                              checked={isSelected('contextDocument', item.id)}
                              onCheckedChange={() => handleToggle('contextDocument', { id: item.id, title: item.title })}
                            />
                            <FileText size={16} className="text-amber-500" />
                            <span className="text-sm">{item.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Context Sources</DialogTitle>
          <DialogDescription>
            Select Pyramids, Product Definitions, Documents, Architectures, Tasks, UI/UX, or Diagrams to use as context for AI recommendations.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-4"><span className="text-muted-foreground">Loading sources...</span></div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="pyramids">Pyramids ({pyramids.length})</TabsTrigger>
              <TabsTrigger value="definitions">Product Defs ({definitions.length})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
              <TabsTrigger value="architectures">Architectures ({architectures.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="uiUx">UI/UX ({uiUxArchitectures.length})</TabsTrigger>
              <TabsTrigger value="diagrams">Diagrams ({diagrams.length})</TabsTrigger>
            </TabsList>

            <div className="pt-3">
              <TabsContent value="pyramids">
                {renderList(pyramids, 'pyramid')}
              </TabsContent>

              <TabsContent value="definitions">
                {renderList(definitions, 'productDefinition')}
              </TabsContent>

              <TabsContent value="documents">
                {renderDocumentsAccordion()}
              </TabsContent>

              <TabsContent value="architectures">
                {renderList(architectures, 'technicalArchitecture')}
              </TabsContent>

              <TabsContent value="tasks">
                {renderList(tasks, 'technicalTask')}
              </TabsContent>

              <TabsContent value="uiUx">
                {renderList(uiUxArchitectures, 'uiUxArchitecture')}
              </TabsContent>
              
              <TabsContent value="diagrams">
                {renderList(diagrams, 'diagram')}
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Context ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContextSelectorModal;
