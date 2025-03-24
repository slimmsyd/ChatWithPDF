"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as ToastProviderBase,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/toast";

export function ToastProvider() {
  const { toasts } = useToast();

  return (
    <ToastProviderBase>
      {toasts.map(({ id, title, description, action, variant }) => (
        <Toast key={id} variant={variant}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProviderBase>
  );
} 