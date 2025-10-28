"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgentSession } from "@/types";
import { useSession } from "./useSession";

export function useTestCaseSession(
  testCaseId: string | undefined,
  tenantId: string | undefined
) {
  const [latestSession, setLatestSession] = useState<AgentSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  const {
    currentSession,
    vncUrl,
    isVNCActive,
    artifacts,
    totalCost,
    totalTokens,
    loadSession,
    clearSession,
  } = useSession();

  useEffect(() => {
    if (!testCaseId || !tenantId) {
      setLatestSession(null);
      setLoading(false);
      return;
    }

    console.log("[useTestCaseSession] 🔍 Querying sessions for testCaseId:", testCaseId, "tenantId:", tenantId);
    setLoading(true);

    // Listen for the latest agent session for this test case
    const sessionsRef = collection(db, "agent_sessions");
    const q = query(
      sessionsRef,
      where("test_case_id", "==", testCaseId),
      where("tenant_id", "==", tenantId),
      orderBy("created_at", "desc"),
      limit(1)
    );

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log("[useTestCaseSession] ✅ Snapshot received, docs:", snapshot.size);
        if (!snapshot.empty) {
          const sessionData = snapshot.docs[0].data() as AgentSession;
          setLatestSession(sessionData);
          
          // Load the session details with tenantId
          loadSession(sessionData.session_id, tenantId);
        } else {
            console.log("[useTestCaseSession] No sessions found for this test case");
            setLatestSession(null);
            clearSession();
          }
          setLoading(false);
        },
        (error: any) => {
          console.error("[useTestCaseSession] ❌ SNAPSHOT ERROR");
          console.error("[useTestCaseSession] testCaseId:", testCaseId);
          console.error("[useTestCaseSession] tenantId:", tenantId);
          console.error("[useTestCaseSession] Error code:", error?.code);
          console.error("[useTestCaseSession] Error message:", error?.message);
          
          // Gracefully handle - don't crash, just show no session
          setLatestSession(null);
          clearSession();
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("[useTestCaseSession] ❌ Failed to create listener:", error);
      setLatestSession(null);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [testCaseId, tenantId]);

  return {
    latestSession,
    currentSession,
    vncUrl,
    isVNCActive,
    artifacts,
    totalCost,
    totalTokens,
    loading,
  };
}

