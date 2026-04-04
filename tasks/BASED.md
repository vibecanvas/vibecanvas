# Overview

## Introduction

Building software is explorative, creative sometimes dull and repetitive.
This document outline the how build software in a highly technical,
small and motivated team. The goal is to minimize management
and maximize throughput. The idea behind Based is that programming is 90% context loading and 10% actual solving and coding. Therefore we should batch work for context loading and minimize context switching.
Based skips the traditional agile ceremonies and focuses on the codebase and a glorified todo list.
The todo list is the heart of the project. No tickets, no boards, no sprints, no backlog.
Just a list of things to do. The list is grouped into 5 and ordered by importance within each group.
Every dev opens a branch and picks a set of items they want to work on. They open a file based on
their branch and copy the items and explain what they are doing. Once merged the items are removed
from the list the branch file is kept.

Every change in the codebase can be grouped into one of the following categories:

B ugs: Something is not working as expected.
A dditions: New features or improvements.
S ubtractions: Removing or simplifing parts of the codebase.
E xplorations: Researching new technologies or ideas.
D irections: Highlevel ideas for where to go and what to do next.

The status are tagged:
- [ ]: open
- [x]: closed
- [?]: unsure
- [!]: urgent
- [~]: in progress
- [/]: blocked

Remember to keep the codebase small. Small is clean, small is fast. Delete often.

## Structure

Based now lives at the repository root in `tasks/`.

- `tasks/BASED.md`: overview, active index, and conventions.
- `tasks/b/`: bug files.
- `tasks/a/`: addition files.
- `tasks/s/`: subtraction files.
- `tasks/e/`: exploration files.
- `tasks/d/`: direction files.

Each line in the overview stays short and links to one dedicated file.
Each dedicated file stores the task context, TODOs, notes, and logs.

## Format

Overview entries use this format:

`- [x]: [B1](b/B1.md) - text: edit jumping`

Humans usually don't create leaf files. But agents do.

Leaf files use this format:

```md
# B1 - text: edit jumping

## Plan
...

## TODOS
- [ ] ...

## NOTES
...

### LOGS
- what the agent has done

---
```

Use the overview for scanning.
Use the leaf files for execution history and local context.

## B ugs
- [x]: [B1](b/B1.md) - text: edit jumping
- [x]: [B2](b/B2.md) - text: long, on select, box too small
- [x]: [B3](b/B3.md) - version update not showing
- [x]: [B4](b/B4.md) - update progress cli not moving
- [x]: [B7](b/B7.md) - iframe browser: click can latch canvas drag and trap release
- [x]: [B8](b/B8.md) - hosted widgets: transformer resize loses control when pointer crosses DOM
- [x]: [B9](b/B9.md) - hosted/iframe widgets: canvas drag not persisted on reload
- [x]: [B10](b/B10.md) - style menu: drag then style jumps selection back to old position
- [x]: [B11] - terminal after resize is not focuable anymore
- [x]: [B12](b/B12.md) - terminal: ctrl+c echoes ^C but does not interrupt process



## A dditions
- [x]: [A1] - file: support common CodeMirror languages
- [ ]: [A2] - add inline text support to diamond and ellipse
- [ ]: [A3] - copy paste elements/groups
- [x]: [A4](a/A4.md) - terminal: use PartySocket for resilient PTY connection
- [x]: [A5](a/A5.md) - canvas CLI: explicit --db path override
- [x]: [A6](a/A6.md) - canvas CLI: end-to-end test harness
- [x]: [A7](a/A7.md) - canvas CLI: `list` command
- [x]: [A8](a/A8.md) - canvas CLI: `inspect` command (removed; use `query --id`)
- [x]: [A9](a/A9.md) - canvas CLI: `query` command
- [ ]: [A10](a/A10.md) - canvas CLI: `patch` command
- [ ]: [A11](a/A11.md) - canvas CLI: `move` command
- [ ]: [A12](a/A12.md) - canvas CLI: `group` command
- [ ]: [A13](a/A13.md) - canvas CLI: `ungroup` command
- [ ]: [A14](a/A14.md) - canvas CLI: `delete` command
- [ ]: [A15](a/A15.md) - canvas CLI: `reorder` command
- [ ]: [A16](a/A16.md) - canvas CLI: `render` command
- [ ]: [A17] - rect dbl click -> enter edit mode (inline text)
- [ ]: [A18] - lift cmds to be api to allow live changes via crdt

## S ubtractions
- [ ]: [S1](s/S1.md) - double bun run dev -> find new port
- [x]: [S2](s/S2.md) - rename CLAUDE.md -> AGENTS.md
- [x]: [S3](s/S3.md) - ci: introduce release branches, from main to deploy
- [x]: [S4](s/S4.md) - when hand tool (space pressed) must allow to move over chat too
- [x]: [S5](s/S5.md) - remove agent_logs table and just rely on opencode sessions
- [x]: [S6](s/S6.md) - remove chat.title
- [x]: [S7](s/S7.md) - use http in orpc
- [x]: [S9](s/S9.md) - fix seo image of web
- [x]: [S10](s/S10.md) - reverse websocket to orpc
- [x]: [S12](s/S12.md) - refactor: konvajs
- [x]: [S13](s/S13.md) - canvas plugins: folder-per-plugin refactor plan
- [x]: [S14](s/S14.md) - canvas: keep recorder plugin in development only
- [ ]: [S15] - inline text support -> fix position (use pretext lib?)
- [x]: [S16](s/S16.md) - canvas: fix broken TypeScript typings in packages/canvas
- [x]: [S17](s/S17.md) - extract apps/server into apps/cli + shared packages
- [x]: [S18](s/S18.md) - cli server: migrate http file/static/spa serving from apps/server
- [x]: [S19](s/S19.md) - cli orpc: expose db events stream and remove apps/server api.db
- [x]: [S20](s/S20.md) - cli server: restore compiled-mode port fallback when preferred port is busy

## E xplorations
- [ ]: [E1](e/E1.md) - Tauri Research
- [ ]: [E5](e/E5.md) - how to implement state machine system?
- [ ]: [E6](e/E6.md) - should we include a task management
- [ ]: [E7](e/E7.md) - should we include agent
- [x]: [E8](e/E8.md) - canvas CLI: query/edit surface exploration
- [ ]: [E9] - tmux for persistant pty sessions
- [ ]: [E10] - headless chrome to stream to canvas
- [ ]: [E11] - https://github.com/cr0hn/dockerscan
- [ ]: [E12] - https://github.com/superradcompany/microsandbox
- [ ]: [E13](e/E13.md) - Research Pluginsystem for server
- [ ]: [E14] - do we need packages/functional-core

## D irections
- [ ]: [D1] - AI can edit the canvas directly
- [ ]: [D2] - Server plugin system

## Pragmatic Code Style

Long code line for lookup / easy parts.
Short code line for complex parts.
If in doubt, use long code line.

early exit > if else

Comment on complex parts.
You change code, you change comments.

pure fn > fn > static class > class

fn with side effects should have suffix ...Fx

locality of behavior, don't make me jump around

minimize redirections

dry is bad, make longer functions

factor out logic only if repeated 5 times or more
factor out only if really same logic

move types if shared into local types.ts file

types dont contain understanding, only structure, it's boilerplate, move out of sight

2 spaces for indentation
