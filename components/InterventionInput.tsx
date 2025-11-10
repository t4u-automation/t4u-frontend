"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { sendIntervention } from "@/lib/api";

interface InterventionInputProps {
  sessionId: string;
  onSent?: () => void;
}

export default function InterventionInput({ sessionId, onSent }: InterventionInputProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isSending) return;

    try {
      setIsSending(true);
      await sendIntervention(sessionId, input.trim());
      setInput("");
      onSent?.();
    } catch (error) {
      console.error("[InterventionInput] Failed to send intervention:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 bg-white border-t border-[var(--border-light)]">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--fill-input-chat)] rounded-[22px] border border-black/8 shadow-[0px_12px_32px_0px_rgba(0,0,0,0.02)] p-3">
          <div className="mb-3 px-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="w-full bg-transparent border-0 outline-none resize-none placeholder:text-[var(--text-disable)] text-[15px] disabled:opacity-50"
              rows={1}
              placeholder="Respond to agent intervention..."
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isSending}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-main)] hover:bg-[var(--fill-tsp-gray-main)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-[var(--icon-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} className="text-[var(--icon-primary)]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

