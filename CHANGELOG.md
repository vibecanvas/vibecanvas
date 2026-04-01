# Changelog

All notable changes to this project will be documented in this file.

## Upcoming (0.2.1)

### Fixed
- Persisted native canvas drag position updates for hosted widgets and iframe browser widgets so reload restores the latest location.
- Fixed selection style menu updates so dragging a stylable element or group and then changing color/width/font/curve no longer snaps it back to its pre-drag position.
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
