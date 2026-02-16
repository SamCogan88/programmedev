import { beforeEach, describe, expect, it, vi } from "vitest";

import { downloadJson, importJson, importProgrammeFromJson } from "./json";

vi.mock("../utils/dom", () => ({
  downloadBlob: vi.fn(),
}));

import { downloadBlob } from "../utils/dom";

vi.mock("../utils/migrate-programme", () => ({
  migrateProgramme: vi.fn((data: unknown) => data),
}));

import { migrateProgramme } from "../utils/migrate-programme";
import type { Programme } from "../types";

/** Helper to create a minimal Programme-like object for testing. */
function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return { title: "Test Programme", ...overrides } as Programme;
}

/** Helper to create a File from a string with a working .text() method. */
function makeJsonFile(content: string, name = "test.json"): File {
  const file = new File([content], name, { type: "application/json" });
  file.text = () => Promise.resolve(content);
  return file;
}

describe("downloadJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a download blob and triggers a download", () => {
    const programme = makeProgramme({ title: "My Programme" });
    downloadJson(programme);

    expect(downloadBlob).toHaveBeenCalledOnce();
    const [blob, filename] = (downloadBlob as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toBe("My_Programme.json");
  });

  it("uses 'programme' as default filename when title is empty", () => {
    downloadJson(makeProgramme({ title: "" }));

    const [, filename] = (downloadBlob as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(filename).toBe("programme.json");
  });

  it("replaces whitespace in title with underscores for filename", () => {
    downloadJson(makeProgramme({ title: "Higher  Diploma in  Computing" }));

    const [, filename] = (downloadBlob as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(filename).toBe("Higher_Diploma_in_Computing.json");
  });
});

describe("importJson", () => {
  it("parses valid JSON from a file", async () => {
    const data = { title: "Test", credits: 60 };
    const file = makeJsonFile(JSON.stringify(data));

    const result = await importJson(file);

    expect(result).toEqual(data);
  });

  it("throws on invalid JSON", async () => {
    const file = makeJsonFile("not valid json {{{");

    await expect(importJson(file)).rejects.toThrow();
  });
});

describe("importProgrammeFromJson", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(migrateProgramme).mockImplementation((data: unknown) => data);
  });

  it("returns success with valid programme data", async () => {
    const data = { title: "Valid Programme", schemaVersion: 4 };
    const file = makeJsonFile(JSON.stringify(data));

    const result = await importProgrammeFromJson(file);

    expect(result.success).toBe(true);
    expect(result.programme).toEqual(data);
  });

  it("returns error for invalid JSON", async () => {
    const file = makeJsonFile("not json");

    const result = await importProgrammeFromJson(file);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error when parsed value is not an object", async () => {
    const file = makeJsonFile('"just a string"');

    const result = await importProgrammeFromJson(file);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid JSON structure");
  });

  it("returns error when parsed value is null", async () => {
    const file = makeJsonFile("null");

    const result = await importProgrammeFromJson(file);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid JSON structure");
  });

  it("applies migrations to imported data", async () => {
    const data = { title: "Old Programme", schemaVersion: 1 };
    const migrated = { title: "Old Programme", schemaVersion: 4, migrated: true };
    vi.mocked(migrateProgramme).mockReturnValue(migrated);

    const file = makeJsonFile(JSON.stringify(data));
    const result = await importProgrammeFromJson(file);

    expect(migrateProgramme).toHaveBeenCalledWith(data);
    expect(result.success).toBe(true);
    expect(result.programme).toEqual(migrated);
  });

  it("returns error when migration throws", async () => {
    vi.mocked(migrateProgramme).mockImplementation(() => {
      throw new Error("Migration failed");
    });

    const data = { title: "Bad Data" };
    const file = makeJsonFile(JSON.stringify(data));
    const result = await importProgrammeFromJson(file);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Migration failed");
  });
});
