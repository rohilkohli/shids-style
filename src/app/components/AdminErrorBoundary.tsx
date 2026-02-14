"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * AdminErrorBoundary - Catches React errors in the admin panel
 * and displays a recovery UI instead of crashing the entire app.
 */
export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to console for debugging
    console.error("AdminErrorBoundary caught an error:", error, errorInfo);
    
    // Here you could also send to an error tracking service
    // e.g., Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails } = this.state;

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-white/80 text-sm">
                An unexpected error occurred in the admin panel
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Error message */}
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800">
                  {error?.message || "An unknown error occurred"}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>

              {/* Reload option */}
              <button
                onClick={this.handleReload}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                Or reload the page
              </button>

              {/* Technical details (collapsible) */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center justify-between w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  <span>Technical details</span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showDetails && (
                  <div className="mt-3 space-y-3">
                    {/* Error name */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                        Error Type
                      </p>
                      <p className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded">
                        {error?.name || "Unknown"}
                      </p>
                    </div>

                    {/* Stack trace */}
                    {error?.stack && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                          Stack Trace
                        </p>
                        <pre className="text-xs font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded overflow-x-auto max-h-40">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {/* Component stack */}
                    {errorInfo?.componentStack && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                          Component Stack
                        </p>
                        <pre className="text-xs font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded overflow-x-auto max-h-40">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Smaller error boundary for wrapping specific sections/components
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error("SectionErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 mb-1">
                This section encountered an error
              </p>
              <p className="text-xs text-red-600 mb-3">
                {this.state.error?.message || "Unknown error"}
              </p>
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
