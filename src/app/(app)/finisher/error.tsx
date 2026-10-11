"use client";

import { FinisherError } from "@/features/finisher/components/finisher-error";

export default function FinisherPageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <FinisherError retry={retry} />;
}
