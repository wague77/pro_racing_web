"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 my-4 text-center">
          <div className="flex items-center justify-center gap-2 text-red-600 font-bold mb-2">
            <AlertTriangle size={20} />
            <span>{this.props.fallbackTitle || "Une erreur est survenue lors de l'affichage de ce composant"}</span>
          </div>
          <p className="text-xs text-red-500 mb-4 font-mono">
            {this.state.error?.message || "Erreur d'affichage"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
