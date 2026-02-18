import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ isOpen, onClose }) => {
  const { updateUserPassword, reauthenticate } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'validation_error' | 'save_error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (password.length < 6) {
        setStatus('validation_error');
        setErrorMsg('Password must be at least 6 characters');
        return;
    }
    if (password !== confirmPassword) {
        setStatus('validation_error');
        setErrorMsg('Passwords do not match');
        return;
    }
    
    setStatus('saving');
    try {
        await updateUserPassword(password);
        setStatus('success');
        setTimeout(() => {
            onClose();
            setPassword('');
            setConfirmPassword('');
            setStatus('idle');
        }, 1500);
    } catch (e: any) {
        console.error("Save failed:", e);
        if (e.code === 'auth/requires-recent-login') {
            try {
                // If re-auth is needed, we stop the automatic retry loop here to avoid infinite recursion
                // if re-auth fails or if the subsequent update fails again for some reason.
                await reauthenticate();
                
                // If re-auth successful, we try ONE more time
                try {
                    await updateUserPassword(password);
                    setStatus('success');
                    setTimeout(() => {
                        onClose();
                        setPassword('');
                        setConfirmPassword('');
                        setStatus('idle');
                    }, 1500);
                } catch (retryError: any) {
                     setStatus('save_error');
                     setErrorMsg(retryError.message || "Failed to update password after re-authentication.");
                }
                return;
            } catch (reauthError: any) {
                setStatus('save_error');
                // Customize message for clarity
                setErrorMsg("Security check failed. Please log out and log in again to set your password.");
                return;
            }
        }
        setStatus('save_error');
        setErrorMsg(e.message || "Failed to update password");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Set/Change Password</DialogTitle>
          <DialogDescription>
            Set a password to login with your email address.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="relative">
            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="New Password" 
              type="password"
              value={password}
              onChange={(e) => {
                  setPassword(e.target.value);
                  setStatus('idle');
              }}
              className="pl-9"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Confirm Password" 
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setStatus('idle');
              }}
              className="pl-9"
            />
          </div>

          {(status === 'validation_error' || status === 'save_error') && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    {errorMsg}
                </AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <Alert className="border-green-500 text-green-500">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                    Password updated successfully
                </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Set Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SetPasswordModal;
