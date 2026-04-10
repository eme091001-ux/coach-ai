/**
 * VTT (WebVTT) parser
 * Removes timestamps and cue IDs, preserves speaker labels
 */
export function parseVtt(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip WEBVTT header and NOTE blocks
    if (trimmed.startsWith("WEBVTT") || trimmed.startsWith("NOTE")) continue;

    // Skip timestamp lines: 00:00:00.000 --> 00:00:05.000
    if (/^\d{1,2}:\d{2}[:.]\d{2,3}\s*-->\s*\d{1,2}:\d{2}[:.]\d{2,3}/.test(trimmed)) continue;

    // Skip pure numeric cue IDs
    if (/^\d+$/.test(trimmed)) continue;

    // Skip empty lines
    if (!trimmed) continue;

    // Convert <v Speaker Name> tags to "Speaker Name: " prefix
    const cleaned = trimmed
      .replace(/<v\s+([^>]+)>/gi, "$1: ")
      .replace(/<\/v>/gi, "")
      .replace(/<[^>]+>/g, "") // remove any remaining tags
      .trim();

    if (cleaned) result.push(cleaned);
  }

  return result.join("\n");
}

/**
 * SRT parser
 * Removes sequence numbers and timestamps
 */
export function parseSrt(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip sequence numbers
    if (/^\d+$/.test(trimmed)) continue;

    // Skip SRT timestamps: 00:00:00,000 --> 00:00:05,000
    if (/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(trimmed)) continue;

    // Skip empty lines
    if (!trimmed) continue;

    result.push(trimmed);
  }

  return result.join("\n");
}

/**
 * Auto-detect format and parse transcript file
 */
export function parseTranscriptFile(content: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "vtt") return parseVtt(content);
  if (ext === "srt") return parseSrt(content);
  // .txt: return as-is
  return content.trim();
}

/**
 * Detect if content looks like a Zoom/Meet transcript
 */
export function isTranscriptFile(filename: string): boolean {
  return /\.(vtt|srt|txt)$/i.test(filename);
}
