# AI Exploration Tab - New Architecture

## Overview

The AI Exploration tab has been refactored to use **incremental updates** instead of rebuilding the entire UI on every Firestore change. Each component now has its own Firestore listener using `snapshot.docChanges()` to detect only what changed (added, modified, or removed).

## Component Structure

### 1. **SystemEventsListener** (`components/SystemEventsListener.tsx`)
- **Purpose**: Displays the system-level header showing overall plan status
- **Listener**: Listens to `agent_steps` collection filtered by `session_id`
- **Updates on**:
  - System events (sandbox_initializing, sandbox_ready)
  - Session termination (success, failure, cancelled)
  - Plan creation and progress tracking
- **Displays**:
  - Plan title
  - Overall status indicator (running, completed, failed, cancelled)
  - Progress (X/Y steps completed)
  - Action buttons (Cancel when running, Run when terminated)

### 2. **PlanningSection** (`components/PlanningSection.tsx`)
- **Purpose**: Shows the plan with individual steps and collapsable agent details
- **Listener**: Listens to `agent_steps` collection filtered by `session_id`
- **Updates on**:
  - Planning tool calls (create, mark_step)
  - Tool calls (browsing, clicking, typing, etc.)
  - Thinking messages
- **Displays**:
  - Plan header with title and progress bar
  - List of plan steps with status indicators
  - **Collapsable section** containing:
    - Thinking messages
    - Tool call pills (individual agent actions)
- **Key Feature**: Users can expand/collapse the detailed agent steps/thinking to reduce clutter

### 3. **InterventionListener** (`components/InterventionListener.tsx`)
- **Purpose**: Detects and displays human intervention requests
- **Listener**: Listens to `agent_steps` collection filtered by:
  - `session_id`
  - `status == "intervention"`
- **Updates on**: New intervention steps or changes to intervention status
- **Displays**:
  - Intervention message cards
  - Input area (via `InterventionInput`) when intervention is active

### 4. **InterventionInput** (`components/InterventionInput.tsx`)
- **Purpose**: Provides input field for responding to agent interventions
- **No Firestore listener** (just UI component)
- **Displays**: Text input and send button for intervention responses

## How It Works

### Incremental Updates with `docChanges()`

Instead of the old approach:
```typescript
// OLD: Rebuilds entire UI on every change
onSnapshot(query, (snapshot) => {
  const allSteps = snapshot.docs.map(doc => doc.data());
  rebuildEntireUI(allSteps); // 🔴 Expensive!
});
```

We now use:
```typescript
// NEW: Only update what changed
onSnapshot(query, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      // Add new item to state
    }
    if (change.type === "modified") {
      // Update existing item in state
    }
    if (change.type === "removed") {
      // Remove item from state
    }
  });
});
```

### Component Communication

- Each component is **independent** with its own listener
- Components filter for relevant `agent_steps` based on their purpose:
  - **SystemEventsListener**: Tracks system events, termination, and plan metadata
  - **PlanningSection**: Tracks planning tool calls, tool calls, and thinking
  - **InterventionListener**: Tracks intervention status

### Data Flow

```
Firestore agent_steps collection
       |
       ├─→ SystemEventsListener (system events, termination)
       ├─→ PlanningSection (planning, tool calls, thinking)
       └─→ InterventionListener (interventions)
```

## Benefits

1. **Performance**: No full UI rebuilds on every Firestore update
2. **Scalability**: Each component manages its own state independently
3. **Maintainability**: Clear separation of concerns
4. **User Experience**: 
   - Smooth incremental updates
   - Collapsable details reduce visual clutter
   - Only relevant data is re-rendered

## UI Layout

```
┌─────────────────────────────────────────────┐
│  SystemEventsListener (Header)              │
│  ┌─────────────────────────────────────┐   │
│  │ ● Plan Title      [Cancel] 5/10     │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Scrollable Content Area                    │
│  ┌─────────────────────────────────────┐   │
│  │  PlanningSection                     │   │
│  │  ┌───────────────────────────────┐  │   │
│  │  │ ● Plan Title    [v] 5/10      │  │   │
│  │  │ ▓▓▓▓▓░░░░░ 50%                │  │   │
│  │  │ ✓ Step 1                      │  │   │
│  │  │ ⟳ Step 2 (in progress)        │  │   │
│  │  │ ○ Step 3                      │  │   │
│  │  └───────────────────────────────┘  │   │
│  │  ┌───────────────────────────────┐  │   │
│  │  │ Agent Details (6 items) [▼]   │  │   │
│  │  │ ┌─────────────────────────┐   │  │   │
│  │  │ │ Thinking: ...           │   │  │   │
│  │  │ │ ✓ Browsing: url.com     │   │  │   │
│  │  │ │ ⟳ Clicking: button      │   │  │   │
│  │  │ └─────────────────────────┘   │  │   │
│  │  └───────────────────────────────┘  │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  InterventionListener                │   │
│  │  ⚠ Human Intervention Required       │   │
│  │  Please confirm the action...        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  InterventionInput (if active)              │
│  [ Type response... ]              [Send]   │
└─────────────────────────────────────────────┘
```

## Migration Notes

### Old Architecture (Removed)
- ❌ `ChatView` - Used for test case AI exploration (now only for home page)
- ❌ `MessageItem` - Used to display agent messages (now only for home page)
- ❌ Full `useSession` hook usage with `convertStepsToToolCalls` rebuilding

### New Architecture (Active)
- ✅ `SystemEventsListener` - Header with plan status
- ✅ `PlanningSection` - Plan steps with collapsable details
- ✅ `InterventionListener` - Intervention detection and display
- ✅ `InterventionInput` - Input for intervention responses
- ✅ Each component uses `docChanges()` for incremental updates

### Still Used (Unchanged)
- `useTestCaseSession` - Still used but only for VNC and artifacts data
- `FloatingVNC` - VNC viewer (unchanged)
- `SystemEventsHeader` - Old component (still exists but not used in TestCaseDetails anymore)

## Testing

To verify the new implementation works correctly:

1. Start an AI agent run on a test case
2. Navigate to the AI Exploration tab
3. Verify:
   - System header updates in real-time
   - Plan steps update incrementally (not full rebuild)
   - Agent details are collapsable
   - Intervention messages appear when needed
   - Input appears only when intervention is active
   - No console errors about re-renders

