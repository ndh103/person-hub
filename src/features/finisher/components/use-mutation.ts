"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { ApiResult } from "../api";
import type { FieldErrors } from "../domain/validation";
import { generalErrorMessage } from "../messages";

/**
 * Runs one Finisher API call: disables the control while pending (prevents
 * duplicates, FIN-019), keeps server field errors for the form, and refreshes
 * the server-rendered page after success so lists update without a reload.
 */
export function useMutation() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const [refreshing, startRefresh] = useTransition();
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
        if (options.refresh !== false) startRefresh(() => router.refresh());
      } else {
        setFieldErrors(result.fields ?? {});
        setFormError(result.error === "validation" ? null : generalErrorMessage(result.error));
      }
      return result;
    },
    [router],
  );

  const reset = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  return { run, pending: requesting || refreshing, fieldErrors, setFieldErrors, formError, reset };
}
