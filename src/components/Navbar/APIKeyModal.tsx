import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, TextField, Callout } from '@radix-ui/themes';
import { Key, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const APIKeyModal = () => {
  const { apiKey, updateApiKey } = useAuth();
  const [keyInput, setKeyInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'validation_error' | 'save_error'>('idle');

  useEffect(() => {
    if (apiKey) setKeyInput(apiKey);
  }, [apiKey, isOpen]);

  const handleSave = async () => {
    const trimmedKey = keyInput.trim();
    console.log("Saving API Key:", trimmedKey); 

    if (!trimmedKey.startsWith('sk-ant-')) {
        console.error("Validation failed: Key must start with 'sk-ant-'");
        setStatus('validation_error');
        return;
    }
    
    setStatus('saving');
    try {
        await updateApiKey(trimmedKey);
        setStatus('success');
        setTimeout(() => setIsOpen(false), 1000);
    } catch (e) {
        console.error("Save failed:", e);
        setStatus('save_error');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger>
        <Button variant="ghost" color="gray" className="cursor-pointer">
            <Key size={16} className={apiKey ? "text-green-600" : "text-gray-400"} />
            {apiKey ? "API Key Active" : "Set API Key"}
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Claude API Key Configuration</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          To use the AI generation features, please provide your Anthropic API Key.
          It will be stored securely in your user profile.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <TextField.Root 
            placeholder="sk-ant-..." 
            type="password"
            value={keyInput}
            onChange={(e) => {
                setKeyInput(e.target.value);
                setStatus('idle');
            }}
          >
            <TextField.Slot>
                <Key size={16} />
            </TextField.Slot>
          </TextField.Root>

          {(status === 'validation_error' || status === 'save_error') && (
            <Callout.Root color="red" size="1">
                <Callout.Icon>
                    <AlertTriangle size={16} />
                </Callout.Icon>
                <Callout.Text>
                    Invalid API Key format or save failed. Must start with 'sk-ant-'.
                </Callout.Text>
            </Callout.Root>
          )}

          {status === 'success' && (
            <Callout.Root color="green" size="1">
                <Callout.Icon>
                    <CheckCircle size={16} />
                </Callout.Icon>
                <Callout.Text>
                    You saved your API Key
                </Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSave} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving...' : 'Save API Key'}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default APIKeyModal;
