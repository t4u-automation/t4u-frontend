"use client";

import { useState } from "react";
import { Monitor, Maximize2, Minimize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Artifact } from "@/types";

const VncViewer = dynamic(() => import("./VncViewer.client"), {
  ssr: false,
});

interface FloatingVNCProps {
  vncUrl: string | null;
  isVNCActive: boolean;
  totalCost?: number;
  totalTokens?: number;
}

export default function FloatingVNC({
  vncUrl,
  isVNCActive,
  totalCost,
  totalTokens,
}: FloatingVNCProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    // Show only a small button in bottom-right corner
    return (
      <button
        id="FloatingVNCMinimized"
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[var(--Button-primary-black)] text-white rounded-[12px] shadow-lg hover:opacity-90 transition-opacity"
      >
        <Monitor size={20} className={isVNCActive ? "text-green-400" : "text-white"} />
        <span className="text-sm font-medium">View Computer</span>
      </button>
    );
  }

  return (
    <div
      id="FloatingVNC"
      className={`fixed z-40 bg-white rounded-[12px] shadow-xl border border-[var(--border-main)] transition-all duration-300 ${
        isExpanded
          ? "bottom-6 right-6 w-[800px] h-[600px]"
          : "bottom-6 right-6 w-[264px] h-[198px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-main)] bg-[var(--fill-tsp-white-light)]">
        <div className="flex items-center gap-3">
          <Monitor size={16} className={isVNCActive ? "text-green-500" : "text-[var(--icon-secondary)]"} />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Computer
          </span>
          {isExpanded && totalCost !== undefined && totalTokens !== undefined && (
            <span className="text-xs text-[var(--text-secondary)]">
              (${totalCost.toFixed(3)}/{(totalTokens / 1000).toFixed(1)}K tokens)
            </span>
          )}
          {/* Status Indicator */}
          <span className="flex items-center gap-1.5 ml-auto mr-2">
            <div className={`w-2 h-2 rounded-full ${isVNCActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className={`text-xs font-medium ${isVNCActive ? "text-green-600" : "text-red-600"}`}>
              {isVNCActive ? "online" : "offline"}
            </span>
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 size={16} className="text-[var(--icon-secondary)]" />
            ) : (
              <Maximize2 size={16} className="text-[var(--icon-secondary)]" />
            )}
          </button>
          
          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
            title="Minimize"
          >
            <X size={16} className="text-[var(--icon-secondary)]" />
          </button>
        </div>
      </div>

      {/* VNC Content */}
      <div className="h-[calc(100%-44px)] bg-[#1a1a1a] flex items-center justify-center">
        {vncUrl && isVNCActive ? (
          <VncViewer url={vncUrl} />
        ) : (
          <div className="text-center text-gray-400 text-sm">
            Waiting for agent to start...
          </div>
        )}
      </div>
    </div>
  );
}

