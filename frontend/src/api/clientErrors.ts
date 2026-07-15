import type { ClientErrorRequest, ClientErrorResponse } from "./contracts";
import { requestJson } from "./client";

export function reportClientError(payload: ClientErrorRequest): Promise<ClientErrorResponse> {
  return requestJson<ClientErrorResponse>("/client-errors", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
