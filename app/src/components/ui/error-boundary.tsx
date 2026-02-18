import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background text-foreground">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="mb-6 text-muted-foreground max-w-md">
            An unexpected error occurred. Please try reloading the page.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
              Try Again
            </Button>
          </div>
          {this.state.error && (
            <div className="mt-8 p-4 bg-muted rounded-md text-left w-full max-w-2xl overflow-auto max-h-[300px]">
              <p className="font-mono text-xs text-red-500">{this.state.error.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
