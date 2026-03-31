Kobalte LLM Guide
Purpose
- Kobalte is an unstyled, accessible UI toolkit for SolidJS.
- It provides low-level primitives and components for building application UI and design systems.
- It is closer to Radix/React Aria style primitives than to a pre-styled component kit.
Install
- Main package: `npm install @kobalte/core`
- Optional styling helpers:
  - `npm install -D @kobalte/tailwindcss`
  - `npm install -D @kobalte/vanilla-extract`
Import rules
- Prefer per-component subpath imports: `@kobalte/core/popover`, `@kobalte/core/select`, `@kobalte/core/text-field`, etc.
- Importing from `@kobalte/core` exists in older examples but is marked deprecated across the docs.
- Most components can also be imported as individual parts from the same subpath.
Core mental model
- Kobalte components are usually composed from named parts instead of a single opaque widget.
- Typical pattern:
  - root container
  - semantic parts such as label/trigger/input/content
  - optional description and error message
  - optional portal for overlays
- You style every part yourself with `class`.
- Kobalte handles ARIA wiring, keyboard interactions, focus management, hidden native controls, and state attributes.
Universal patterns
1. Controlled vs uncontrolled
- Most stateful components support both controlled and uncontrolled usage.
- Common prop pairs:
  - `open` / `defaultOpen` with `onOpenChange`
  - `value` / `defaultValue` with `onChange`
  - `checked` / `defaultChecked` with `onChange`
- If you need app state to own the value, use the controlled form.
- If you only need an initial value, use the uncontrolled form.
2. Styling model
- Every part accepts `class`.
- State is exposed with `data-*` attributes such as:
  - `data-expanded`
  - `data-disabled`
  - `data-invalid`
  - `data-selected`
  - `data-highlighted`
  - `data-placeholder-shown`
  - `data-checked`
- Prefer styling by combining your classes with these attributes.
3. Validation and help text
- Form controls commonly support:
  - `Label`
  - `Description`
  - `ErrorMessage`
  - `validationState="valid" | "invalid"`
- `ErrorMessage` usually renders only when invalid.
- Many error/help parts also support `forceMount` so they stay mounted for animation libraries.
4. Hidden native form controls
- Many custom-looking controls still use a hidden native input/select for form submission, reset, accessibility, and autofill.
- Important examples:
  - `Select.HiddenSelect`
  - `Combobox.HiddenSelect`
  - `TimeField.HiddenInput`
  - `NumberField.HiddenInput`
  - `FileField.HiddenInput`
  - `Checkbox.Input`
  - `Switch.Input`
  - `RadioGroup.ItemInput`
- If a component is used inside an HTML form, include the hidden control when the docs show one.
5. Polymorphism via `as`
- Many DOM-rendering components accept `as`.
- Use it to change the underlying element or render your own component.
- `as` can be:
  - a tag name like `"a"`
  - a Solid component
  - a callback for full control
- When using an `as` callback:
  - always spread the provided props
  - Kobalte-only options are not forwarded
  - put event handlers on the Kobalte parent component, not inside the callback child
6. Portals and overlays
- Overlay components usually render popup content inside a `Portal`.
- Common overlay structure:
  - trigger
  - optional anchor
  - portal
  - content
  - optional arrow/title/description/close button
7. Animation support
- CSS animation is the simplest path.
- Many components delay unmount so exit CSS animations can complete.
- For JS animation libraries, use `forceMount` when available and control the mount/unmount lifecycle yourself.
- Several overlay components expose transform-origin CSS variables for origin-aware motion.
8. Locale and direction
- Locale-sensitive components should be used with `I18nProvider`.
- Use `useLocale()` near the app root to set `lang` and `dir` on a wrapping element.
- This affects formatting, filtering, keyboard behavior, and right-to-left support.
9. TypeScript and generics
- `Select`, `Combobox`, and similar collection components often need generics when using object options or grouped options.
- If options are objects rather than strings, you usually must describe how to read values/labels/disabled state.
Styling helpers
Tailwind plugin
- `@kobalte/tailwindcss` adds modifiers like `ui-expanded:*`, `ui-disabled:*`, `ui-selected:*`, `ui-invalid:*`.
- Default prefix is `ui`; you can configure a custom prefix.
- Use this when you want to style Kobalte state without writing raw attribute selectors.
Vanilla Extract helper
- `@kobalte/vanilla-extract` exports `componentStateStyles`.
- Use it to generate selectors for Kobalte state attributes in vanilla-extract.
SSR
- Docs only explicitly guarantee straightforward SolidStart usage.
- There is no large SSR-specific API surface in the docs.
- Default assumption: Kobalte is intended to work normally in SolidStart, but avoid making stronger framework claims than the docs do.
Important components
TextField
- Use for standard text input and textarea cases.
- Anatomy:
  - `TextField`
  - `TextField.Label`
  - `TextField.Input` or `TextField.TextArea`
  - `TextField.Description`
  - `TextField.ErrorMessage`
- Use `TextField.TextArea` for multiline input.
- `TextField.TextArea autoResize` grows to fit content.
- Supports `value/defaultValue`, `onChange`, `validationState`, and standard form semantics.
- This is the baseline pattern for many other form controls.
NumberField
- Use for numeric input with optional spin buttons.
- Important distinction:
  - `value` is the displayed string value
  - `rawValue` is the numeric value
- Prefer controlling `rawValue` when you need numeric state.
- Anatomy:
  - `NumberField.Label`
  - `NumberField.Input`
  - `NumberField.HiddenInput`
  - `NumberField.IncrementTrigger`
  - `NumberField.DecrementTrigger`
  - description/error parts
- Supports formatting/localization, keyboard and wheel input, and browser autofill.
TimeField
- Use for accessible segmented time editing rather than a plain text input.
- Values come from `@internationalized/date`, not simple strings.
- Common types/functions include `Time`, `parseZonedDateTime`, `getLocalTimeZone`, and related helpers.
- Anatomy:
  - `TimeField`
  - `TimeField.Label`
  - `TimeField.Field`
  - repeated `TimeField.Segment`
  - `TimeField.Description`
  - `TimeField.ErrorMessage`
  - `TimeField.HiddenInput`
- Segments are rendered with a render prop:
  - `TimeField.Field>{segment => <TimeField.Segment segment={segment()} />}</TimeField.Field>`
- Key props:
  - `value/defaultValue`
  - `onChange`
  - `granularity`
  - locale/time zone behavior depends on the provided date object type
- Use this when you need correct locale-aware time editing, especially with time zones.
Checkbox
- Use for a single boolean choice.
- Anatomy:
  - `Checkbox`
  - `Checkbox.Input` (visually hidden native input)
  - `Checkbox.Control`
  - `Checkbox.Indicator`
  - `Checkbox.Label`
  - optional description/error parts
- State model: `checked/defaultChecked` + `onChange`.
- Supports `name` and `value` for form integration.
- Good reference for how Kobalte custom controls combine a hidden input with visible styling elements.
Switch
- Same general form pattern as Checkbox, but for on/off semantics.
- Anatomy uses `Switch.Input`, `Switch.Control`, and `Switch.Thumb`.
- Use when the UI meaning is "enabled vs disabled" rather than "selected vs not selected".
RadioGroup
- Use when exactly one option from a small set must be selected.
- Group-level parts:
  - `RadioGroup`
  - `RadioGroup.Label`
  - `RadioGroup.Description`
  - `RadioGroup.ErrorMessage`
- Item-level parts:
  - `RadioGroup.Item`
  - `RadioGroup.ItemInput`
  - `RadioGroup.ItemControl`
  - `RadioGroup.ItemIndicator`
  - `RadioGroup.ItemLabel`
  - `RadioGroup.ItemDescription`
- State model: `value/defaultValue` + `onChange`.
- Important doc note: if you insert layout wrappers between `RadioGroup` and `RadioGroup.Item`, mark those wrappers `role="presentation"` to avoid a Chromium screen reader parsing bug.
Select
- Use for choosing from a list triggered by a button.
- Best when users pick from known options and do not type to filter.
- Anatomy:
  - `Select`
  - `Select.Label`
  - `Select.Trigger`
  - `Select.Value`
  - `Select.Icon`
  - optional description/error parts
  - `Select.Portal`
  - `Select.Content`
  - `Select.Arrow`
  - `Select.Listbox`
  - `Select.Item`, `Select.ItemLabel`, `Select.ItemDescription`, `Select.ItemIndicator`
  - `Select.Section` for grouped options
  - `Select.HiddenSelect` for forms
- Basic required root props:
  - `options`
  - `itemComponent`
- Typical trigger/content composition:
  - `Select.Trigger` contains `Select.Value` and `Select.Icon`
  - `Select.Listbox` lives inside `Select.Content` inside `Select.Portal`
- Value model:
  - single-select: `value/defaultValue` is `T`
  - multi-select: `value/defaultValue` is `T[]`
- In `Select.Value`, children are often a render prop to access selected value(s).
- For forms, set `name` on `Select` and render `Select.HiddenSelect`.
Select with object options
- If `options` are objects, define how Kobalte reads them.
- Common props:
  - `optionValue`: submitted value
  - `optionTextValue`: text for keyboard navigation/typeahead
  - `optionDisabled`: disabled flag
- For grouped objects also set:
  - `optionGroupChildren`
  - `sectionComponent`
- Generics are often needed for strong TS support.
Select multiple
- Set `multiple`.
- `Select.Value` render prop exposes selected options plus helper methods like remove/clear.
- The docs use `Select.Trigger as="div"` in multi-select chips/tag UIs because a native `button` should not contain nested interactive elements.
Combobox
- Use for selecting from a list with an editable text input that filters options.
- It is similar to Select, but with an input and filtering behavior.
- Best when users need search/typeahead inside a known local dataset.
- Anatomy:
  - `Combobox`
  - `Combobox.Label`
  - `Combobox.Control`
  - `Combobox.Input`
  - `Combobox.Trigger`
  - `Combobox.Icon`
  - optional description/error parts
  - `Combobox.Portal`
  - `Combobox.Content`
  - `Combobox.Listbox`
  - item and section parts similar to Select
  - `Combobox.HiddenSelect` for forms
- Distinctive behavior:
  - `onInputChange` is separate from `onChange`
  - the input value and the selected option are related but not identical concepts
  - docs show clearing the selected value when the input is cleared
- It supports different opening modes, localized announcements, and multiple selection.
Combobox with object options
- Uses the same object-option pattern as Select, but usually also needs `optionLabel`.
- Common props:
  - `optionValue`
  - `optionTextValue` for filtering/typeahead
  - `optionLabel` for what should appear in the input
  - `optionDisabled`
  - `optionGroupChildren` and `sectionComponent` for groups
Combobox multiple
- Set `multiple`.
- In multi-select mode, `Combobox.Input` is no longer the main display for all selected values.
- Instead, the docs use the `Combobox.Control` render prop to render selected tokens/chips and expose remove/clear helpers.
Search
- Use when suggestion filtering happens outside the component.
- This is effectively the "remote/external filtering" variant of Combobox.
- Features inherited from Combobox except internal result filtering.
- Important root props:
  - `options`
  - `onInputChange`
  - `onChange`
  - `triggerMode`
  - `debounceOptionsMillisecond`
  - `open/defaultOpen` if controlled
- `triggerMode` values:
  - `input`: open while typing
  - `focus`: open on focus
  - `manual`: open via trigger or arrow keys
- Useful parts beyond Combobox-style anatomy:
  - `Search.Indicator`
  - `Search.NoResult`
- For loading states, pass a `loadingComponent` to `Search.Indicator`.
- For command-palette style UIs, docs show setting `open` and rendering the list inline rather than through `Search.Portal`.
Tabs
- Use for switching between a small set of related panels.
- Anatomy:
  - `Tabs`
  - `Tabs.List`
  - `Tabs.Trigger`
  - `Tabs.Indicator`
  - `Tabs.Content`
- State model: `value/defaultValue` + `onChange`.
- Important props:
  - `orientation="horizontal" | "vertical"`
  - `activationMode="automatic" | "manual"`
  - `disabled`
- If content has no focusable children, Kobalte gives the content a `tabIndex` so keyboard users can reach it.
- `Tabs.Content forceMount` is useful for animation libraries.
- `Tabs.Indicator` is purely visual and should be styled/positioned by the app.
Accordion
- Use for stacked expandable sections.
- Anatomy:
  - `Accordion`
  - `Accordion.Item`
  - `Accordion.Header`
  - `Accordion.Trigger`
  - `Accordion.Content`
- Key note: use `Accordion.Header as="h2"` or another appropriate heading level for page semantics.
- Supports controlled/uncontrolled expansion.
- Supports one or many expanded items depending on configuration.
- Good choice for disclosure content that should stay in document flow.
Popover
- Use for non-blocking anchored overlay content.
- Anatomy:
  - `Popover`
  - `Popover.Trigger`
  - optional `Popover.Anchor`
  - `Popover.Portal`
  - `Popover.Content`
  - optional `Popover.Arrow`
  - `Popover.CloseButton`
  - `Popover.Title`
  - `Popover.Description`
- State model: `open/defaultOpen` + `onOpenChange`.
- Use `Popover.Anchor` when content should be positioned against something other than the trigger.
- Positioning props include:
  - `placement`
  - `gutter`
  - `shift`
  - `flip`
  - `slide`
  - `overlap`
  - `sameWidth`
  - `fitViewport`
- Exposes `--kb-popover-content-transform-origin` for origin-aware animations.
Dialog
- Use for modal or non-modal overlay windows.
- Anatomy:
  - `Dialog`
  - `Dialog.Trigger`
  - `Dialog.Portal`
  - `Dialog.Overlay`
  - `Dialog.Content`
  - `Dialog.CloseButton`
  - `Dialog.Title`
  - `Dialog.Description`
- State model: `open/defaultOpen` + `onOpenChange`.
- In modal mode, focus is trapped and background interaction is disabled.
- `preventScroll` and `forceMount` are available.
- `Dialog.Content` exposes hooks like `onOpenAutoFocus`, `onCloseAutoFocus`, `onEscapeKeyDown`, and outside-interaction handlers.
Toast
- Use for temporary, programmatically managed notifications.
- This API is different from the usual "compose a root widget in place" pattern.
- Import both `Toast` and `toaster`.
- Typical usage:
  - render `Toast.Region` and `Toast.List` once near the app root, usually inside a portal
  - call `toaster.show(...)` to create toasts
  - call `toaster.update(...)` or remove helpers as needed
- Toast anatomy:
  - `Toast.Region`
  - `Toast.List`
  - `Toast`
  - `Toast.CloseButton`
  - `Toast.Title`
  - `Toast.Description`
  - `Toast.ProgressTrack`
  - `Toast.ProgressFill`
- Supports:
  - auto close
  - pause on hover/focus/window blur
  - swipe close
  - hotkey jump to region
  - promise-oriented flows
  - multiple regions
- Useful CSS variables include swipe positions and progress width.
I18nProvider
- Import from `@kobalte/core/i18n`.
- Wrap the app with `I18nProvider locale="..."` when app locale should override browser locale.
- Use `useLocale()` to read:
  - `locale()`
  - `direction()`
- Set `lang={locale()}` and `dir={direction()}` on a root element.
- Important for time, color, filtering, and RTL-aware widgets.
Component families that are mostly variations of the above
Overlay relatives
- `AlertDialog`: dialog variant for important confirmations; think Dialog with stricter semantics.
- `Tooltip`: small informational popup, usually brief and non-interactive.
- `HoverCard`: preview popover opened by hover/focus behavior.
- `Collapsible`: disclosure primitive similar to one accordion item.
Menu family
- `DropdownMenu`, `ContextMenu`, `Menubar`, `NavigationMenu` share a menu/listbox-style composition pattern.
- Expect trigger/content/item style parts, portal-backed overlays, keyboard navigation, and state data attributes.
- Use the family member whose trigger semantics match the UX:
  - dropdown button
  - right-click context menu
  - persistent application menubar
  - navigation structure
Selection/button family
- `ToggleButton`: single pressed/not-pressed control.
- `ToggleGroup`: one or many pressed items in a group.
- `SegmentedControl`: grouped mutually exclusive choice UI.
- `RatingGroup`: rating-specific grouped selection.
- These are easier than Select/Combobox and mainly differ in semantics and visual presentation.
Range and display family
- `Slider`: interactive range selection; more substantial than Progress or Meter.
- `Progress`: progress state display.
- `Meter`: scalar measurement display.
- `Pagination`: page navigation helper.
- `Separator`: semantic visual separator.
Basic primitives and display helpers
- `Button`, `Link`, `Badge`, `Alert`, `Image`, `Skeleton`, `Breadcrumbs` are comparatively straightforward.
- They are useful, but they do not define the main Kobalte mental model.
- Mention them once and consult the specific doc only when their dedicated semantics matter.
Color suite
- `ColorField`, `ColorChannelField`, `ColorSlider`, `ColorArea`, `ColorWheel`, `ColorSwatch` belong together.
- Use them when building advanced color picking/editing experiences.
- They are more specialized than the core app-building primitives, so summarize them as a suite unless the task is explicitly about color tooling.
FileField
- Use when you need a styled file input with proper form integration.
- Follow the same hidden-input and description/error-message patterns as other form controls.
How to choose components
- Use `Select` when users choose from a list and do not type to search.
- Use `Combobox` when users type to filter a local option set.
- Use `Search` when the result list is fetched or filtered externally.
- Use `Dialog` for blocking or window-like overlays.
- Use `Popover` for anchored, lighter-weight overlays.
- Use `Tooltip` only for short supplementary text, not interactive mini-dialogs.
- Use `Checkbox` for independent boolean options.
- Use `Switch` for on/off settings.
- Use `RadioGroup` for exactly one choice from a small visible set.
- Use `Accordion` or `Collapsible` for inline expandable content.
Common recurring props and attributes
- State props:
  - `open`, `defaultOpen`, `onOpenChange`
  - `value`, `defaultValue`, `onChange`
  - `checked`, `defaultChecked`, `onChange`
  - `validationState`
  - `disabled`
  - `required`
  - `readOnly`
- Collection props:
  - `options`
  - `itemComponent`
  - `sectionComponent`
  - `multiple`
  - `optionValue`
  - `optionTextValue`
  - `optionLabel`
  - `optionDisabled`
  - `optionGroupChildren`
- Overlay positioning props:
  - `placement`
  - `gutter`
  - `shift`
  - `flip`
  - `slide`
  - `sameWidth`
  - `fitViewport`
  - `forceMount`
- Frequent data attributes:
  - `data-expanded`
  - `data-closed`
  - `data-selected`
  - `data-highlighted`
  - `data-disabled`
  - `data-invalid`
  - `data-checked`
  - `data-placeholder-shown`
Practical guidance for code generation
- Start from the component anatomy and compose only the parts you need.
- Prefer subpath imports.
- Always wire labels, descriptions, and errors when building forms.
- When a docs example includes a hidden input/select, include it.
- Style via `class` and `data-*` attributes rather than assuming built-in styles.
- For object collections, provide the option mapping props explicitly.
- For multi-select UIs, use render props to render selected values/tokens.
- For locale-aware components, add `I18nProvider` early.
- For overlay animation with JS libraries, look for `forceMount`.
What is trivial enough to only mention once
- Basic display primitives like `Badge`, `Separator`, `Skeleton`, `Image`, and `Link`.
- Family members that mostly reuse a known pattern: `AlertDialog`, `HoverCard`, `Collapsible`, `ToggleButton`, `ToggleGroup`, `SegmentedControl`, `RatingGroup`, `Progress`, `Meter`, `Pagination`.
- Specialized color components unless the task is explicitly about color editing.
What deserves detailed explanation in generated answers
- `Select`
- `Combobox`
- `Search`
- `Dialog`
- `Popover`
- `Tabs`
- `TextField`
- `NumberField`
- `TimeField`
- `Checkbox` / `Switch` / `RadioGroup`
- `Accordion`
- `Toast`
- `I18nProvider`