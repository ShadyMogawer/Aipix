/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl shadow-xl max-w-3xl mx-auto">
          <h2 className="text-xl font-bold font-sans flex items-center gap-2 mb-2">
            ⚠️ Application Runtime Error Detected
          </h2>
          <p className="text-sm font-medium mb-4">
            The application crashed during client render. Please see the crash details below:
          </p>
          <div className="bg-slate-900 text-rose-305 text-rose-400 p-4 rounded-xl font-mono text-xs overflow-auto max-h-96 border border-slate-800 shadow-inner">
            <div className="font-bold mb-1">{this.state.error?.toString()}</div>
            <pre className="whitespace-pre-wrap mt-2 text-slate-300 leading-relaxed font-mono">
              {this.state.error?.stack}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 bg-rose-600 hover:bg-rose-550 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
