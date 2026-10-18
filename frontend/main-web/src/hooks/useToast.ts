import { useCallback, useState } from "react";

export type ToastState = { message: string; type: "success" | "error" } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  return { toast, showToast };
}
