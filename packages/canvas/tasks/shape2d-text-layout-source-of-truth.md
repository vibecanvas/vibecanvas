# shape2d text layout source of truth

Status: active
Scope: rect attached text first

## decision

Use the attached text node box as the geometry source of truth.

That means:
- before edit: render from persisted text node width, height, font, lineHeight, align, verticalAlign
- during edit: overlay uses the same text node box in screen space
- after commit: attached text keeps the same width and height box; only text content changes

## for rect attached text

The box source is:
- `textNode.width()`
- `textNode.height()`
- `textNode.absolutePosition()`
- `textNode.getAbsoluteScale()`
- `textNode.getAbsoluteRotation()`

## non-goals in this step

Not solved yet:
- exact wrapped-line parity for every browser font edge case
- ellipse safe text region
- diamond safe text region
- custom caret/selection rendering

## implications

Good:
- edit overlay cannot escape rect region width anymore
- commit no longer reflows attached text into a different box
- before and after edit use same persisted geometry

Tradeoff:
- live edit still uses browser textarea internals for text flow
- this is good enough for rect stabilization, not final shape-text system
