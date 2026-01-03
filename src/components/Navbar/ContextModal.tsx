import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, TextArea, Callout } from '@radix-ui/themes';
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getPyramid, updatePyramidContext } from '../../services/pyramidService';

const ContextModal: React.FC = () => {
  const { pyramidId } = useParams<{ pyramidId: string }>();
  const [context, setContext] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen && pyramidId) {
        // Fetch context when modal opens
        const fetchContext = async () => {
            try {
                const pyramid = await getPyramid(pyramidId);
                if (pyramid) {
                    setContext(pyramid.context || '');
                }
            } catch (e) {
                console.error("Error fetching context", e);
            }
        };
        fetchContext();
    }
  }, [isOpen, pyramidId]);

  const handleSave = async () => {
    if (!pyramidId) return;
    
    setStatus('saving');
    try {
        await updatePyramidContext(pyramidId, context);
        setStatus('success');
        setTimeout(() => setIsOpen(false), 1000);
    } catch (e) {
        console.error("Error saving context:", e);
        setStatus('error');
    }
  };

  // Only show the trigger button if we are inside a pyramid (have an ID)
  if (!pyramidId) {
      return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger>
        <Button variant="ghost" color="gray" className="cursor-pointer">
            <FileText className="w-4 h-4 mr-2" />
            Context
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 800 }}>
        <Dialog.Title>Pyramid Context</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Define the overall context or problem statement for this pyramid. 
          This context will be used by the AI to generate relevant questions.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <TextArea 
            placeholder="e.g., We are trying to improve the customer retention rate for our SaaS product..." 
            value={context}
            onChange={(e) => {
                setContext(e.target.value);
                setStatus('idle');
            }}
            rows={6}
            style={{ minHeight: '150px', resize: 'vertical' }}
          />

          {status === 'error' && (
            <Callout.Root color="red" size="1">
                <Callout.Icon><AlertTriangle size={16} /></Callout.Icon>
                <Callout.Text>Failed to save context.</Callout.Text>
            </Callout.Root>
          )}

          {status === 'success' && (
            <Callout.Root color="green" size="1">
                <Callout.Icon><CheckCircle size={16} /></Callout.Icon>
                <Callout.Text>Context saved successfully!</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleSave} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving...' : 'Save Context'}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ContextModal;
