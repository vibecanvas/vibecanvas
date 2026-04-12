# BASED

## shape2d text edit follow-up

Goal:
- shape text edit must look calm
- edit box must stay inside intended shape text region
- before edit, during edit, and after commit must use same layout rules
- rect path first
- ellipse and diamond get explicit design tasks next

Order:
1. remove ugly edit chrome
2. define single text layout source of truth
3. make rect edit box fill rect text region
4. investigate pretext fit
5. add rect parity tests
6. ellipse text region design
7. diamond text region design
8. pixel-perfect rendering acceptance criteria

---

### task: remove ugly edit chrome

why:
- current blue outline looks bad
- shape edit mode should not scream browser default textarea

subtasks:
- find current edit overlay style source
- remove custom blue outline
- suppress browser focus ring safely
- verify no unexpected border, shadow, or resize handle remains
- decide if edit mode uses totally transparent chrome or very subtle background tint

acceptance:
- no blue outline
- no default focus halo
- edit overlay still focusable and usable
- existing text edit tests still pass

artifacts:
- note exact overlay css props kept and removed

---

### task: define single text layout source of truth

why:
- current system mixes textarea metrics, konva text metrics, and helper math
- this causes drift before vs after edit

subtasks:
- inventory current sources for width, height, wrapping, line-height, padding
- mark which code paths compute geometry before edit
- mark which code paths compute geometry during edit
- mark which code paths compute geometry after commit
- choose one source of truth for:
  - wrap width
  - line count
  - block height
  - text padding/inset
  - vertical alignment policy
- write short design note for chosen model

acceptance:
- one documented owner for width/height/wrapping decisions
- no ambiguous fallback chain
- follow-up tasks reference same model

artifacts:
- short design note in tasks or linked note

---

### task: make rect edit box fill rect text region

why:
- rect is simplest shape
- rect path should become correct before touching ellipse or diamond

subtasks:
- define rect text inset/padding rules
- make attached text edit overlay use rect text region width exactly
- stop textarea auto-grow width from escaping rect bounds
- decide if height grows only inside region or can expand rect itself
- make pre-edit render use same width and alignment as edit mode
- make post-commit render use same width and alignment as edit mode
- verify centered text remains centered across mode transitions
- verify multiline text stays stable across mode transitions

acceptance:
- edit overlay stays inside rect text region
- width does not jump on focus
- commit does not reflow into visibly different lines
- cancel returns to same visual state as before edit

artifacts:
- rect text region rule doc
- before/during/after screenshots if needed

---

### task: investigate pretext fit

why:
- pretext might give stable wrap and height math without DOM reflow
- need data before making runtime dependency choice

subtasks:
- read pretext README and relevant APIs completely
- inspect APIs:
  - `prepare`
  - `layout`
  - `prepareWithSegments`
  - `layoutWithLines`
  - `measureLineStats`
  - `walkLineRanges`
  - `layoutNextLineRange`
- make small spike plan for rect attached text only
- compare current textarea/konva behavior vs pretext-driven layout on:
  - single line
  - multiline
  - trailing spaces
  - explicit newlines
  - center aligned text
- judge whether pretext helps with:
  - stable wrapping
  - stable height
  - line materialization for custom render
- judge what pretext does not solve:
  - caret drawing
  - IME behavior
  - arbitrary polygon editing
- decide one of:
  - adopt for runtime layout
  - adopt behind adapter only
  - use for tests/verification only
  - reject

acceptance:
- written recommendation with pros, cons, and decision
- recommendation explicitly scoped to rect first

artifacts:
- short evaluation note
- if useful, example inputs/outputs table

---

### task: rect parity tests

why:
- once rect is fixed, lock it down

subtasks:
- add test for no blue outline in edit mode
- add test for edit overlay width staying inside rect region
- add test for before/during/after line stability on multiline text
- add test for Enter on selected rect opening edit over whole intended rect text region
- add test for commit preserving geometry
- add test for cancel restoring geometry
- add test for clone + attached text still preserving layout metadata
- add test for hydration round-trip keeping `containerId` and text geometry assumptions

acceptance:
- new rect edit behavior covered in `tests/`
- tests target new runtime plugin path

artifacts:
- test list with exact file paths

---

### task: ellipse text region design

why:
- ellipse cannot safely use full bounding box as text region

subtasks:
- define ellipse text region options:
  - simple centered inset rect
  - per-line variable width from ellipse equation
- compare complexity vs value
- decide first shipped behavior
- define expected alignment rules
- define edit mode clipping expectation
- define commit/render expectation

acceptance:
- one chosen design for first implementation
- explicit non-goals listed

artifacts:
- ellipse region sketch and formula notes

---

### task: diamond text region design

why:
- diamond has the harshest mismatch between bbox and readable text area

subtasks:
- define diamond text region options:
  - simple centered inset rect
  - per-line variable width from diamond geometry
- compare complexity vs value
- decide first shipped behavior
- define expected alignment rules
- define edit mode clipping expectation
- define commit/render expectation

acceptance:
- one chosen design for first implementation
- explicit non-goals listed

artifacts:
- diamond region sketch and formula notes

---

### task: pixel-perfect rendering acceptance criteria

why:
- tribe needs hard definition, not vibes

subtasks:
- define what counts as pixel-perfect for rect path
- define allowed tolerance if exact parity impossible
- choose fonts to verify
- choose zoom levels to verify
- choose content cases to verify:
  - empty
  - one line
  - multiline
  - newline-heavy
  - leading/trailing spaces
  - center-aligned label text
- define screenshot or metric-based verification method
- define what is out of scope for first pass

acceptance:
- written checklist that implementation can be judged against
- clear split between must-have and later niceties

artifacts:
- acceptance checklist

---

## now / next / later

### now
- remove ugly edit chrome
- define single text layout source of truth
- make rect edit box fill rect text region
- investigate pretext fit
- add rect parity tests

### next
- ellipse text region design
- diamond text region design

### later
- implement chosen ellipse path
- implement chosen diamond path
- revisit custom editor path only if textarea path still cannot meet acceptance criteria
