import { readFile } from "node:fs/promises";

type TEdit = {
  oldText: string;
  newText: string;
};

type TEditInput = {
  path?: string;
  edits: TEdit[];
};

function detectLineEnding(content: string): "\n" | "\r\n" {
  const crlfIndex = content.indexOf("\r\n");
  const lfIndex = content.indexOf("\n");

  if (lfIndex === -1) {
    return "\n";
  }

  if (crlfIndex !== -1 && crlfIndex < lfIndex) {
    return "\r\n";
  }

  return "\n";
}

function normalizeToLF(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function restoreLineEndings(text: string, ending: "\n" | "\r\n"): string {
  return ending === "\r\n" ? text.replace(/\n/g, "\r\n") : text;
}

function stripBom(content: string): { bom: string; text: string } {
  return content.startsWith("\uFEFF")
    ? { bom: "\uFEFF", text: content.slice(1) }
    : { bom: "", text: content };
}

function normalizeForFuzzyMatch(text: string): string {
  return text
    .normalize("NFKC")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, " ");
}

function fuzzyFindText(content: string, oldText: string): {
  found: boolean;
  index: number;
  matchLength: number;
  usedFuzzyMatch: boolean;
} {
  const exactIndex = content.indexOf(oldText);
  if (exactIndex !== -1) {
    return {
      found: true,
      index: exactIndex,
      matchLength: oldText.length,
      usedFuzzyMatch: false,
    };
  }

  const fuzzyContent = normalizeForFuzzyMatch(content);
  const fuzzyOldText = normalizeForFuzzyMatch(oldText);
  const fuzzyIndex = fuzzyContent.indexOf(fuzzyOldText);

  if (fuzzyIndex === -1) {
    return {
      found: false,
      index: -1,
      matchLength: 0,
      usedFuzzyMatch: false,
    };
  }

  return {
    found: true,
    index: fuzzyIndex,
    matchLength: fuzzyOldText.length,
    usedFuzzyMatch: true,
  };
}

function countOccurrences(content: string, oldText: string): number {
  const fuzzyContent = normalizeForFuzzyMatch(content);
  const fuzzyOldText = normalizeForFuzzyMatch(oldText);

  if (fuzzyOldText.length === 0) {
    return 0;
  }

  return fuzzyContent.split(fuzzyOldText).length - 1;
}

function getPathLabel(path: string | undefined, absolutePath: string): string {
  return path ?? absolutePath;
}

function applyEditsToNormalizedContent(absolutePath: string, input: TEditInput, normalizedContent: string): string {
  const normalizedEdits = input.edits.map((edit) => ({
    oldText: normalizeToLF(edit.oldText),
    newText: normalizeToLF(edit.newText),
  }));
  const pathLabel = getPathLabel(input.path, absolutePath);

  for (let index = 0; index < normalizedEdits.length; index += 1) {
    if (normalizedEdits[index]!.oldText.length === 0) {
      return `ERROR: edits[${index}].oldText must not be empty in ${pathLabel}.`;
    }
  }

  const initialMatches = normalizedEdits.map((edit) => fuzzyFindText(normalizedContent, edit.oldText));
  const baseContent = initialMatches.some((match) => match.usedFuzzyMatch)
    ? normalizeForFuzzyMatch(normalizedContent)
    : normalizedContent;

  const matchedEdits: Array<{
    editIndex: number;
    matchIndex: number;
    matchLength: number;
    newText: string;
  }> = [];

  for (let index = 0; index < normalizedEdits.length; index += 1) {
    const edit = normalizedEdits[index]!;
    const matchResult = fuzzyFindText(baseContent, edit.oldText);

    if (!matchResult.found) {
      return `ERROR: Could not find edits[${index}] in ${pathLabel}. The oldText must match exactly including all whitespace and newlines.`;
    }

    const occurrences = countOccurrences(baseContent, edit.oldText);
    if (occurrences > 1) {
      return `ERROR: Found ${occurrences} occurrences of edits[${index}] in ${pathLabel}. Each oldText must be unique. Please provide more context to make it unique.`;
    }

    matchedEdits.push({
      editIndex: index,
      matchIndex: matchResult.index,
      matchLength: matchResult.matchLength,
      newText: edit.newText,
    });
  }

  matchedEdits.sort((left, right) => left.matchIndex - right.matchIndex);

  for (let index = 1; index < matchedEdits.length; index += 1) {
    const previous = matchedEdits[index - 1]!;
    const current = matchedEdits[index]!;
    if (previous.matchIndex + previous.matchLength > current.matchIndex) {
      return `ERROR: edits[${previous.editIndex}] and edits[${current.editIndex}] overlap in ${pathLabel}. Merge them into one edit or target disjoint regions.`;
    }
  }

  let nextContent = baseContent;
  for (let index = matchedEdits.length - 1; index >= 0; index -= 1) {
    const edit = matchedEdits[index]!;
    nextContent = nextContent.slice(0, edit.matchIndex) + edit.newText + nextContent.slice(edit.matchIndex + edit.matchLength);
  }

  if (nextContent === baseContent) {
    return `ERROR: No changes made to ${pathLabel}. The replacements produced identical content.`;
  }

  return nextContent;
}

export async function buildEditedContentPreview(
  absolutePath: string,
  input: TEditInput,
  label: string,
): Promise<{ content?: string; error?: string }> {
  let original: string;

  try {
    original = await readFile(absolutePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `${label} could not read file before edit: ${message}` };
  }

  const { bom, text } = stripBom(original);
  const lineEnding = detectLineEnding(text);
  const normalizedContent = normalizeToLF(text);
  const nextNormalizedOrError = applyEditsToNormalizedContent(absolutePath, input, normalizedContent);

  if (nextNormalizedOrError.startsWith("ERROR: ")) {
    return { error: `${label} could not validate edit: ${nextNormalizedOrError.slice("ERROR: ".length)}` };
  }

  return {
    content: bom + restoreLineEndings(nextNormalizedOrError, lineEnding),
  };
}
