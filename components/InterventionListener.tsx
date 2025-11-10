"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgentStep } from "@/types";
import InterventionInput from "./InterventionInput";

interface InterventionListenerProps {
  sessionId: string;
  tenantId?: string;
  isSessionActive: boolean;
  onInterventionSent?: () => void;
}

interface Intervention {
  id: string;
  message: string;
  timestamp: string;
}

export default function InterventionListener({
  sessionId,
  tenantId,
  isSessionActive,
  onInterventionSent,
}: InterventionListenerProps) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [hasActiveIntervention, setHasActiveIntervention] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    console.log("[InterventionListener] Setting up listener for sessionId:", sessionId);
    
    // Reset state when session changes
    setInterventions([]);
    setHasActiveIntervention(false);
    setIsInitialLoad(true);

    const stepsRef = collection(db, "agent_steps");
    const q = tenantId
      ? query(
          stepsRef,
          where("session_id", "==", sessionId),
          where("tenant_id", "==", tenantId),
          where("status", "==", "intervention")
        )
      : query(
          stepsRef,
          where("session_id", "==", sessionId),
          where("status", "==", "intervention")
        );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // On first load, process all documents
        if (isInitialLoad) {
          console.log("[InterventionListener] Initial load with", snapshot.size, "docs");
          const interventionSteps: Intervention[] = [];
          let hasActive = false;

          snapshot.docs.forEach((doc) => {
            const step = doc.data() as AgentStep;
            
            // Extract the message and remove the [HUMAN INTERVENTION] prefix if present
            let message = step.thinking || "The agent is waiting for your input to proceed.";
            message = message.replace(/^\[HUMAN INTERVENTION\]\s*/i, "");
            
            interventionSteps.push({
              id: doc.id,
              message,
              timestamp: step.timestamp,
            });
            
            // If this step status is still "intervention", it's active
            if (step.status === "intervention") {
              hasActive = true;
            }
          });

          // Sort by timestamp
          interventionSteps.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          setInterventions(interventionSteps);
          setHasActiveIntervention(hasActive && isSessionActive);
          setIsInitialLoad(false);
          
          console.log("[InterventionListener] Found", interventionSteps.length, "interventions, active:", hasActive);
        } else {
          // On subsequent updates, only process changes
          console.log("[InterventionListener] Processing", snapshot.docChanges().length, "changes");
          
          snapshot.docChanges().forEach((change) => {
            const step = change.doc.data() as AgentStep;
            
            if (change.type === "added" || change.type === "modified") {
              let message = step.thinking || "The agent is waiting for your input to proceed.";
              message = message.replace(/^\[HUMAN INTERVENTION\]\s*/i, "");
              
              setInterventions((prev) => {
                const filtered = prev.filter((i) => i.id !== change.doc.id);
                const newIntervention: Intervention = {
                  id: change.doc.id,
                  message,
                  timestamp: step.timestamp,
                };
                return [...filtered, newIntervention].sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
              });
              
              if (step.status === "intervention") {
                setHasActiveIntervention(isSessionActive);
              }
            }
            
            if (change.type === "removed") {
              setInterventions((prev) => prev.filter((i) => i.id !== change.doc.id));
            }
          });
        }
      },
      (error) => {
        console.error("[InterventionListener] Listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [sessionId, tenantId, isSessionActive]);

  if (interventions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Intervention Messages */}
      {interventions.map((intervention) => (
        <div
          key={intervention.id}
          className="p-4 rounded-lg border border-blue-300 bg-blue-50"
        >
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500 flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 mb-1">
                Human Intervention Required
              </div>
              <div className="text-sm text-blue-700 whitespace-pre-wrap">
                {intervention.message}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Intervention Input - Show if there's an active intervention */}
      {hasActiveIntervention && (
        <div className="-mx-6 -mb-6">
          <InterventionInput
            sessionId={sessionId}
            onSent={onInterventionSent}
          />
        </div>
      )}
    </div>
  );
}

