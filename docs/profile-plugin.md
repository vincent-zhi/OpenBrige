# Profile Plugin Guide

Agent Profiles are zero-code YAML files that describe how an AI coding agent should be launched, monitored, and interacted with. They are the primary way to add agent support to OpenBrige.

## YAML Format

A profile defines the agent's command, startup behavior, output patterns, and quick actions.

### Full Example

```yaml
id: claude-code
name: Claude Code
command: claude
args: []
cwd: "."
icon: claude

startup:
  wait_for_patterns:
    - ">"
    - "What would you like"

ui:
  color: purple

patterns:
  waiting_input:
    - "Do you want to"
    - "Continue?"
    - "(y/n)"
  test_failed:
    - "test failed"
    - "Tests failed"
  task_done:
    - "Done"
    - "Task complete"

quick_actions:
  summarize:
    label: Summarize progress
    text: "Summarize current progress, changed files, test status, and next step."
  run_tests:
    label: Run tests
    text: "Run the relevant tests and explain any failures."
  stop_editing:
    label: Stop editing
    text: "Stop modifying files. Only summarize from now on."
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the profile |
| `name` | string | Yes | Display name |
| `command` | string | Yes | Shell command to launch the agent |
| `args` | string[] | No | Default arguments passed to the command |
| `cwd` | string | No | Working directory (default: `"."`) |
| `icon` | string | No | Icon identifier for the UI |
| `startup` | object | No | Startup configuration |
| `ui` | object | No | UI customization |
| `patterns` | object | No | Output pattern matching rules |
| `quick_actions` | object | No | Action Pad button definitions |

## Pattern Definitions

Patterns tell OpenBrige how to detect agent states from terminal output. Each pattern maps a `SessionStatus` to one or more regex-like strings.

```yaml
patterns:
  waiting_input:
    - "Do you want to"
    - "Continue\\?"
    - "\\(y/n\\)"
    - "Press Enter to"
  test_failed:
    - "test failed"
    - "FAIL"
    - "Tests failed: \\d+"
  test_passed:
    - "All tests passed"
    - "PASS"
  task_done:
    - "Done"
    - "Task complete"
    - "Finished"
  error_detected:
    - "Error:"
    - "FATAL"
    - "panic:"
  build_failed:
    - "Build failed"
    - "Compilation error"
```

### Pattern Matching Behavior

- Patterns are matched against the most recent terminal output chunk
- Matching is case-insensitive by default
- Patterns support basic regex syntax
- First matching pattern wins for status classification
- Patterns compound: multiple sources (PTY, file watcher, git) contribute to the final status

### Available Status Keys

| Key | Meaning |
|-----|---------|
| `waiting_input` | Agent is waiting for user confirmation or input |
| `test_failed` | Tests have failed |
| `test_passed` | All tests passed |
| `task_done` | Agent has completed its task |
| `error_detected` | An error occurred |
| `build_failed` | Build or compilation failed |
| `thinking` | Agent is reasoning or planning |
| `running_command` | Agent is executing a shell command |
| `file_edited` | Agent has modified a file |
| `question_detected` | Agent is asking a question |

## Quick Actions

Quick Actions appear as buttons in the Action Pad. They let users send common commands without typing.

```yaml
quick_actions:
  summarize:
    label: Summarize progress
    text: "Summarize current progress, changed files, test status, and next step."
    icon: clipboard-list

  run_tests:
    label: Run tests
    text: "Run the relevant tests and explain any failures."
    icon: play

  explain_failure:
    label: Explain failure
    text: "Explain the failing tests and propose a fix. Do not edit files yet."
    icon: help-circle

  stop_editing:
    label: Stop editing
    text: "Stop modifying files. Only summarize from now on."
    icon: stop-circle

  commit_changes:
    label: Generate commit
    text: "Generate a commit message for the current changes."
    icon: git-commit
```

### Action Fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Button label displayed in the UI |
| `text` | string | Text sent to the agent's stdin |
| `icon` | string | Optional icon identifier |

### Context-Aware Actions

Actions can be conditionally shown based on session state:

```yaml
quick_actions:
  retry_tests:
    label: Retry tests
    text: "Run the failing tests again."
    when: "status == 'test_failed'"

  merge_sandbox:
    label: Merge to main
    text: ""
    type: bridge_command
    command: worktree_merge
    when: "status == 'task_done' && workspace_mode == 'worktree'"
```

## Custom Profiles

### Creating a Custom Profile

1. Create a YAML file in your project or home directory:

   ```bash
   # Project-level (shared with team)
   .openbrige/plugins/profiles/my-agent.yml

   # User-level
   ~/.openbrige/plugins/profiles/my-agent.yml
   ```

2. Define the profile:

   ```yaml
   id: my-agent
   name: My Custom Agent
   command: my-agent-cli
   args: ["--interactive"]
   cwd: "."

   patterns:
     waiting_input:
       - "\\? $"
       - "Enter your response"
     task_done:
       - "Session complete"

   quick_actions:
     continue:
       label: Continue
       text: "Continue with the next step."
     explain:
       label: Explain
       text: "Explain what you just did and why."
   ```

3. Restart OpenBrige or run `openbrige profile list` to verify it's loaded.

### Profile Discovery Order

Profiles are loaded from (in order of precedence):

1. Project-level: `.openbrige/plugins/profiles/`
2. User-level: `~/.openbrige/plugins/profiles/`
3. Built-in: shipped with OpenBrige

Later definitions override earlier ones with the same `id`.

### Minimal Profile

For a simple CLI agent, a minimal profile is enough:

```yaml
id: my-tool
name: My Tool
command: my-tool
```

OpenBrige will use default patterns and no quick actions.
