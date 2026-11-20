import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Domino Sky Application Error]:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans"
        >
          <div className="bg-white border border-red-200 shadow-xl rounded-2xl max-w-lg w-full p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl mx-auto flex items-center justify-center border border-red-100">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Simulation Runtime Exception
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                An unexpected interface error interrupted the simulation. Your simulation state has been preserved safely.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left font-mono text-xs text-red-600 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Simulator
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
