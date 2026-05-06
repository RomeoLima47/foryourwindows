"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="py-8 text-center">
              <p className="mb-3 text-3xl">⚠️</p>
              <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                An unexpected error occurred. Try refreshing the page.
              </p>
              {this.state.error && (
                <p className="mb-4 rounded bg-muted p-2 text-xs font-mono text-muted-foreground">
                  {this.state.error.message}
                </p>
              )}
              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
