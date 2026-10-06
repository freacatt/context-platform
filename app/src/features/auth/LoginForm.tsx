import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Flow = 'signIn' | 'signUp';

const COPY: Record<Flow, { title: string; description: string; submit: string; switchPrompt: string; switchAction: string }> = {
  signIn: {
    title: 'Login',
    description: 'Enter your email below to login to your account',
    submit: 'Login',
    switchPrompt: "Don't have an account? ",
    switchAction: 'Sign up',
  },
  signUp: {
    title: 'Create Account',
    description: 'Enter your email below to create your account',
    submit: 'Sign Up',
    switchPrompt: 'Already have an account? ',
    switchAction: 'Login',
  },
};

/** Convex Auth reports bad credentials with a generic error; translate it for people. */
function describeAuthError(error: unknown, flow: Flow): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Password must be')) return message.slice(message.indexOf('Password must be')).split('\n')[0];
  if (flow === 'signUp' && message.includes('already exists')) return 'An account with this email already exists. Try logging in.';
  return flow === 'signIn' ? 'Invalid email or password.' : 'Could not create the account. Please try again.';
}

export function LoginForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<Flow>('signIn');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const copy = COPY[flow];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn('password', new FormData(event.currentTarget));
    } catch (err) {
      setError(describeAuthError(err, flow));
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-black shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div role="alert" className="text-red-500 text-sm font-medium">
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </div>
          <input name="flow" type="hidden" value={flow} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {copy.submit}
          </Button>
          <div className="text-center text-sm">
            {copy.switchPrompt}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => {
                setFlow(flow === 'signIn' ? 'signUp' : 'signIn');
                setError('');
              }}
            >
              {copy.switchAction}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
