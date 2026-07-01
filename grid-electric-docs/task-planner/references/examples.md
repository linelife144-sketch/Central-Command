# Task Planner Examples

## Example 1: Multi-File Refactoring

**User**: "Refactor this codebase to use async/await instead of callbacks"

**Plan & Execution**:

```
SetTodoList({
  "todos": [
    {"title": "Analyze current callback usage across codebase", "status": "in_progress"},
    {"title": "Identify files needing conversion", "status": "pending"},
    {"title": "Refactor core API modules to async/await", "status": "pending"},
    {"title": "Refactor utility functions", "status": "pending"},
    {"title": "Update tests for async patterns", "status": "pending"},
    {"title": "Verify all tests pass", "status": "pending"}
  ]
})
```

## Example 2: Research Task

**User**: "Research the best Python web frameworks for 2024 and recommend one for a startup"

**Plan & Execution**:

```
SetTodoList({
  "todos": [
    {"title": "Identify key Python web frameworks to evaluate", "status": "in_progress"},
    {"title": "Research Django pros/cons for startups", "status": "pending"},
    {"title": "Research FastAPI pros/cons for startups", "status": "pending"},
    {"title": "Research Flask pros/cons for startups", "status": "pending"},
    {"title": "Compare against startup requirements", "status": "pending"},
    {"title": "Provide recommendation with rationale", "status": "pending"}
  ]
})
```

## Example 3: Data Analysis Pipeline

**User**: "Analyze our sales data to find trends and create visualizations"

**Plan & Execution**:

```
SetTodoList({
  "todos": [
    {"title": "Load and validate sales data", "status": "in_progress"},
    {"title": "Clean data (handle missing values, outliers)", "status": "pending"},
    {"title": "Calculate key metrics (revenue, growth, churn)", "status": "pending"},
    {"title": "Identify trends and patterns", "status": "pending"},
    {"title": "Create visualizations", "status": "pending"},
    {"title": "Summarize findings and recommendations", "status": "pending"}
  ]
})
```

## Example 4: Bug Fix with Root Cause Analysis

**User**: "Fix the memory leak in the data processing module"

**Plan & Execution**:

```
SetTodoList({
  "todos": [
    {"title": "Reproduce the memory leak issue", "status": "in_progress"},
    {"title": "Profile memory usage to identify leak source", "status": "pending"},
    {"title": "Analyze root cause in code", "status": "pending"},
    {"title": "Implement fix", "status": "pending"},
    {"title": "Verify fix resolves memory leak", "status": "pending"},
    {"title": "Check for similar issues elsewhere", "status": "pending"}
  ]
})
```

## Example 5: Feature Implementation

**User**: "Add user authentication with JWT to the API"

**Plan & Execution**:

```
SetTodoList({
  "todos": [
    {"title": "Design auth flow and token structure", "status": "in_progress"},
    {"title": "Set up JWT library and configuration", "status": "pending"},
    {"title": "Implement login endpoint", "status": "pending"},
    {"title": "Implement register endpoint", "status": "pending"},
    {"title": "Add authentication middleware", "status": "pending"},
    {"title": "Add protected route examples", "status": "pending"},
    {"title": "Test authentication flow", "status": "pending"}
  ]
})
```

## Handling Plan Changes

When new requirements emerge mid-task:

```
SetTodoList({
  "todos": [
    {"title": "Completed step A", "status": "done"},
    {"title": "Completed step B", "status": "done"},
    {"title": "New requirement: Add OAuth support", "status": "pending"},
    {"title": "Integrate OAuth with existing JWT", "status": "pending"},
    {"title": "Update tests for OAuth", "status": "pending"}
  ]
})

"I've updated the plan to include OAuth support as you requested. 
I'll now work on integrating OAuth with the existing JWT system."
```
