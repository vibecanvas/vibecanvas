# Changelog

All notable changes to this project will be documented in this file.

## 0.3.0-beta.2

### Added
- Added PTY image upload API support for writing pasted clipboard images to remote temp storage and returning the absolute server path.
- Added shared `@vibecanvas/orpc-client` package so frontend and canvas use the same ORPC websocket client and safe API types.

### Changed
- Replaced canvas-side handwritten ORPC safe client mirror types with the shared `@vibecanvas/orpc-client` types.
- Renamed hosted widget transport wiring from `safeClient` to `apiService` across canvas/frontend integration for clearer ownership.

## 0.3.0-beta.1

### Added
- Added a full canvas CLI workflow for creating, listing, querying, adding, patching, moving, reordering, grouping, ungrouping, and deleting canvas elements.
- Introduced plugin system for apps/cli

### Changed
- Replaces apps/server with apps/cli
- Moved filetree ownership fully into the canvas document and removed the separate filetrees table/schema from the database.

## 0.2.2

### Fixed
- Fixed hosted terminal and other hosted widgets getting stuck non-interactive after resize, so focus returns normally once the transform completes.
- Made PTY terminal websocket connections more resilient by switching the canvas terminal transport to PartySocket reconnecting websockets.
- Fixed hosted terminal Ctrl+C handling by replacing the broken Bun PTY backend with `bun-pty`, so terminal interrupts now reach the foreground process instead of echoing `^C` as literal input.

## 0.2.1

### Fixed
- Persisted native canvas drag position updates for hosted widgets and iframe browser widgets so reload restores the latest location.
- Fixed selection style menu updates so dragging a stylable element or group and then changing color/width/font/curve no longer snaps it back to its pre-drag position.
- Fixed broken TypeScript typings
- Fixed filetree-to-terminal drops so dropping a file or folder onto a hosted terminal inserts the shell-escaped path, focuses the terminal, and keeps blank-canvas drops creating hosted widgets.
### Refactor
- Restructured plugins into subfolders

## 0.2.0

### Removed
- Chat widget
- OpenCode dependency

### Added
- New canvas architecture with Konva and plugins.
- Hosted widgets on the canvas, including terminal, file tree, file widgets, and iframe support.

## 0.1.8
- Added canvas file support.
- Expanded file-oriented workflows inside the canvas experience.

## 0.1.7
- Improved terminal startup reliability.
- Adjusted startup ordering so OpenCode initializes before the HTTP server.
- Added clearer startup logging.

## 0.1.6
- Introduced terminal functionality as a first-class feature.

## 0.1.5
- Refactored HTTP communication around ORPC-related flows.
- Simplified client/server API interaction.

## 0.1.4
- Refactored session handling to use OpenCode sessions more consistently.

## 0.1.3
- Added OpenCode slash commands and file commands.
- Improved agent/file interaction workflows.

## 0.1.2
- Performance improvements and optimizations.

## 0.1.1
- Text editing and text behavior bug fixes.

## 0.1.0
- Added ProseMirror-based editor support.
- Improved rich text and structured editing workflows.

## 0.0.10
- Added file tree support.

## 0.0.9
- Improved build constant/type reference handling for server-side TypeScript.

## 0.0.8
- Fixed compiled version root path handling.

## 0.0.7
- Release housekeeping and version update.

## 0.0.6
- Added onboarding-related improvements for the 0.1.0 development cycle.

## 0.0.5
- Fixed multiplayer-related issues.

## 0.0.4
- Improved install/build distribution flow and CI setup.

## 0.0.3
- Packaging and release adjustments.

## 0.0.2
- Initial public project setup.
