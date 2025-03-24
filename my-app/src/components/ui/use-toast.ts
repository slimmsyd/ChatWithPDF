// Adapted from shadcn/ui toast primitive
import { useState } from "react";

type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  function toast({
    title,
    description,
    action,
    variant = "default",
  }: Omit<ToastProps, "id">) {
    const id = Math.random().toString(36).slice(2);
    const newToast = { id, title, description, action, variant };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
    
    return {
      id,
      dismiss: () => setToasts((prev) => prev.filter((t) => t.id !== id)),
    };
  }

  return { toast, toasts, setToasts };
} 