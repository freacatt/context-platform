import React, { useEffect, useState } from 'react';
import { Dialog, Button, Flex, Text, TextArea, TextField, Box, Card, Badge } from '@radix-ui/themes';
import { Sparkles, Link as LinkIcon, Notebook, PaintBucket, Trash2 } from 'lucide-react';
import { AiRecommendationButton } from '../Common/AiRecommendationButton';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { DiagramNodeData, ContextSource } from '../../types';
import { generateDiagramBlockDescription } from '../../services/anthropic';
import ContextSelectorModal from '../GlobalContext/ContextSelectorModal';

interface EdgeInfo {
  id: string;
  title: string;
  direction?: string;
}

interface DiagramBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  diagramTitle: string;
  description: string;
  borderColor?: string;
  contextSources?: ContextSource[];
  outgoing: EdgeInfo[];
  incoming: EdgeInfo[];
  onSave: (next: { title: string; description: string; borderColor?: string; contextSources?: ContextSource[] }) => void;
  onDelete: () => void;
}

const DiagramBlockModal: React.FC<DiagramBlockModalProps> = ({
  isOpen,
  onClose,
  title,
  diagramTitle,
  description,
  borderColor,
  contextSources = [],
  outgoing,
  incoming,
  onSave,
  onDelete
}) => {
  const { apiKey } = useAuth();
  const { aggregatedContext } = useGlobalContext();

  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description || '');
  const [localBorderColor, setLocalBorderColor] = useState(borderColor || '#1f2937');
  const [attachedSources, setAttachedSources] = useState<ContextSource[]>(contextSources || []);
  const [contextModalOpen, setContextModalOpen] = useState(false);

  useEffect(() => {
    setLocalTitle(title);
    setLocalDescription(description || '');
    setLocalBorderColor(borderColor || '#1f2937');
    setAttachedSources(contextSources || []);
  }, [title, description, borderColor, contextSources, isOpen]);

  const handleSave = () => {
    onSave({
      title: localTitle.trim() || 'Untitled',
      description: localDescription,
      borderColor: localBorderColor,
      contextSources: attachedSources
    });
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 800 }}>
        <Dialog.Title>Edit Block</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Update the block title, description, connections, and attachments.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <Box>
            <Text as="label" size="2" weight="bold">Title</Text>
            <TextField.Root
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="Block title"
            />
          </Box>

          <Box>
            <Flex justify="between" align="center" className="mb-1">
              <Text as="label" size="2" weight="bold">Description</Text>
              <AiRecommendationButton
                size="1"
                variant="ghost"
                color="purple"
                label="AI Suggest"
                loadingLabel="Generating..."
                icon={<Sparkles size={14} className="mr-1" />}
                onGenerate={async (key, globalContext) => {
                  return await generateDiagramBlockDescription(
                    key,
                    localTitle || title,
                    diagramTitle,
                    globalContext
                  );
                }}
                onSuccess={(text) => setLocalDescription(text)}
                onError={() => {}}
              />
            </Flex>
            <TextArea
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Describe what this block represents..."
              rows={4}
              style={{ minHeight: '120px', resize: 'vertical' }}
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold">Navigation Map</Text>
            <Flex gap="3" className="mt-2">
              <Box className="flex-1">
                <Text color="gray" size="2">Outgoing</Text>
                <Flex direction="column" gap="2" mt="2">
                  {outgoing.length === 0 ? (
                    <Text color="gray" size="2">None</Text>
                  ) : outgoing.map(e => (
                    <Card key={e.id} variant="surface" style={{ padding: '8px' }}>
                      <Flex justify="between" align="center">
                        <Text size="2">{e.title}</Text>
                        {e.direction && (
                          <Badge color="indigo" variant="soft" className="ml-2">{e.direction}</Badge>
                        )}
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              </Box>
              <Box className="flex-1">
                <Text color="gray" size="2">Incoming</Text>
                <Flex direction="column" gap="2" mt="2">
                  {incoming.length === 0 ? (
                    <Text color="gray" size="2">None</Text>
                  ) : incoming.map(e => (
                    <Card key={e.id} variant="surface" style={{ padding: '8px' }}>
                      <Flex justify="between" align="center">
                        <Text size="2">{e.title}</Text>
                        {e.direction && (
                          <Badge color="indigo" variant="soft" className="ml-2">{e.direction}</Badge>
                        )}
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              </Box>
            </Flex>
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold">Attachments</Text>
            <Flex gap="2" mt="2" align="center">
              <Button variant="soft" size="1" className="cursor-pointer" onClick={() => setContextModalOpen(true)}>
                <Notebook size={14} className="mr-1" /> Attach context
              </Button>
              <Flex gap="1" wrap="wrap">
                {attachedSources.map(s => (
                  <Badge key={`${s.type}-${s.id}`} variant="soft" color="gray">{s.title || s.id}</Badge>
                ))}
              </Flex>
            </Flex>
            <ContextSelectorModal
              isOpen={contextModalOpen}
              onClose={() => setContextModalOpen(false)}
              onSave={(sources) => setAttachedSources(sources)}
              initialSelectedSources={attachedSources}
              currentDefinitionId={null}
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold">Border Color</Text>
            <Flex gap="2" align="center" mt="2">
              <input
                type="color"
                value={localBorderColor}
                onChange={(e) => setLocalBorderColor(e.target.value)}
              />
              <PaintBucket size={16} className="text-gray-600" />
            </Flex>
          </Box>
        </Flex>

        <Flex gap="3" justify="between" mt="4">
          <Button 
            color="red" 
            variant="soft" 
            onClick={onDelete}
            className="cursor-pointer"
          >
            <Trash2 size={16} className="mr-1" />
            Delete Block
          </Button>

          <Flex gap="3">
            <Dialog.Close>
              <Button variant="soft" color="gray" className="cursor-pointer">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleSave} className="cursor-pointer">Save</Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default DiagramBlockModal;
