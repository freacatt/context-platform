import React, { useState } from 'react';
import { Dialog, Button, Flex, TextField, Callout } from '@radix-ui/themes';
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
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content style={{ maxWidth: 450 }} className="border-2 border-black shadow-none">
        <Dialog.Title>Set/Change Password</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Set a password to login with your email address.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <TextField.Root 
            placeholder="New Password" 
            type="password"
            value={password}
            onChange={(e) => {
                setPassword(e.target.value);
                setStatus('idle');
            }}
          >
            <TextField.Slot>
                <Lock size={16} />
            </TextField.Slot>
          </TextField.Root>

          <TextField.Root 
            placeholder="Confirm Password" 
            type="password"
            value={confirmPassword}
            onChange={(e) => {
                setConfirmPassword(e.target.value);
                setStatus('idle');
            }}
          >
            <TextField.Slot>
                <Lock size={16} />
            </TextField.Slot>
          </TextField.Root>

          {(status === 'validation_error' || status === 'save_error') && (
            <Callout.Root color="red" size="1">
                <Callout.Icon>
                    <AlertTriangle size={16} />
                </Callout.Icon>
                <Callout.Text>
                    {errorMsg}
                </Callout.Text>
            </Callout.Root>
          )}

          {status === 'success' && (
            <Callout.Root color="green" size="1">
                <Callout.Icon>
                    <CheckCircle size={16} />
                </Callout.Icon>
                <Callout.Text>
                    Password updated successfully
                </Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="3" mt="4" justify="end">
            <Button variant="soft" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving...' : 'Set Password'}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default SetPasswordModal;
