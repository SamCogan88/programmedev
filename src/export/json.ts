/**
 * JSON import/export utilities.
 * Handles programme data serialization for file download and upload.
 * @module export/json
 */

import { migrateProgramme } from "../utils/migrate-programme";

/**
 * Downloads a programme as a JSON file.
 * Creates a downloadable blob with formatted JSON content.
 */
export function downloadJson(programme: Programme): void {
  const title = programme.title?.trim() || "programme";
  const filename = `${title.replace(/\s+/g, "_")}.json`;
  const blob = new Blob([JSON.stringify(programme, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports programme to JSON file (alias for downloadJson).
 */
export function exportProgrammeToJson(programme: Programme): void {
  downloadJson(programme);
}

/**
 * Reads and parses a JSON file.
 * @throws {SyntaxError} If JSON is invalid
 */
export async function importJson(file: File): Promise<object> {
  const text = await file.text();
  return JSON.parse(text);
}

/**
 * Imports and validates a programme from a JSON file.
 * Applies schema migrations to bring legacy data up to current version.
 */
export async function importProgrammeFromJson(
  file: File,
): Promise<{ success: boolean; programme?: object; error?: string }> {
  try {
    const text = await file.text();
    const programme = JSON.parse(text);

    // Basic validation
    if (!programme || typeof programme !== "object") {
      return { success: false, error: "Invalid JSON structure" };
    }

    // Apply migrations to bring data to current schema version
    const migrated = migrateProgramme(programme);

    return { success: true, programme: migrated };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
