import { useMutation } from "@tanstack/react-query";
import type { ScenarioPayload, ScenarioValidationResponse } from "./contracts";
import { requestJson } from "./client";

export function validateScenario(scenario: ScenarioPayload): Promise<ScenarioValidationResponse> {
  return requestJson<ScenarioValidationResponse>("/scenarios/validate", {
    method: "POST",
    body: JSON.stringify(scenario)
  });
}

export function useScenarioValidationMutation() {
  return useMutation({
    mutationKey: ["scenario-validation"],
    mutationFn: validateScenario
  });
}
