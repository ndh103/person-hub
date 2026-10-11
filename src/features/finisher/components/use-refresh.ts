import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { finisherKeys } from "../api";

/**
 * After a successful write, refetches every Finisher view so lists, counts and
 * week rates update without a reload. Resolves once the active views have
 * their new data.
 */
export function useFinisherRefresh() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: finisherKeys.all }), [queryClient]);
}
