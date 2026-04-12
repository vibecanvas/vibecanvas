# shape2d pretext evaluation

Status: investigated
Scope: rect attached text first

## summary

`@chenglou/pretext` looks useful for stable multiline measurement and wrapping.
It does not solve native edit caret or arbitrary shape editing by itself.

## useful APIs

- `prepare(text, font, { whiteSpace: "pre-wrap" })`
- `layout(prepared, width, lineHeight)`
- `prepareWithSegments(...)`
- `layoutWithLines(...)`
- `measureLineStats(...)`
- `walkLineRanges(...)`
- `layoutNextLineRange(...)`

## what it can help with

- stable wrap width decisions
- stable text block height decisions
- line materialization for custom rendering
- avoiding DOM layout reads as the truth source
- future ellipse/diamond line-by-line layout experiments

## what it does not solve

- native textarea caret drawing
- IME behavior
- selection painting
- editing inside arbitrary polygon by itself
- pixel-perfect DOM textarea parity on its own

## recommendation

Do not adopt now as mandatory runtime dependency for the rect stabilization step.

Do this instead:
- stabilize rect attached text first with fixed persisted geometry
- keep pretext as next spike for line-wrap parity
- revisit runtime adoption after rect parity tests show whether browser textarea drift is still a problem

## decision

Current decision: defer runtime adoption.

Reason:
- rect attached text can be improved now without dependency churn
- pretext is promising, but better as a focused spike after rect baseline is stable
