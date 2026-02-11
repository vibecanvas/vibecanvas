import type { TLatestVersion } from "./types";
import { RELEASES_API, getUpdateChannel } from "../runtime";

function currentChannel(): string {
  return getUpdateChannel();
}

function extractVersionFromTag(tag: string): string {
  return tag.replace(/^v/i, "");
}

async function fetchLatestVersion(): Promise<TLatestVersion | null> {
  const channel = currentChannel();

  if (channel === "stable") {
    const response = await fetch(`${RELEASES_API}/latest`);
    if (!response.ok) return null;
    const data = (await response.json()) as { tag_name?: string };
    if (!data.tag_name) return null;
    return { version: extractVersionFromTag(data.tag_name), channel };
  }

  const response = await fetch(`${RELEASES_API}?per_page=50`);
  if (!response.ok) return null;

  const releases = (await response.json()) as Array<{ tag_name?: string }>;
  const match = releases.find((release) => release.tag_name?.toLowerCase().includes(channel));
  if (!match?.tag_name) return null;

  return { version: extractVersionFromTag(match.tag_name), channel };
}

export default fetchLatestVersion;
export { currentChannel };
