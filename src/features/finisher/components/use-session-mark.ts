import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { finisherApi } from "../api";
import type { LocalDate } from "../domain/dates";
import type { SessionState } from "../domain/schedule";
import { generalErrorMessage } from "../messages";
import { useFinisherRefresh } from "./use-refresh";

/** Saves a session mark optimistically and reverts with a message on failure (FIN-027, FIN-045). */
export function useSessionMark(slotId: string, date: LocalDate, saved: SessionState) {
  const refresh = useFinisherRefresh();
  const [optimistic, setOptimistic] = useState<SessionState | null>(null);
  const state = optimistic ?? saved;

  async function mark(next: SessionState, label: string) {
    setOptimistic(next);
    const result = await finisherApi("PUT", "/api/finisher/sessions", { slotId, date, state: next });
    if (!result.ok) {
      setOptimistic(null);
      toast.add({ title: `Couldn’t update “${label}”`, description: generalErrorMessage(result.error), type: "error" });
      return;
    }
    // Keep the optimistic state until the refreshed views have the saved mark.
    void refresh().finally(() => setOptimistic(null));
  }

  return { state, mark };
}
