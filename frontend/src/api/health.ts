import { useQuery } from "@tanstack/react-query";
import type { HealthResponse } from "./contracts";
import { requestJson } from "./client";

export function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health");
}

export function useHealthQuery() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 10000,
    retry: 1
  });
}
