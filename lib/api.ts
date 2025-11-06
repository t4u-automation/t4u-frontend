import { ToolCallDetail } from "../types";
import { env } from "./env";
import { auth } from "./firebase";

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

// ============================================
// Token Interceptor
// ============================================

/**
 * Get a fresh Firebase token, refreshing if necessary
 */
async function getFreshToken(): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("[API] No authenticated user found");
      return null;
    }

    // Force refresh the token to ensure it's fresh
    const token = await currentUser.getIdToken(true);
    localStorage.setItem("firebase_token", token);
    console.log("[API] Token refreshed successfully");
    return token;
  } catch (error) {
    console.error("[API] Error refreshing token:", error);
    return null;
  }
}

/**
 * Check if token is expired and refresh if needed
 */
async function getValidToken(): Promise<string | null> {
  try {
    const storedToken = localStorage.getItem("firebase_token");
    
    if (!storedToken) {
      return await getFreshToken();
    }

    // Decode token to check expiration (JWT format: header.payload.signature)
    const parts = storedToken.split('.');
    if (parts.length !== 3) {
      console.warn("[API] Invalid token format, refreshing...");
      return await getFreshToken();
    }

    try {
      // Decode payload
      const payload = JSON.parse(atob(parts[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minute buffer

      // If token expires within 5 minutes, refresh it
      if (currentTime + bufferTime > expirationTime) {
        console.log("[API] Token expiring soon, refreshing...");
        return await getFreshToken();
      }

      return storedToken;
    } catch (decodeError) {
      console.warn("[API] Could not decode token, refreshing...");
      return await getFreshToken();
    }
  } catch (error) {
    console.error("[API] Error validating token:", error);
    return null;
  }
}

/**
 * Make an API request with automatic token refresh on 401
 */
async function apiCall(
  url: string,
  options: RequestInit & { retryCount?: number } = {}
): Promise<Response> {
  const { retryCount = 0, ...fetchOptions } = options;
  const maxRetries = 2;

  try {
    // Get valid token before making request
    const token = await getValidToken();
    
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    // If 401 (Unauthorized), try to refresh token and retry
    if (response.status === 401 && retryCount < maxRetries) {
      console.log("[API] Received 401, attempting to refresh token and retry...");
      const newToken = await getFreshToken();
      
      if (newToken) {
        // Retry the request with new token
        return apiCall(url, { ...options, retryCount: retryCount + 1 });
      }
    }

    return response;
  } catch (error) {
    console.error("[API] Request error:", error);
    throw error;
  }
}

// ============================================
// API Functions
// ============================================

export async function startAgent(
  prompt: string,
  userId: string,
  onEvent: (event: SSEEvent) => void,
  testCaseId?: string,
  tenantId?: string
): Promise<void> {
  const url = `${env.apiUrl}/agent/start`;

  try {
    const response = await apiCall(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

  try {
    const response = await apiCall(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

  try {
    const response = await apiCall(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

  try {
    const response = await apiCall(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

export async function cancelAgent(sessionId: string): Promise<void> {
  const url = `${env.apiUrl}/agent/cancel/${sessionId}`;

  try {
    const response = await apiCall(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log("[API] Agent cancelled successfully");
  } catch (error) {
    console.error("[API] Cancel error:", error);
    throw error;
  }
}

export async function executeRun(
  runId: string,
  tenantId: string,
  parallel: boolean = true
): Promise<void> {
  const url = `${env.apiUrl}/api/runs/execute`;

  try {
    const response = await apiCall(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
