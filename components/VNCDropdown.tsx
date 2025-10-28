"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";

const VncViewer = dynamic(() => import("@/components/VncViewer.client"), {
  ssr: false,
});

interface VNCDropdownProps {
  vncUrl: string | null;
  isVNCActive: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function VNCDropdown({
  vncUrl,
  isVNCActive,
  isOpen,
  onClose,
}: VNCDropdownProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen
            ? "bg-opacity-50 pointer-events-auto"
            : "bg-opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Off-canvas Slider */}
      <div
        className={`fixed top-0 right-0 h-full w-full bg-white shadow-2xl z-50 flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)] bg-white">
          <div className="flex items-center gap-3">
            <h3 className="text-[var(--text-primary)] text-lg font-semibold">
              T4U Computer
            </h3>
            <div className="flex items-center gap-1 text-sm">
              <div
                className={`h-[8px] w-[8px] rounded-full ${
                  isVNCActive ? "bg-green-500" : "bg-[var(--function-error)]"
                }`}
              />
              <span className="text-[var(--text-tertiary)]">
                {isVNCActive ? "live" : "offline"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--fill-tsp-gray-main)] transition-colors"
          >
            <X size={18} className="text-[var(--icon-primary)]" />
          </button>
        </div>

        {/* VNC Content - Full screen content */}
        <div className="flex-1 overflow-hidden bg-black">
          {vncUrl ? (
            <div className="w-full h-full">
              <VncViewer url={vncUrl} />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm">
              <p>Waiting for agent to start...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
