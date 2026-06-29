import React from 'react';

export interface RendererErrorBoundaryProps {
  children: React.ReactNode;
  fallback: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface RendererErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 渲染器错误边界类组件
 * 捕获渲染器加载失败和运行时错误
 */
export class RendererErrorBoundary extends React.Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  constructor(props: RendererErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[file-preview] Renderer error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }

    return this.props.children;
  }
}
