"use client";

import { CheckCircle, XCircle, X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div
      id={`Toast_${toast.id}`}
      className={`flex items-center gap-3 min-w-[320px] max-w-md p-4 rounded-[12px] shadow-lg border animate-slide-up ${
        toast.type === "success"
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {toast.type === "success" ? (
          <CheckCircle size={20} className="text-green-500" />
        ) : (
          <XCircle size={20} className="text-red-500" />
        )}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            toast.type === "success" ? "text-green-700" : "text-red-700"
          }`}
        >
          {toast.message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={() => onClose(toast.id)}
        className={`flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors ${
          toast.type === "success" ? "text-green-600" : "text-red-600"
        }`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      id="ToastContainer"
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

