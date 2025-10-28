"use client";

import { useResponsiveVNC } from "@/hooks/useResponsiveVNC";
import { ChatSession, Artifact } from "@/types";
import { Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BrowserPreview from "./BrowserPreview";
import MessageItem from "./MessageItem";
import SystemEventsHeader from "./SystemEventsHeader";
import VNCDropdown from "./VNCDropdown";
import { sendIntervention } from "@/lib/api";

interface ChatViewProps {
  session: ChatSession;
  vncUrl: string | null;
  isVNCActive: boolean;
  artifacts?: Artifact[];
  totalCost?: number;
  totalTokens?: number;
  vncDropdownState?: {
    isSmallScreen: boolean;
    showVNCDropdown: boolean;
    hasOpenedDropdown: boolean;
    closeVNCDropdown: () => void;
  };
}

export default function ChatView({
  session,
  vncUrl,
  isVNCActive,
  artifacts = [],
  totalCost,
  totalTokens,
  vncDropdownState,
}: ChatViewProps) {
  const [userInput, setUserInput] = useState("");
  const localVNCState = useResponsiveVNC();
  const aiMessageRef = useRef<HTMLDivElement>(null);

  // Use passed state if available, otherwise use local state
  const {
    isSmallScreen,
    showVNCDropdown,
    hasOpenedDropdown,
    closeVNCDropdown,
  } = vncDropdownState || localVNCState;

  const handleSubmit = async () => {
    if (userInput.trim() && session.id) {
      const message = userInput.trim();
      setUserInput("");
      
      try {
        await sendIntervention(session.id, message);
        console.log("[ChatView] Intervention sent:", message);
      } catch (error) {
        console.error("[ChatView] Failed to send intervention:", error);
        // Optionally show error to user
      }
    }
  };

  const scrollToAIMessage = () => {
    if (aiMessageRef.current) {
      aiMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div
      id="ChatView"
      className="flex flex-1 h-full overflow-auto sm:px-3 bg-[var(--background-gray-main)]"
    >
      {/* Chat Messages Panel */}
      <div className="flex flex-col flex-1 h-full">
        {/* Messages Container */}

        <div className="flex-1 overflow-y-scroll mx-auto w-full min-w-0 max-w-[768px] pe-1 px-3 sm:pe-2 pb-6">
          {/* Task Header - Sticky link to main task */}
          <SystemEventsHeader
            message={
              session.messages.find((m) => m.role === "assistant") || null
            }
            onScrollToMessage={scrollToAIMessage}
          />

          <div className="flex flex-col gap-3 pt-3">
            {session.messages.map((message) => (
              <div
                key={message.id}
                ref={message.role === "assistant" ? aiMessageRef : null}
              >
                <MessageItem message={message} />
              </div>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="px-2 sm:px-5 pb-4 shrink-0 bg-[var(--background-gray-main)]">
          <div className="mx-auto w-full max-w-[768px]">
            <div className="bg-[var(--fill-input-chat)] rounded-[22px] border border-black/8 shadow-[0px_12px_32px_0px_rgba(0,0,0,0.02)] p-3">
              <div className="mb-3 px-1">
                <textarea
                  id="ChatInput"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="w-full bg-transparent border-0 outline-none resize-none placeholder:text-[var(--text-disable)] text-[15px] "
                  rows={1}
                  placeholder="Send message to T4U"
                />
              </div>

              <div className="flex items-center justify-between">
                <button className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-main)] hover:bg-[var(--fill-tsp-gray-main)] transition-colors">
                  <Plus size={18} className="text-[var(--icon-primary)]" />
                </button>

                <button
                  onClick={handleSubmit}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-main)] hover:bg-[var(--fill-tsp-gray-main)] transition-colors"
                >
                  <Send size={16} className="text-[var(--icon-primary)]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Browser Preview - Only show on large screens */}
      {!isSmallScreen && (
        <BrowserPreview
          vncUrl={vncUrl}
          isVNCActive={isVNCActive}
          artifacts={artifacts}
          totalCost={totalCost}
          totalTokens={totalTokens}
        />
      )}

      {/* VNC Dropdown for small screens */}
      <VNCDropdown
        vncUrl={vncUrl}
        isVNCActive={isVNCActive}
        isOpen={isSmallScreen && showVNCDropdown}
        onClose={closeVNCDropdown}
      />

      {/* Hidden VNC for maintaining connection when dropdown is closed */}
      {isSmallScreen && hasOpenedDropdown && !showVNCDropdown && (
        <div className="hidden">
          <BrowserPreview
            vncUrl={vncUrl}
            isVNCActive={isVNCActive}
            artifacts={artifacts}
            totalCost={totalCost}
            totalTokens={totalTokens}
          />
        </div>
      )}
    </div>
  );
}
