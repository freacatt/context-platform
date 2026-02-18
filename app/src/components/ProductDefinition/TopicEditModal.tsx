import React, { useState, useEffect } from 'react';
import { Wand2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { generateProductDefinitionSuggestion } from '../../services/anthropic';
import { ContextSource, ProductDefinitionNode } from '../../types';
import { AiRecommendationButton } from '../Common/AiRecommendationButton';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import ContextAttachmentsField from '../Common/ContextAttachmentsField';

interface TopicEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: ProductDefinitionNode | null;
  onSave: (nodeId: string, description: string, attachments: ContextSource[]) => void;
  contextData?: string;
  productTitle: string;
}

const TopicEditModal: React.FC<TopicEditModalProps> = ({ 
  isOpen, 
  onClose, 
  node, 
  onSave,
  contextData,
  productTitle
}) => {
  const { apiKey } = useAuth();
  const { selectedContextIds } = useGlobalContext();
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<ContextSource[]>([]);

  useEffect(() => {
    if (node && isOpen) {
      const nodeDescription = node.description || '';
      setDescription(nodeDescription);
      // @ts-expect-error older data may not have contextSources
      setAttachments((node as any).contextSources || []);
    }
  }, [node, isOpen]);

  const handleSave = () => {
    if (node) {
      onSave(node.id, description, attachments);
      onClose();
    }
  };

  const handleAiSuggestion = async (context: string) => {
    if (!node) return;
    
    // Construct a prompt based on the node title and available context
    const prompt = `
      Product: ${productTitle}
      Topic: ${node.label}
      Current Description: ${description}
      
      Please suggest a detailed description for this product definition topic.
      Focus on clarity, user value, and technical feasibility if applicable.
    `;

    return await generateProductDefinitionSuggestion(
        apiKey || '', 
        prompt, 
        context // Pass the resolved context data
    );
  };

  if (!node) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto overflow-x-hidden w-full bg-white/80 dark:bg-background/40">
        <DialogHeader>
          <DialogTitle>Edit Topic: {node.label}</DialogTitle>
          <DialogDescription>
            Refine the description for this product aspect.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Description
              </label>
              <AiRecommendationButton
                onGenerate={handleAiSuggestion}
                onApply={(text) => {
                  setDescription(text);
                }}
                contextIds={selectedContextIds}
                label="Suggest Description"
                icon={<Wand2 size={12} />}
              />
            </div>
            <Textarea
              placeholder="Describe this aspect of the product..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
              className="min-h-[220px]"
            />
          </div>

          <ContextAttachmentsField
            label="Attachments"
            value={attachments}
            onChange={setAttachments}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TopicEditModal;
