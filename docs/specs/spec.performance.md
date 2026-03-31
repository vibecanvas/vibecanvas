# Canvas Performance Notes

## Overview

This note reviews the current frontend canvas pen pipeline with a practical performance lens.

Goals:

- identify whether current behavior is accidentally `O(n^2)` or worse
- identify repeated expensive work on small changes
- separate real bottlenecks from acceptable `O(n)` / `O(n log n)` work

Current conclusion:

- local pen preview should stay responsive because preview rendering is local-only during drag
- the main risk is full-document reconcile work after each document change
- current reconcile looks closer to `O(m log m + n * p)` than `O(n^2)`
  - `m` = total element count
  - `n` = pen element count
  - `p` = average point count per pen stroke

This is not a structural emergency yet, but it can still get slow at scale.

## Current Pen Commit Path

1. `PenSystem` collects world-space points during drag.
2. Preview `Konva.Path` updates locally during pointer move.
3. On pointer up, one new pen element is written into the local Automerge doc.
4. Automerge applies that write locally first.
5. `CrdtManager` receives the local `change` event.
6. `reconcileFromDoc()` scans the doc and upserts pen Konva nodes.

Important implication:

- drag-time performance is decoupled from CRDT reconcile
- commit-time performance depends on reconcile cost

## Complexity Analysis

### Drag Preview

Preview updates work on the in-progress stroke only.

Approximate complexity per pointer move:

- `O(p)` where `p` is the current stroke point count

This is expected for freehand drawing.

### Local Automerge Commit

One completed stroke is written once to the local doc.

App-level expectation:

- one local write for one stroke
- not a full document rewrite at the app layer

This does not look like the primary bottleneck.

### Reconcile Pass

`reconcileFromDoc()` currently does:

- collect all elements
- sort by `zIndex`
- filter pen elements
- loop all pen elements
- regenerate path data for each pen element
- update or create Konva nodes

Approximate complexity per change:

- collect values: `O(m)`
- sort by z: `O(m log m)`
- filter pens: `O(m)`
- regenerate all pen paths: `O(n * p)`

So the main reconcile shape is:

- `O(m log m + n * p)`

This is more expensive than necessary for small edits, but it is not obviously `O(n^2)`.

### Color-Only Change

If only pen color changes, current code still:

- re-sorts all elements
- re-filters pen elements
- regenerates path data for all pen strokes
- reapplies attrs for all pen nodes
- reorders nodes with `moveToTop()`

Complexity is still approximately:

- `O(m log m + n * p)`

So color-only updates are more costly than they need to be, but still not an `O(n^2)` pattern by themselves.

## Practical Concerns

### Concern 1: Full reconcile on every change

- complexity: `O(m log m + n * p)` per change
- practical impact: okay at small sizes, degrades as canvas size grows

### Concern 2: Path regeneration for unchanged strokes

- complexity: `O(p)` per stroke, `O(n * p)` across all pen strokes
- practical impact: likely the biggest avoidable cost

### Concern 3: Reordering every node with `moveToTop()`

- complexity: at least `O(n)` calls per reconcile
- practical impact: extra Konva churn, probably secondary to path regeneration

### Concern 4: Sort-all on every change

- complexity: `O(m log m)`
- practical impact: can become noticeable as total element count grows

## What Is Not a Concern Yet

These do not look like first-order problems right now:

- local Automerge write latency for a single committed stroke
- preview architecture during drag
- creating one final `Konva.Path` for one newly committed stroke

The architecture direction is sound. The main scaling risk is reconcile scope.

## Bottleneck Ranking

Most likely bottlenecks, highest first:

1. regenerating stroke geometry for unchanged strokes
   - complexity: `O(n * p)`
2. sorting all elements on every change
   - complexity: `O(m log m)`
3. touching all existing Konva pen nodes on every change
   - complexity: `O(n)`
4. reordering nodes with `moveToTop()` on every change
   - complexity: at least `O(n)` calls

## When To Act

Be practical.

We do not need a redesign just because part of the flow is `O(n)`.

We should act when one of these becomes true:

- a hot path becomes truly `O(n^2)`
- commit latency becomes visible at realistic canvas sizes
- style-only updates feel slow because they rebuild geometry anyway
- measurement shows reconcile dominates interaction cost

Current read:

- no obvious `O(n^2)` emergency
- there is repeated `O(m log m + n * p)` work that may become costly

## Suggested Instrumentation

Before changing architecture further, measure:

1. total time spent inside `reconcileFromDoc()`
2. total element count `m`
3. pen element count `n`
4. average and max stroke point count `p`
5. time spent in stroke path regeneration
6. count of updated vs created vs removed nodes
7. Konva draw time after reconcile

Recommended rule:

- if slow cases track `n * p`, optimize path regeneration first
- if slow cases track `m log m`, optimize global reconcile scope first
- if neither is large, do not optimize yet

## Summary

- no obvious `O(n^2)` bottleneck in the current pen reconcile path
- local pen preview should remain responsive because it does not reconcile on every move
- the main scaling risk is full reconcile work after every document change
- current complexity is best described as `O(m log m + n * p)`
- the highest-value optimization target is avoiding path regeneration for unchanged strokes
