# Based framwork

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
D eployments: Shipable increments

The items in the list must be one liners with optional references to a more detailed explanation.
The status are tagged
[ ]: open
[x]: closed
[?]: unsure
[!]: urgent
[~]: in progress
[/]: blocked

[[XY]]: Item number XY, used for reference in the codebase.


No nesting, no subtasks. If a task is large, let it be large. If a task is small, let it be small.
No micro management, no time tracking, no estimation, no planning. Just code and write down what you did.

Remember to keep the codebase small. Small is clean, small is fast. Delete often.


## B ugs [[B6]]
- [x]: [[B1]] text: edit jumping
- [x]: [[B2]] text: long, on select, box too small
- [x]: [[B3]] version update not showing
- [x]: [[B4]] update progress cli not moving
- [ ]: [[B7]] 

## A dditions [[A16]]
- [ ]: [[A1]] Add undo for filetree
- [ ]: [[A2]] Add undo for chat
- [x]: [[A3]] filetree dnd
 - [x]: [[A3.1]] Add drag and drop from filetree -> chat
 - [x]: [[A3.2]] Use ~ in filetree and chat title
 - [x]: [[A3.3]] Don't use full path in chat @file
- [x]: [[A4]] Textfile support
 - [x]: [[A4.1]] create new canvas element file
 - [x]: [[A4.2]] drag from filetree to canvas creates new canvas element
 - [x]: [[A4.3]] supported types: textfiles (md, js, txt, ...)
 - [x]: [[A4.4]] pdf viewer
 - [x]: [[A4.5]] binary viewer
 - [x]: [[A4.6]] image viewer
 - [x]: [[A4.7]] default viewer
- [ ]: [[A15]] lsp-client
- [x]: [[A5]] Terminal Support
- [x]: [[A6]] Opencode slash and file commands
 - [x]: [[A6.1]] use opencode file api
 - [x]: [[A6.2]] support slash commands
 - [x]: [[A6.3]] /agents    
 - [x]: [[A6.5]] /copy
 - [x]: [[A6.6]] /exit
 - [?]: [[A6.7]] /init -> plans/init-command.md
 - [x]: [[A6.8]] /models
 - [x]: [[A6.10]] /rename
 - [x]: [[A6.9]] /new
 - [x]: [[A6.15]] create session.create({ body }) api
- [ ]: [[A7]] chat and filetree collapse mode
- [ ]: [[A8]] Missing Opencode commands
 - [ ]: [[A8.1]] /undo
 - [ ]: [[A8.2]] /compacts
 - [ ]: [[A8.3]] /skills
 - [ ]: [[A8.4]] /timeline
 - [ ]: [[A8.5]] /sessions
- [ ]: [[A9]] git worktree support
- [ ]: [[A10]] draw over elements (e.g. arrow)
- [ ]: [[A11]] chat: copy btn per message
- [ ]: [[A12]] terminal: support image pasting
- [ ]: [[A13]] terminal: support text pasting
- [x]: [[A16]] use https://specifications.freedesktop.org/basedir/latest/ like XDG_DATA_HOME
- [ ]: [[A14]] filetree: add context menu for create,folder,open in terminal or file, delete, rename, copy path, copy relative path
- [ ]: [[A16]] 
- [ ]: [[A17]] 
- [ ]: [[A18]] 

## S ubtractions [[S12]]
- [x]: [[S9]] fix seo image of web
- [ ]: [[S1]] double bun run dev -> find new port
- [x]: [[S3]] ci: introduce release branches, from main to deploy
- [x]: [[S4]] when hand tool (space pressed) must allow to move over chat too
- [x]: [[S2]] rename CLAUDE.md -> AGENTS.md
- [x]: [[S5]] remove agent_logs table and just rely on opencode sessions
- [x]: [[S6]] remove chat.title
- [x]: [[S7]] use http in orpc
- [x]: [[S10]] reverse websocket to orpc
- [~]: [[S12]] refactor: konvajs
  - [x]: [[S12.x]] Find architecture
  - [x]: [[S12.x]] FocusId -> Pan fix
  - [x]: [[S12.x]] Datastruct: angle -> rotation, reduce TGroup
  - [x]: [[S12.x]] Hand: drag stage
  - [ ]: [[S12.x]] Darkmode
  - [x]: [[S12.x]] Render order
  - [x]: [[S12.x]] Tests: setup
  - [x]: [[S12.x]] Multi select drag
  - [x]: [[S12.x]] Multi select: drag clone
  - [x]: [[S12.x]] Camera
    - [x]: [[S12.x]] add test
    - [x]: [[S12.x]] bug: drag when zoom is wrong
  - [x]: [[S12.x]] Rect
    - [x]: [[S12.x]] inline text
    - [x]: [[S12.x]] Bug: when camera zoomed, crdt change recover -> wrong
    - [x]: [[S12.x]] Automerge: sync
    - [x]: [[S12.x]] Select
    - [x]: [[S12.x]] Transform
    - [x]: [[S12.x]] Minimze Recorder UI
      - [x]: [[S12.x]] crdt
    - [x]: [[S12.x]] backspace delete: in select plugin
      - [x]: [[S12.x]] crdt
    - [x]: [[S12.x]] drag copy
    - [x]: [[S12.x]] Groups
       - [x]: [[S12.x]] select
       - [x]: [[S12.x]] delete
       - [x]: [[S12.x]] Ungroup
       - [x]: [[S12.x]] Undo
       - [x]: [[S12.x]] Shortcut
       - [x]: [[S12.x]] Create
       - [x]: [[S12.x]] drag: crdt
       - [x]: [[S12.x]] transform
    - [ ]: [[S12.x]] Flip resize: displaced group box, and rotation handler
    - [x]: [[S12.x]] Drag Clone: group
    - [x]: [[S12.x]] Draw: while draw hit esc, -> listeners not setup
  - [x]: [[S12.x]] Pen
  - [x]: [[S12.x]] Bug: pen width changes triggers undo
  - [x]: [[S12.x]] Basic 2d shapes: diamond
  - [x]: [[S12.x]] Basic 2d shapes: circle
  - [x]: [[S12.x]] Basic 1d shapes: line arrow
  - [x]: [[S12.x]] Basic 1d shapes: arrow
  - [x]: [[S12.x]] Text: Render, edit
  - [x]: [[S12.x]] Image: paste
  - [?]: [[S12.x]] Embed and Iframe is wrongly positioned on load
  - [~]: [[S12.x]] Html: Embed -> terminal, filetree
   - [x]: [[S12.x]] Terminal: perserve state on reload?
   - [x]: [[S12.x]] Terminal: move to canvas package
   - [ ]: [[S12.x]] Terminal: on load issues
   - [x]: [[S12.x]] Terminal: fix image paste in claude and opencode
   - [x]: [[S12.x]] Add filetree
   - [x]: [[S12.x]] Add file support
  - [x]: [[S12.x]] Html: Iframe -> Any page
  - [ ]: [[S12.x]] 
- [ ]: [[S13]] 
- [ ]: [[S14]] 

## E xplorations [[E7]]
- [x]: [[E1]] Tauri Research
- [x]: [[E2]] Terminal Research
- [x]: [[E3]] File in Canvas Research
- [ ]: [[E4]] canvas: TTerminalData dbl check if workingDir is needed as opencode pty stores cwd i think
- [ ]: [[E5]] how to implement state machine system?
- [ ]: [[E6]] should we include a task management
- [ ]: [[E7]] should we include heartbeat
- [ ]: [[E8]] 

## D eployments [[D4]]
- [x]: [[D1]] Opencode integration
- [x]: [[D2]] DB refactor -> use opencode sessions
- [x]: [[D3]] Terminal
- [~]: [[D4]] Konva Refactor
- [ ]: [[D5]] 
- [ ]: [[D6]] 
- [ ]: [[D7]] 

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