import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Production telemetry or logger can be invoked here
    console.error('Unhandled React Render Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-16 bg-gradient-to-b from-slate-50 to-background text-foreground">
          <div className="mx-auto max-w-lg text-center">
            {/* Visual Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/5">
              <AlertTriangle className="h-10 w-10" />
            </div>

            {/* Error Content */}
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Something went wrong
            </h1>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              We encountered an unexpected problem rendering this view. Your session and data are secure.
            </p>

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="default"
                onClick={this.handleReload}
                className="w-full sm:w-auto rounded-xl py-5 font-semibold shadow-md gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="w-full sm:w-auto rounded-xl py-5 font-semibold gap-2 border-border/80"
              >
                <Home className="h-4 w-4" />
                Return to Homepage
              </Button>
            </div>

            {/* Expandable Developer Diagnostics in dev */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-10 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-left">
                <summary className="cursor-pointer text-xs font-semibold text-destructive">
                  Technical Diagnostics (Developer Mode)
                </summary>
                <pre className="mt-3 overflow-x-auto text-[11px] font-mono text-destructive/90 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
