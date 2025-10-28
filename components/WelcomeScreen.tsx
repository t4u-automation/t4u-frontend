"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Plus, Send } from "lucide-react";
import { useState } from "react";

interface WelcomeScreenProps {
  onSubmit: (prompt: string) => void;
  isSubmitting: boolean;
}

export default function WelcomeScreen({
  onSubmit,
  isSubmitting,
}: WelcomeScreenProps) {
  const { user } = useAuth();
  const [userInput, setUserInput] = useState("");

  const handleSubmit = () => {
    if (userInput.trim() && !isSubmitting) {
      onSubmit(userInput);
      setUserInput(""); // Clear input after submission
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div id="Home" className="flex-1 min-w-0 h-full py-0 pr-0 relative">
      <div className="relative min-w-0 w-full h-full">
        <div className="flex flex-col h-full bg-[var(--background-gray-main)]">
          <div className="flex flex-1 min-w-0 min-h-0 relative">
            <div className="flex flex-1 min-w-0 h-full overflow-auto">
              <div className="flex flex-col h-full flex-1 min-w-0 justify-start items-start relative px-5 w-full max-w-full sm:max-w-full">
                <div className="w-full max-w-full sm:max-w-[768px] sm:min-w-[390px] mx-auto mt-[12vh]">
                  {/* Welcome Section */}
                  <div
                    id="WelcomeSection"
                    className="w-full flex flex-col justify-start items-start gap-5"
                  >
                    <div className="w-full flex pl-4 items-end justify-between pb-4">
                      <span
                        id="WelcomeHeading"
                        className="text-[var(--text-primary)] text-start font-serif text-[32px] leading-[40px]"
                      >
                        Hello {user?.displayName || "Guest"}
                        <br />
                        <span
                          id="WelcomeSubheading"
                          className="text-[var(--text-tertiary)]"
                        >
                          What can I do for you?
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Input Container */}
                  <div
                    id="InputContainer"
                    className="flex flex-col gap-1 w-full"
                  >
                    <div className="flex flex-col bg-[var(--background-gray-main)] w-full">
                      <div className="relative bg-[var(--background-gray-main)]">
                        <div className="flex flex-col gap-3 rounded-[22px] transition-all relative bg-[var(--fill-input-chat)] py-3 max-h-[400px] shadow-[0px_12px_32px_0px_rgba(0,0,0,0.02)] border border-black/8">
                          <div className="overflow-y-auto pl-4 pr-2">
                            <textarea
                              id="TaskInput"
                              value={userInput}
                              onChange={(e) => setUserInput(e.target.value)}
                              onKeyDown={handleKeyDown}
                              disabled={isSubmitting}
                              className="flex rounded-md border-input focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden flex-1 bg-transparent p-0 pt-[1px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full placeholder:text-[var(--text-disable)] text-[15px] shadow-none resize-none min-h-[80px]"
                              rows={4}
                              placeholder="Assign a task or ask anything"
                            />
                          </div>

                          <div className="px-3 flex gap-2 item-center">
                            <div
                              id="InputToolbarLeft"
                              className="flex gap-2 items-center flex-shrink-0"
                            >
                              <button
                                id="AddButton"
                                disabled={isSubmitting}
                                className={`rounded-full border border-[var(--border-main)] inline-flex items-center justify-center gap-1 clickable text-xs text-[var(--text-secondary)] w-8 h-8 p-0 shrink-0 ${
                                  isSubmitting
                                    ? "cursor-not-allowed opacity-50"
                                    : "cursor-pointer hover:bg-[var(--fill-tsp-gray-main)]"
                                }`}
                              >
                                <Plus
                                  size={18}
                                  className="text-[var(--icon-primary)]"
                                />
                              </button>
                            </div>

                            <div className="min-w-0 flex gap-2 ml-auto flex-shrink items-center">
                              <button
                                id="SendButton"
                                disabled={isSubmitting}
                                onClick={handleSubmit}
                                className={`flex items-center justify-center size-8 flex-shrink-0 rounded-full border border-[var(--border-main)] ${
                                  isSubmitting
                                    ? "cursor-not-allowed opacity-50"
                                    : "cursor-pointer hover:bg-[var(--fill-tsp-gray-main)]"
                                }`}
                              >
                                <Send
                                  size={16}
                                  className="text-[var(--icon-primary)]"
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
