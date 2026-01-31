import React, { useState, useEffect } from 'react';
import { Key, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer text-muted-foreground hover:text-foreground">
            <Key size={16} className={apiKey ? "text-green-600 mr-2" : "text-gray-400 mr-2"} />
            {apiKey ? "API Key Active" : "Set API Key"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Claude API Key Configuration</DialogTitle>
          <DialogDescription>
            To use the AI generation features, please provide your Anthropic API Key.
            It will be stored securely in your user profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="relative">
            <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="sk-ant-..." 
                type="password"
                value={keyInput}
                onChange={(e) => {
                    setKeyInput(e.target.value);
                    setStatus('idle');
                }}
                className="pl-9"
            />
          </div>

          {(status === 'validation_error' || status === 'save_error') && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Invalid API Key format or save failed. Must start with 'sk-ant-'.
                </AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <Alert className="border-green-500 text-green-600 dark:border-green-500 dark:text-green-400">
                <CheckCircle className="h-4 w-4 stroke-green-600 dark:stroke-green-400" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                    You saved your API Key
                </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Save API Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default APIKeyModal;
