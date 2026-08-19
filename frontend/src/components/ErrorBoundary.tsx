import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#080808] px-4">
          <div className="max-w-lg w-full bg-[#111111] border border-red-500/30 rounded-2xl p-8">
            <p className="text-red-400 font-semibold mb-2">Runtime Error</p>
            <pre className="text-xs text-red-300/80 whitespace-pre-wrap break-all">{this.state.error.message}</pre>
            <button onClick={() => window.location.reload()} className="mt-4 text-sm px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors">
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
