"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        id="ConfirmDialog"
        className="bg-white rounded-[16px] shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon and Title */}
        <div className="p-6 pb-4">
          {isDanger && (
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            </div>
          )}
          <h2 className="text-lg font-semibold text-[var(--text-primary)] text-center">
            {title}
          </h2>
        </div>

        {/* Message */}
        <div className="px-6 pb-6">
          <p className="text-sm text-[var(--text-secondary)] text-center">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white border border-[var(--border-main)] rounded-[8px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-white-light)] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-[8px] text-sm font-medium text-white transition-opacity hover:opacity-90 ${
              isDanger
                ? "bg-red-500"
                : "bg-[var(--Button-primary-black)]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

