import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Context
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Pyramid Context</DialogTitle>
          <DialogDescription>
            Define the overall context or problem statement for this pyramid. 
            This context will be used by the AI to generate relevant questions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <Textarea 
            placeholder="e.g., We are trying to improve the customer retention rate for our SaaS product..." 
            value={context}
            onChange={(e) => {
                setContext(e.target.value);
                setStatus('idle');
            }}
            rows={6}
            className="min-h-[150px]"
          />

          {status === 'error' && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Failed to save context.</AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <Alert className="border-green-500 text-green-500">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Context saved successfully!</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
           <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
           </DialogClose>
           <Button onClick={handleSave} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving...' : 'Save Context'}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContextModal;
