"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, AgentSession } from "@/types";

export function useAgentSessions(
  userId: string | undefined,
  tenantId: string | undefined,
  limitCount: number = 20
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !tenantId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    console.log("[useAgentSessions] Starting query - userId:", userId, "tenantId:", tenantId);
    setLoading(true);

    const sessionsRef = collection(db, "agent_sessions");
    const q = query(
      sessionsRef,
      where("user_id", "==", userId),
      where("tenant_id", "==", tenantId),
      orderBy("created_at", "desc"),
      limit(limitCount)
    );

    console.log("[useAgentSessions] Query created, setting up listener...");

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => {
          const data = doc.data() as AgentSession;
          return mapToTask(data);
        });

        setTasks(sessions);
        setLoading(false);
      },
      (error) => {
        console.error("[useAgentSessions] ❌ PERMISSION ERROR - userId:", userId, "tenantId:", tenantId);
        console.error("[useAgentSessions] Full error:", error);
        setTasks([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, tenantId, limitCount]);

  return { tasks, loading };
}

function mapToTask(session: AgentSession): Task {
  const title =
    session.prompt.length > 30
      ? session.prompt.substring(0, 30) + "..."
      : session.prompt;

  const subtitle = session.last_output
    ? session.last_output.length > 30
      ? session.last_output.substring(0, 30) + "..."
      : session.last_output
    : "Processing...";

  const date = formatDate(session.created_at);

  return {
    id: session.session_id,
    title,
    subtitle,
    date,
    icon: "internet",
    type: "internet",
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}
