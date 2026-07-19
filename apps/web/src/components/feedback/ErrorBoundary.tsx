import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorPage } from '@/pages/ErrorPage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Render sırasında oluşan yakalanmamış hataları karşılar; beyaz ekran yerine ErrorPage gösterir. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Yakalanmamış render hatası:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorPage />;
    }
    return this.props.children;
  }
}
