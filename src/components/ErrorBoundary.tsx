import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4 max-w-md p-6">
            <h1 className="text-2xl font-bold">Er ging iets mis</h1>
            <p className="text-muted-foreground">
              Er is een onverwachte fout opgetreden. Probeer de pagina te vernieuwen.
            </p>
            {this.state.error?.message && (
              <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Pagina Vernieuwen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
