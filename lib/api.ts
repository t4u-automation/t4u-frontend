import { ToolCallDetail } from "../types";
import { env } from "./env";

export interface SSEEvent {
  type: string;
  session_id?: string;
  user_id?: string;
  prompt?: string;
  message?: string;
  sandbox_id?: string;
  url?: string;
  step_number?: number;
  tools?: ToolCallDetail[];
  status?: string;
}

export async function startAgent(
  prompt: string,
  userId: string,
  onEvent: (event: SSEEvent) => void,
  testCaseId?: string,
  tenantId?: string
): Promise<void> {
  const url = `${env.apiUrl}/agent/start`;
  const token = localStorage.getItem("firebase_token");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        user_id: userId,
        max_steps: env.maxSteps,
        ...(testCaseId ? { test_case_id: testCaseId } : {}),
        ...(tenantId ? { tenant_id: tenantId } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonData = line.substring(6);
            const data = JSON.parse(jsonData) as SSEEvent;

            onEvent(data);

            if (data.type === "cleanup") {
              return;
            }
          } catch (error) {
            console.error("[API] Parse error:", error);
          }
        }
      }
    }
  } catch (error) {
    console.error("[API] Error:", error);
    throw error;
  }
}

export async function sendIntervention(
  sessionId: string,
  message: string
): Promise<void> {
  const url = `${env.apiUrl}/agent/intervene/${sessionId}`;
  const token = localStorage.getItem("firebase_token");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log("[API] Intervention sent successfully");
  } catch (error) {
    console.error("[API] Intervention error:", error);
    throw error;
  }
}

export async function pauseAgent(sessionId: string): Promise<void> {
  const url = `${env.apiUrl}/agent/pause/${sessionId}`;
  const token = localStorage.getItem("firebase_token");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log("[API] Agent paused successfully");
  } catch (error) {
    console.error("[API] Pause error:", error);
    throw error;
  }
}

export async function resumeAgent(sessionId: string): Promise<void> {
  const url = `${env.apiUrl}/agent/resume/${sessionId}`;
  const token = localStorage.getItem("firebase_token");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log("[API] Agent resumed successfully");
  } catch (error) {
    console.error("[API] Resume error:", error);
    throw error;
  }
}

export async function executeRun(
  runId: string,
  tenantId: string,
  parallel: boolean = true
): Promise<void> {
  const url = `${env.apiUrl}/api/runs/execute`;
  const token = localStorage.getItem("firebase_token");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        run_id: runId,
        tenant_id: tenantId,
        parallel,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log("[API] Run execution started:", result);
  } catch (error) {
    console.error("[API] Execute run error:", error);
    throw error;
  }
}
