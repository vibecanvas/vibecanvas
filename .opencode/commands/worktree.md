---
description: Solve the users request in the requested worktree.
---

## Context

- Current branch: !`git worktree list`

## Setup

Create a new workspace in ../worktrees/vibecanvas/$1
Based from the current branch. If there are uncommited changes don't do anything
and report to the user.
After clone you must change to directory and run bun run install in project root (all packages will be installed)

## Task
$ARGUMENTS
