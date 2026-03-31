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
D eployments: Shipable increments.

The status are tagged:
- [ ]: open
- [x]: closed
- [?]: unsure
- [!]: urgent
- [~]: in progress
- [/]: blocked

Remember to keep the codebase small. Small is clean, small is fast. Delete often.

## Structure

Based now lives at the repository root in `based/`.

- `based/BASED.md`: overview, active index, and conventions.
- `based/b/`: bug files.
- `based/a/`: addition files.
- `based/s/`: subtraction files.
- `based/e/`: exploration files.
- `based/d/`: deployment files.

Each line in the overview stays short and links to one dedicated file.
Each dedicated file stores the task context, TODOs, notes, and logs.

## Format

Overview entries use this format:

`- [x]: [B1](b/B1.md) - text: edit jumping`

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
- [ ]: [B7](b/B7.md)

## A dditions
- [ ]: [A1](a/A1.md) - Add undo for filetree
- [ ]: [A2](a/A2.md) - Add undo for chat
- [x]: [A3](a/A3.md) - filetree dnd
- [x]: [A4](a/A4.md) - Textfile support
- [x]: [A5](a/A5.md) - Terminal Support
- [x]: [A6](a/A6.md) - Opencode slash and file commands
- [ ]: [A7](a/A7.md) - chat and filetree collapse mode
- [ ]: [A8](a/A8.md) - Missing Opencode commands
- [ ]: [A9](a/A9.md) - git worktree support
- [ ]: [A10](a/A10.md) - draw over elements (e.g. arrow)
- [ ]: [A11](a/A11.md) - chat: copy btn per message
- [ ]: [A12](a/A12.md) - terminal: support image pasting
- [ ]: [A13](a/A13.md) - terminal: support text pasting
- [ ]: [A14](a/A14.md) - filetree: add context menu for create,folder,open in terminal or file, delete, rename, copy path, copy relative path
- [ ]: [A15](a/A15.md) - lsp-client
- [x]: [A16](a/A16.md) - use https://specifications.freedesktop.org/basedir/latest/ like XDG_DATA_HOME
- [ ]: [A16](a/A16.md)
- [ ]: [A17](a/A17.md)
- [ ]: [A18](a/A18.md)

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
- [ ]: [S13](s/S13.md)
- [ ]: [S14](s/S14.md)

## E xplorations
- [x]: [E1](e/E1.md) - Tauri Research
- [x]: [E2](e/E2.md) - Terminal Research
- [x]: [E3](e/E3.md) - File in Canvas Research
- [ ]: [E4](e/E4.md) - canvas: TTerminalData dbl check if workingDir is needed as opencode pty stores cwd i think
- [ ]: [E5](e/E5.md) - how to implement state machine system?
- [ ]: [E6](e/E6.md) - should we include a task management
- [ ]: [E7](e/E7.md) - should we include heartbeat
- [ ]: [E8](e/E8.md)

## D eployments
- [x]: [D1](d/D1.md) - Opencode integration
- [x]: [D2](d/D2.md) - DB refactor -> use opencode sessions
- [x]: [D3](d/D3.md) - Terminal
- [~]: [D4](d/D4.md) - Konva Refactor
- [ ]: [D5](d/D5.md)
- [ ]: [D6](d/D6.md)
- [ ]: [D7](d/D7.md)

## Roadmap
- [ ] self host on server
- [ ] ai can edit canvas
- [ ] canvas render order
- [ ]

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
