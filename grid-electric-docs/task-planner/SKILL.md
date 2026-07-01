---
name: task-planner
description: Plan and execute long-horizon, multi-turn tasks with persistent todo/checklist tracking. Use when the user mentions planning, asks to plan something out, or when any task appears complex, multi-step, or would benefit from structured progress tracking. Automatically creates and maintains a todo list that persists across conversation turns, marking steps complete as work progresses. Covers coding projects, research tasks, data analysis, and any complex workflows.
---

# Task Planner

This skill provides structured planning and execution for complex, multi-step tasks with persistent progress tracking.

## When to Use This Skill

- User explicitly asks to "plan this out" or mentions planning
- Task involves multiple distinct steps or phases
- Task will likely span multiple conversation turns
- Task is complex enough that progress tracking would be beneficial
- Domain: coding projects, research, data analysis, documentation, refactoring, etc.

## Core Workflow

### Step 1: Assess and Plan

Analyze the request. If complex or multi-step:

1. **Create a todo list** with `SetTodoList` containing:
   - All major steps/phases required
   - Logical ordering of work
   - Clear, actionable step names

2. **Present the plan** to the user:
   - Summary of approach
   - The todo list (shows what's pending/in_progress/done)
   - Ask for confirmation or adjustments before proceeding

### Step 2: Execute and Track

For each step:

1. **Mark step in_progress** before starting work on it
2. **Execute the step** - do the actual work
3. **Mark step done** immediately upon completion
4. **Proceed to next step** automatically

### Step 3: Update Plan as Needed

If scope changes or new steps are discovered:

1. **Update the todo list** with `SetTodoList` - add/remove/reorder steps
2. **Communicate changes** to the user
3. **Continue execution**

## Todo List Best Practices

### Creating Effective Todos

- **Be specific**: "Implement user authentication" not "Do auth stuff"
- **Right granularity**: Steps should be 1-3 turns of work, not too fine-grained
- **Logical order**: Sequence matters - dependencies first
- **Verifiable completion**: Clear when step is done

### Step Status Meanings

| Status | When to Use |
|--------|-------------|
| `pending` | Step not started yet |
| `in_progress` | Currently working on this step |
| `done` | Step completed, output delivered |

### Automatic Completion

Mark steps `done` immediately when:
- Code has been written/modified
- Analysis results are presented
- Research findings are shared
- Deliverable for that step is complete

## Domain-Specific Patterns

### Coding Projects

Typical todo structure:
1. Understand requirements and existing code
2. Design approach/data structures
3. Implement core functionality
4. Add error handling/edge cases
5. Test and verify
6. Refactor/cleanup

### Research Tasks

Typical todo structure:
1. Define research questions
2. Gather sources/information
3. Analyze and synthesize findings
4. Structure and present results

### Data Analysis

Typical todo structure:
1. Load and inspect data
2. Clean/preprocess
3. Exploratory analysis
4. Deep-dive on key findings
5. Visualize and summarize
6. Document methodology

## Example Usage

**User**: "Build me a Python script to scrape news articles"

**Kimi**:
```
I'll help you build a news scraping script. Let me plan this out:

SetTodoList({
  "todos": [
    {"title": "Define requirements and choose scraping approach", "status": "in_progress"},
    {"title": "Implement core scraping functionality", "status": "pending"},
    {"title": "Add error handling and edge cases", "status": "pending"},
    {"title": "Test with example URLs", "status": "pending"}
  ]
})

Plan: I'll create a Python script using requests and BeautifulSoup to scrape news articles. 
The script will extract article titles, content, publication dates, and handle pagination.

Sound good? I'll start with the requirements.
```

**[Work on step 1, then automatically mark done and proceed...]**

```
SetTodoList({
  "todos": [
    {"title": "Define requirements and choose scraping approach", "status": "done"},
    {"title": "Implement core scraping functionality", "status": "in_progress"},
    {"title": "Add error handling and edge cases", "status": "pending"},
    {"title": "Test with example URLs", "status": "pending"}
  ]
})

Now implementing the core scraper...
[code implementation]
```

## Important Notes

- **Always update the todo** when starting or completing steps
- **Show the current todo list** at key milestones so user sees progress
- **Don't wait for confirmation** between steps unless blocked or uncertain
- **Keep the todo list visible** - it reduces hallucination by anchoring to concrete progress
- **Update immediately** if scope changes - better to adjust plan than deviate silently
