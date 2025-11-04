export interface Task {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  icon: string;
  type: string;
}

export interface Artifact {
  created_at: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  step_number: number;
  storage_path: string;
  storage_url: string;
}

export interface AgentSession {
  agent_name: string;
  completed_at?: string;
  created_at: string;
  last_output?: string;
  last_step?: number;
  prompt: string;
  sandbox_id: string;
  session_id: string;
  status: "completed" | "error" | "active";
  updated_at: string;
  user_id: string;
  tenant_id: string; // Multi-tenant isolation
  vnc_url?: string | null;
  artifacts?: Artifact[];
  total_cost?: number;
  total_tokens?: number;
  test_case_id?: string; // Link to test case
}

export interface AgentStep {
  session_id?: string;
  sandbox_id?: string;
  step_number: number;
  timestamp: string;
  agent_name: string;
  event_type: string;
  thinking?: string;
  tool_calls?: ToolCallDetail[];
  tool_results?: ToolResult[];
  screenshots?: string[];
  screenshot_urls?: string[];
  status: string;
  user_id?: string;
  tenant_id?: string; // Multi-tenant isolation
  error?: unknown;
}

export interface ToolResult {
  tool_name: string;
  success: boolean;
  output: string;
}

export interface ToolCallDetail {
  tool_name: string;
  arguments: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinking?: string;
  toolCalls?: ToolCall[];
  status?: "pending" | "completed" | "error";
}

export interface ToolCall {
  toolName: string;
  action: string;
  details?: string;
  status: "pending" | "running" | "completed";
  agentName?: string; // Track which agent this tool call belongs to
  planData?: PlanData; // Add plan data for planning tool
  terminateData?: TerminateData; // Add terminate data for terminate tool
  interventionData?: InterventionData; // Add intervention data for human intervention
}

export interface PlanData {
  planId: string;
  title: string;
  steps: PlanStep[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export interface TerminateData {
  status: "success" | "failure";
  output: string;
}

export interface InterventionData {
  message: string;
  timestamp: string;
}

export interface PlanStep {
  index: number;
  title: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "completed" | "error";
}

// ============================================
// T4U Architecture Types
// ============================================

export interface Tenant {
  id: string;
  name: string; // Company name
  created_at: string;
  updated_at: string;
  owner_id: string; // User who created the tenant
  is_active: boolean; // Soft delete flag
  needs_setup?: boolean; // True if tenant name needs to be updated after creation
}

export interface T4UUser {
  id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  tenant_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string; // User ID
  stats?: {
    features: number;
    stories: number;
    test_cases: number;
  };
}

export interface Feature {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string; // User ID
}

export interface Story {
  id: string;
  tenant_id: string;
  feature_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string; // User ID
}

export interface TestCase {
  id: string;
  tenant_id: string;
  project_id: string; // For easier lookups
  story_id: string;
  name: string;
  description?: string;
  scenario: string | TestCaseStep[]; // Can be text or list of steps
  status_id: string; // Reference to TestCaseStatus
  created_at: string;
  updated_at: string;
  created_by: string; // User ID
  proven_steps?: ProvenStep[];
  proven_steps_count?: number;
}

export interface TestCaseStep {
  index: number;
  tenant_id: string;
  description: string;
  expected_result?: string;
}

export interface ProvenStep {
  step_number: number;
  tool_name: string;
  arguments: {
    action: string;
    url?: string;
    by_placeholder?: string;
    by_role?: string;
    by_label?: string;
    by_text?: string;
    index?: number;
    text?: string;
    seconds?: number;
    expected_text?: string;
    search_text?: string;
    assertion_description?: string;
    script?: string;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
}

export interface TestCaseStatus {
  id: string;
  tenant_id: string;
  name: string;
  color?: string; // For UI display
  is_default: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface TestCaseComment {
  id: string;
  test_case_id: string;
  tenant_id: string;
  user_id: string;
  user_email: string;
  user_display_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string; // Same as userId
  tenant_id: string;
  favorite_projects: string[];
  created_at: string;
  updated_at: string;
}

export interface TestPlan {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  description?: string;
  test_case_ids: string[];
  test_cases_count: number;
  created_at: string;
  updated_at: string;
  created_by: string; // User ID
}

export interface RunTestCaseResult {
  test_case_id: string;
  status: "pending" | "running" | "passed" | "failed";
  vnc_url?: string;
  started_at?: string;
  completed_at?: string;
  current_step: number;
  total_steps: number;
  error?: string;
}

export interface Run {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  test_case_ids: string[];
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  created_by: string;
  started_at?: string;
  completed_at?: string;
  current_test_case_index: number;
  results: {
    [testCaseId: string]: RunTestCaseResult;
  };
}

export interface Invitation {
  id: string;
  email: string;
  tenant_id: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "expired" | "cancelled";
  invited_by: string;
  created_at: string;
  expires_at?: string;
  accepted_at?: string;
  accepted_by_user_id?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  last_email_attempt_at?: string;
  last_email_sent_at?: string;
  last_email_error?: string;
  send_count?: number;
  resend_parent_id?: string;
  resend_requested_at?: string;
}
