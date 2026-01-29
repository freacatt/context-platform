import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Try logging in.');
      } else {
        setError(err.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isResetting) {
        await resetPassword(email);
        setResetSent(true);
      } else if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Try logging in.');
      } else {
        setError(err.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-2 border-black shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isResetting ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Login')}
          </CardTitle>
          <CardDescription>
            {isResetting 
              ? "Enter your email to receive a password reset link" 
              : (isSignUp 
                  ? "Enter your email below to create your account" 
                  : "Enter your email below to login to your account")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetSent ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="text-green-600 text-sm">Password reset email sent! Check your inbox.</div>
              <Button variant="outline" onClick={() => {
                setResetSent(false);
                setIsResetting(false);
              }}>
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth}>
              <div className="flex flex-col gap-6">
                {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
                
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {!isResetting && (
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      {!isSignUp && (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsResetting(true);
                            setError('');
                          }}
                          className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                        >
                          Forgot your password?
                        </a>
                      )}
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isResetting ? 'Send Reset Link' : (isSignUp ? 'Sign Up' : 'Login')}
                </Button>

                {!isResetting && (
                  <Button variant="outline" className="w-full" type="button" onClick={handleGoogleSignIn} disabled={loading}>
                     <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                    </svg>
                    {isSignUp ? 'Sign up with Google' : 'Login with Google'}
                  </Button>
                )}
              </div>
              
              <div className="mt-4 text-center text-sm">
                {isResetting ? (
                  <a 
                    href="#" 
                    className="underline underline-offset-4"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsResetting(false);
                      setError('');
                    }}
                  >
                    Back to Login
                  </a>
                ) : (
                  <>
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    <a 
                      href="#" 
                      className="underline underline-offset-4"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsSignUp(!isSignUp);
                        setError('');
                      }}
                    >
                      {isSignUp ? "Login" : "Sign up"}
                    </a>
                  </>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
