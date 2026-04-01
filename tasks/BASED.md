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

Based now lives at the repository root in `based/`.

- `based/BASED.md`: overview, active index, and conventions.
- `based/b/`: bug files.
- `based/a/`: addition files.
- `based/s/`: subtraction files.
- `based/e/`: exploration files.
- `based/d/`: direction files.

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
- [x]: [B7](b/B7.md) - iframe browser: click can latch canvas drag and trap release
- [x]: [B8](b/B8.md) - hosted widgets: transformer resize loses control when pointer crosses DOM
- [x]: [B9](b/B9.md) - hosted/iframe widgets: canvas drag not persisted on reload
- [x]: [B10](b/B10.md) - style menu: drag then style jumps selection back to old position

## A dditions
- [ ]: [A1](a/A1.md) - file: support common CodeMirror languages
- [ ]: [A2] - add inline text support to diamond and ellipse

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
- [x]: [S15] - inline text support -> fix position (use pretext lib?)
- [ ]: [S16](s/S16.md) - canvas: fix broken TypeScript typings in packages/canvas

## E xplorations
- [ ]: [E1](e/E1.md) - Tauri Research
- [ ]: [E5](e/E5.md) - how to implement state machine system?
- [ ]: [E6](e/E6.md) - should we include a task management
- [ ]: [E7](e/E7.md) - should we include heartbeat
- [ ]: [E8](e/E8.md) - canvas CLI: query/edit surface exploration

## D irections
- [ ]: [D1](d/D1.md) - AI can edit the canvas directly

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
