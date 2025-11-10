"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgentStep, AgentSession } from "@/types";
import { Check, Loader2, Server, Box, Network, Terminal } from "lucide-react";

interface SandboxSetupSectionProps {
  sessionId: string;
  tenantId?: string;
  isVisible?: boolean;
}

interface SandboxEvent {
  id: string;
  type: "sandbox_initializing" | "sandbox_ready" | "sandbox_configured";
  status: "running" | "completed" | "error";
  sandboxId?: string;
  timestamp: string;
  details?: string;
}

export default function SandboxSetupSection({ sessionId, tenantId, isVisible = true }: SandboxSetupSectionProps) {
  const [sandboxEvents, setSandboxEvents] = useState<SandboxEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [vncWasAvailable, setVncWasAvailable] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    console.log("[SandboxSetupSection] Setting up listener for sessionId:", sessionId);
    
    // Reset state when session changes
    setSandboxEvents([]);
    setIsComplete(false);
    setIsInitialLoad(true);
    setVncWasAvailable(false);

    const stepsRef = collection(db, "agent_steps");
    const q = tenantId
      ? query(
          stepsRef,
          where("session_id", "==", sessionId),
          where("tenant_id", "==", tenantId)
        )
      : query(stepsRef, where("session_id", "==", sessionId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // On first load, process all documents
        if (isInitialLoad) {
          console.log("[SandboxSetupSection] Initial load with", snapshot.size, "docs");
          const eventMap = new Map<string, SandboxEvent>();
          let hasReady = false;

          snapshot.docs.forEach((doc) => {
            const step = { id: doc.id, ...doc.data() } as AgentStep & { id: string };

            if (step.event_type === "sandbox_initializing") {
              eventMap.set("sandbox_initializing", {
                id: step.id,
                type: "sandbox_initializing",
                status: step.status === "success" ? "completed" : step.status === "error" ? "error" : "running",
                sandboxId: step.sandbox_id,
                timestamp: step.timestamp,
              });
            }

            if (step.event_type === "sandbox_ready") {
              hasReady = true;
              eventMap.set("sandbox_ready", {
                id: step.id,
                type: "sandbox_ready",
                status: "completed",
                sandboxId: step.sandbox_id,
                timestamp: step.timestamp,
              });
            }
          });

          const events = Array.from(eventMap.values());
          events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          setSandboxEvents(events);
          setIsComplete(hasReady);
          setIsInitialLoad(false);
        } else {
          // On subsequent updates, only process changes
          console.log("[SandboxSetupSection] Processing", snapshot.docChanges().length, "changes");
          
          snapshot.docChanges().forEach((change) => {
            const step = { id: change.doc.id, ...change.doc.data() } as AgentStep & { id: string };

            if (change.type === "added" || change.type === "modified") {
              if (step.event_type === "sandbox_initializing") {
                setSandboxEvents((prev) => {
                  const filtered = prev.filter((e) => e.type !== "sandbox_initializing");
                  const newEvent: SandboxEvent = {
                    id: step.id,
                    type: "sandbox_initializing",
                    status: step.status === "success" ? "completed" : step.status === "error" ? "error" : "running",
                    sandboxId: step.sandbox_id,
                    timestamp: step.timestamp,
                  };
                  return [...filtered, newEvent].sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                  );
                });
              }

              if (step.event_type === "sandbox_ready") {
                setIsComplete(true);
                setSandboxEvents((prev) => {
                  const filtered = prev.filter((e) => e.type !== "sandbox_ready");
                  const newEvent: SandboxEvent = {
                    id: step.id,
                    type: "sandbox_ready",
                    status: "completed",
                    sandboxId: step.sandbox_id,
                    timestamp: step.timestamp,
                  };
                  return [...filtered, newEvent].sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                  );
                });
              }
            }

            if (change.type === "removed") {
              setSandboxEvents((prev) => prev.filter((e) => e.id !== step.id));
            }
          });
        }

        console.log("[SandboxSetupSection] Current events count:", sandboxEvents.length);
      },
      (error) => {
        console.error("[SandboxSetupSection] Listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [sessionId, tenantId]);

  // Listen to agent_session to track VNC URL availability
  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, "agent_sessions", sessionId);
    
    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const sessionData = snapshot.data() as AgentSession;
          
          // Track if VNC URL ever becomes available
          if (sessionData.vnc_url && !vncWasAvailable) {
            console.log("[SandboxSetupSection] VNC URL available:", sessionData.vnc_url);
            setVncWasAvailable(true);
          }
        }
      },
      (error) => {
        console.error("[SandboxSetupSection] Agent session listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [sessionId, vncWasAvailable]);

  if (sandboxEvents.length === 0 || !isVisible) {
    return null;
  }

  // Show compact view once sandbox is complete AND VNC was available at least once
  // This handles the case where VNC URL gets set to null on cancellation/completion
  if (isComplete && vncWasAvailable) {
    return (
      <div className="px-6 pb-4 bg-white">
        <div className="border-t border-[var(--border-light)] pt-4">
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 shadow-sm">
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-green-500 flex-shrink-0">
              <Check size={12} className="text-white" />
            </div>
            <span className="text-sm font-medium text-green-700">
              Sandbox Ready - Environment ready for test execution
            </span>
          </div>
        </div>
      </div>
    );
  }

  const getEventIcon = (type: SandboxEvent["type"]) => {
    switch (type) {
      case "sandbox_initializing":
        return <Server size={16} />;
      case "sandbox_ready":
        return <Check size={16} />;
      case "sandbox_configured":
        return <Terminal size={16} />;
      default:
        return <Box size={16} />;
    }
  };

  const getEventTitle = (type: SandboxEvent["type"]) => {
    switch (type) {
      case "sandbox_initializing":
        return "Provisioning Sandbox";
      case "sandbox_ready":
        return "Sandbox Ready";
      case "sandbox_configured":
        return "Sandbox Configured";
      default:
        return "Setup Step";
    }
  };

  return (
    <div className="px-6 pb-4 bg-white">
      <div className="border-t border-[var(--border-light)] pt-4">
        <div className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--fill-white)] shadow-sm p-3">
          <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
            Sandbox Setup
          </h4>
        
        <div className="flex flex-col gap-2">
          {sandboxEvents.map((event, index) => {
            const isLast = index === sandboxEvents.length - 1;
            
            return (
              <div key={event.id} className="flex items-start gap-3">
                {/* Status Indicator */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                      event.status === "completed"
                        ? "bg-green-500 text-white"
                        : event.status === "error"
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {event.status === "completed" ? (
                      <Check size={14} />
                    ) : event.status === "error" ? (
                      <span className="text-xs font-bold">!</span>
                    ) : (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                  </div>
                  
                  {/* Connector Line */}
                  {!isLast && (
                    <div
                      className={`w-0.5 h-6 ${
                        isComplete ? "bg-green-200" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>

                {/* Event Details */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        event.status === "completed"
                          ? "text-[var(--text-primary)]"
                          : event.status === "error"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {getEventTitle(event.type)}
                    </span>
                    {event.status === "running" && (
                      <span className="text-xs text-[var(--text-tertiary)] animate-pulse">
                        In progress...
                      </span>
                    )}
                  </div>
                  
                  {event.sandboxId && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 font-mono">
                      ID: {event.sandboxId.substring(0, 12)}...
                    </p>
                  )}
                </div>

                {/* Icon */}
                <div className="text-[var(--text-tertiary)] mt-0.5">
                  {getEventIcon(event.type)}
                </div>
              </div>
            );
          })}
        </div>

          {/* Completion Badge */}
          {isComplete && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
              <div className="w-4 h-4 flex items-center justify-center rounded-full bg-green-500">
                <Check size={10} className="text-white" />
              </div>
              <span className="text-xs font-medium text-green-700">
                Environment ready for test execution
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

