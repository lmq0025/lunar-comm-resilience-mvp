import React from "react";
import { CopyOutlined, ReloadOutlined, RollbackOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Space, Typography } from "antd";
import { reportClientError } from "../api/clientErrors";
import { useUiStore } from "../stores/uiStore";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  occurredAt: string | null;
  page: string | null;
  requestId: string | null;
}

const INITIAL_STATE: ErrorBoundaryState = {
  hasError: false,
  error: null,
  componentStack: null,
  occurredAt: null,
  page: null,
  requestId: null
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      occurredAt: new Date().toISOString(),
      page: useUiStore.getState().activeMenu
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack ?? null });
    void reportClientError({
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      user_agent: window.navigator.userAgent,
      context: {
        page: useUiStore.getState().activeMenu,
        occurred_at: this.state.occurredAt,
        component_stack: errorInfo.componentStack
      }
    }).then((response) => this.setState({ requestId: response.request_id ?? null })).catch(() => undefined);
  }

  private reset = () => this.setState(INITIAL_STATE);

  private returnToProjects = () => {
    useUiStore.getState().setActiveMenu("projects");
    this.reset();
  };

  private copyDetails = async () => {
    await navigator.clipboard.writeText(this.errorDetails());
  };

  private errorDetails(): string {
    return [
      `错误摘要: ${this.state.error?.message ?? "未知错误"}`,
      `发生页面: ${this.state.page ?? "unknown"}`,
      `发生时间: ${this.state.occurredAt ?? "unknown"}`,
      `request_id: ${this.state.requestId ?? "尚未获得"}`,
      this.state.error?.stack ?? "",
      this.state.componentStack ?? ""
    ].filter(Boolean).join("\n");
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="error-boundary">
        <Alert
          type="error"
          showIcon
          message="界面发生错误"
          description="当前页面无法继续渲染。错误信息已尝试上报到本地后端。"
        />
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="错误摘要">{this.state.error?.message ?? "未知错误"}</Descriptions.Item>
          <Descriptions.Item label="发生页面">{this.state.page ?? "未知页面"}</Descriptions.Item>
          <Descriptions.Item label="发生时间">{formatTime(this.state.occurredAt)}</Descriptions.Item>
          <Descriptions.Item label="request_id">{this.state.requestId ?? "尚未获得"}</Descriptions.Item>
        </Descriptions>
        {import.meta.env.DEV ? (
          <Typography.Paragraph><pre className="error-stack">{this.errorDetails()}</pre></Typography.Paragraph>
        ) : null}
        <Space wrap>
          <Button type="primary" icon={<ReloadOutlined />} onClick={this.reset}>重试当前页面</Button>
          <Button icon={<RollbackOutlined />} onClick={this.returnToProjects}>返回项目管理</Button>
          <Button icon={<CopyOutlined />} onClick={() => void this.copyDetails()}>复制错误信息</Button>
        </Space>
      </div>
    );
  }
}

function formatTime(value: string | null): string {
  return value ? new Date(value).toLocaleString("zh-CN") : "未知";
}
