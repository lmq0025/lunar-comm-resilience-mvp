import React from "react";
import { Alert, Button } from "antd";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <Alert
            type="error"
            showIcon
            message="界面发生异常"
            description="当前页面无法继续渲染。详细错误已记录到开发者控制台。"
            action={<Button onClick={() => this.setState({ hasError: false })}>重试</Button>}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
