import { useEffect } from "react";
import { App as AntApp } from "antd";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./layouts/AppLayout";
import { useProjectStore } from "./stores/projectStore";

export default function App() {
  const loadFromStorage = useProjectStore((state) => state.loadFromStorage);
  const dirty = useProjectStore((state) => state.dirty);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return (
    <AntApp>
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    </AntApp>
  );
}
