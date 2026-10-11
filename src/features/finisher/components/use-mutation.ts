import { useCallback, useState } from "react";
import type { ApiResult } from "../api";
import type { FieldErrors } from "../domain/validation";
import { generalErrorMessage } from "../messages";
import { useFinisherRefresh } from "./use-refresh";

/**
 * Runs one Finisher API call: disables the control while pending (prevents
 * duplicates, FIN-019), keeps server field errors for the form, and refreshes
 * the Finisher views after success so lists update without a reload.
 */
export function useMutation() {
  const refreshViews = useFinisherRefresh();
  const [requesting, setRequesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(call: () => Promise<ApiResult<T>>, options: { refresh?: boolean } = {}): Promise<ApiResult<T>> => {
      setRequesting(true);
      setFormError(null);
      const result = await call();
      setRequesting(false);
      if (result.ok) {
        setFieldErrors({});
        if (options.refresh !== false) {
          setRefreshing(true);
          void refreshViews().finally(() => setRefreshing(false));
        }
      } else {
        setFieldErrors(result.fields ?? {});
        setFormError(result.error === "validation" ? null : generalErrorMessage(result.error));
      }
      return result;
    },
    [refreshViews],
  );

  const reset = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  return { run, pending: requesting || refreshing, fieldErrors, setFieldErrors, formError, reset };
}
