"use client";

import { VncScreen } from "react-vnc";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function VncViewer({ url }: { url: string | null }) {
  const [urlWithToken, setUrlWithToken] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setUrlWithToken(null);
      return;
    }

    const addTokenToUrl = async () => {
      try {
        // Get Firebase token
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.warn("[VncViewer] No authenticated user found");
          setUrlWithToken(url); // Use URL without token if no user
          return;
        }

        const token = await currentUser.getIdToken();
        
        // Parse the URL to check if it already has query parameters
        const urlObj = new URL(url);
        
        // Add or update the token parameter
        urlObj.searchParams.set('token', token);
        
        setUrlWithToken(urlObj.toString());
      } catch (error) {
        console.error("[VncViewer] Error getting token:", error);
        setUrlWithToken(url); // Fallback to original URL if token fetch fails
      }
    };

    addTokenToUrl();
  }, [url]);

  if (!urlWithToken) {
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
        url={urlWithToken}
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
