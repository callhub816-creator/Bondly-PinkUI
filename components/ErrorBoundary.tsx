import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-6 text-center">
                    <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-[#B28DFF]/20">
                        <h2 className="text-2xl font-serif-display text-[#4A2040] mb-4">Something went wrong</h2>
                        <p className="text-[#5e3a58]/70 mb-8">We encountered an unexpected error. Please refresh the page.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-3 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-full shadow-lg"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
