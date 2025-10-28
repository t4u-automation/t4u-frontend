"use client";

import { VncScreen } from "react-vnc";

export default function VncViewer({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--text-tertiary)] text-sm">
        <p>Waiting for agent to start...</p>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        maxWidth: "100%",
        flex: "1 1 0%",
      }}
    >
      <VncScreen
        url={url}
        viewOnly
        scaleViewport
        className="bg-black"
        resizeSession
        style={{
          width: "100%",
          height: "100%",
          minWidth: 0,
          maxWidth: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
