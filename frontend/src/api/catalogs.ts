import { useQuery } from "@tanstack/react-query";
import type { CatalogResponse } from "./contracts";
import { requestJson } from "./client";

export function getCatalogs(): Promise<CatalogResponse> {
  return requestJson<CatalogResponse>("/catalogs");
}

export function useCatalogsQuery() {
  return useQuery({
    queryKey: ["catalogs"],
    queryFn: getCatalogs,
    retry: 1
  });
}
