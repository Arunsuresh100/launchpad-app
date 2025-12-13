import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-2xl max-w-2xl">
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <h1 className="text-3xl font-bold mb-2">Something went wrong.</h1>
                <p className="text-slate-300 mb-6">The application encountered an unexpected error.</p>
                <div className="text-left bg-black/50 p-4 rounded-lg font-mono text-xs overflow-auto max-h-64 mb-6 border border-slate-700">
                    <p className="text-red-400 font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                    <pre className="text-slate-500">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                </div>
                <button 
                    onClick={() => {
                        localStorage.clear();
                        window.location.href = '/';
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                >
                    Clear Cache & Reload
                </button>
            </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
