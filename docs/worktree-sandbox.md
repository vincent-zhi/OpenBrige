# Worktree Sandbox

Worktree Sandbox isolates agent changes in a git worktree, keeping your main working directory clean. It's a key safety feature of OpenBrige — you can let agents run freely without worrying about polluting your workspace.

## How It Works

When you start a session with `--sandbox`, OpenBrige:

1. Creates a git worktree under `.openbrige/worktrees/<session_id>/`
2. Checks out a new branch for the session
3. Runs the agent in the worktree directory
4. All file changes happen in the worktree, not your main workspace

```text
project/
  src/                    ← Your main workspace (untouched)
  .openbrige/
    worktrees/
      ses_abc123/         ← Agent's isolated workspace
        src/
        tests/
        ...
```

### Benefits

- **Main workspace stays clean** — Agent changes never touch your working directory
- **Multiple agents in parallel** — Each session gets its own worktree
- **Safe to discard** — If the agent makes a mess, just delete the worktree
- **Easy to merge** — If the changes are good, merge the branch
- **Clean diffs** — Every change is relative to the branch point
- **Mobile-safe** — You can safely kill a session from your phone without corrupting your workspace

## Usage

### Starting a Sandboxed Session

```bash
# Via CLI
openbrige start claude-code --sandbox

# Via web UI
# Select "Worktree Sandbox" when creating a new session
```

### Listing Active Sandboxes

```bash
openbrige session list
```

Each session shows its workspace mode (`current` or `worktree`).

### Merging Changes

When the agent completes its task and you're happy with the changes:

```bash
# Via CLI
openbrige session merge <session_id>

# Via web UI
# Click "Merge to main" in the session detail view
```

This merges the worktree branch into your current branch.

### Discarding Changes

If the agent's changes aren't useful:

```bash
# Via CLI
openbrige session discard <session_id>

# Via web UI
# Click "Delete sandbox" in the session detail view
```

This removes the worktree and deletes the branch.

### Exporting a Patch

Before merging or discarding, you can export the changes as a patch file:

```bash
# Via CLI
openbrige session export-patch <session_id>

# Via web UI
# Click "Export patch" in the session detail view
```

## Diff and Merge

### Viewing Diffs

The Diff Studio shows all changes in the worktree compared to the branch point:

```text
Change Summary
──────────────
Modified 5 files, +312 / -87
New: 3 test files
Untouched: .env, infra, payment

File Groups
──────────────
Business Logic    src/auth.ts, src/session.ts
Tests             tests/auth.test.ts, tests/session.test.ts
Config            tsconfig.json
```

Each file shows:
- Change reason summary (from agent context)
- Key hunks with syntax highlighting
- Option to expand full diff

### Merge Strategies

When merging a worktree sandbox:

1. **Fast-forward** — If the main branch hasn't changed, a simple fast-forward merge
2. **Merge commit** — If the main branch has diverged, a merge commit preserves history
3. **Cherry-pick** — Select specific commits to apply
4. **Squash** — Combine all worktree commits into a single commit

The web UI presents these options and lets you choose.

### Conflict Resolution

If merging produces conflicts:

1. OpenBrige detects conflicts and shows them in the UI
2. You can resolve conflicts manually or ask the agent to help
3. The Action Pad offers "Resolve conflicts" as a contextual action

## Worktree Cleanup

OpenBrige automatically cleans up worktrees when:

- A session is explicitly discarded
- A session is merged successfully
- A session has been abandoned for more than 7 days (configurable)

Manual cleanup:

```bash
# Remove all abandoned worktrees
openbrige worktree prune

# Remove a specific worktree
openbrige worktree remove <session_id>
```
