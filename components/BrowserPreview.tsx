"use client";

import { Artifact } from "@/types";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import ArtifactsModal from "./ArtifactsModal";

interface BrowserPreviewProps {
  vncUrl: string | null;
  isVNCActive: boolean;
  artifacts?: Artifact[];
  totalCost?: number;
  totalTokens?: number;
}

const VncViewer = dynamic(() => import("@/components/VncViewer.client"), {
  ssr: false,
});

export default function BrowserPreview({
  vncUrl,
  isVNCActive,
  artifacts = [],
  totalCost,
  totalTokens,
}: BrowserPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatCost = (cost: number) => {
    return cost.toFixed(3);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <>
      <ArtifactsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        artifacts={artifacts}
      />
      <div
        id="BrowserPreview"
        className="h-full w-full pt-3 pb-4 flex-shrink min-w-0"
        style={{ maxWidth: "872px", flexBasis: "872px" }}
      >
        <div className="w-full h-full overflow-hidden">
          <div
            id="BrowserFrame"
            className="flex h-full w-full border border-[var(--border-dark)] shadow-[0_8px_32px_0_var(--shadow-XS)] bg-[var(--background-menu-white)] rounded-[22px] min-w-0"
          >
            <div className="flex-1 min-w-0 p-4 flex flex-col h-full min-w-0">
              {/* Header */}
              <div
                id="BrowserHeader"
                className="flex items-center gap-[8px] w-full mb-3"
              >
                <div
                  id="BrowserTitle"
                  className="text-[var(--text-primary)] text-base font-[500] leading-[22px] flex-1"
                >
                  T4U Computer
                  {totalCost !== undefined && totalTokens !== undefined && (
                    <span className="text-[var(--text-secondary)] text-sm font-normal ml-2">
                      (${formatCost(totalCost)}/{formatTokens(totalTokens)}T)
                    </span>
                  )}
                </div>

                {/* Download Icon */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="View files"
                >
                  <Download
                    size={20}
                    className="text-[var(--text-secondary)]"
                  />
                  {artifacts.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {artifacts.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Browser Frame */}
              <div
                id="BrowserContent"
                className="flex flex-col rounded-[12px] overflow-hidden bg-[var(--background-gray-main)] border border-[var(--border-dark)] shadow-[0px_4px_32px_0px_rgba(0,0,0,0.04)] flex-1 min-h-0 min-w-0"
              >
                {/* URL Bar */}
                <div
                  id="BrowserURLBar"
                  className="h-[36px] flex items-center px-3 w-full bg-[var(--background-gray-main)] border-b border-[var(--border-main)] rounded-t-lg"
                >
                  <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-[250px] truncate text-[var(--text-tertiary)] text-sm font-medium text-center">
                      <span className="text-xs">
                        {vncUrl ? "Live Preview" : "Waiting for connection..."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VNC Display */}
                <div
                  id="ScreenshotDisplay"
                  className="flex-1 min-h-0 w-full overflow-hidden min-w-0"
                >
                  <div className="w-full h-full object-cover flex items-center justify-center bg-[var(--fill-white)] relative min-w-0">
                    <VncViewer url={vncUrl} />
                  </div>
                </div>
              </div>

              {/* Live Indicator */}
              <div
                id="PlaybackControls"
                className="mt-auto flex w-full items-center gap-2 px-4 h-[44px] shrink-0 relative bg-[var(--background-menu-white)]  border-[var(--border-main)] rounded-b-[12px]"
              >
                <div
                  id="LiveIndicator"
                  className="flex items-center gap-1 text-sm ms-[2px]"
                >
                  <div
                    className={`h-[8px] w-[8px] rounded-full ${
                      isVNCActive
                        ? "bg-green-500"
                        : "bg-[var(--function-error)]"
                    }`}
                  />
                  <span className="text-[var(--text-tertiary)]">
                    {isVNCActive ? "live" : "offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
