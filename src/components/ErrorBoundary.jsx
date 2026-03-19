// src/components/ErrorBoundary.jsx — Production-grade error boundary
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production you'd send this to an error tracking service
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-6">
        <div className="max-w-md w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <p className="text-5xl mb-4">😵</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            An unexpected error occurred. Your data is safe — please try refreshing the page.
          </p>

          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mb-4 text-left">
              <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer mb-1">
                Error details
              </summary>
              <pre className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 rounded-lg overflow-auto max-h-40">
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = "/"}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}