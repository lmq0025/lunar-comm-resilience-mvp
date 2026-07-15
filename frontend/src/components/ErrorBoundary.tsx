import React from "react";
import { Alert, Button } from "antd";
import { reportClientError } from "../api/clientErrors";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(error, errorInfo);
    void reportClientError({
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      user_agent: window.navigator.userAgent,
      context: { componentStack: errorInfo.componentStack }
    }).catch(() => undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <Alert
            type="error"
            showIcon
            message="Interface error"
            description="The current view could not continue rendering. The error was recorded by the backend when available."
            action={<Button onClick={() => this.setState({ hasError: false })}>Retry</Button>}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
