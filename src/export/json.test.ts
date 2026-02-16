import { beforeEach, describe, expect, it, vi } from "vitest";

import { downloadJson, exportProgrammeToJson, importJson, importProgrammeFromJson } from "./json";

vi.mock("../utils/migrate-programme", () => ({
  migrateProgramme: vi.fn((data: unknown) => data),
}));

import { migrateProgramme } from "../utils/migrate-programme";

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
    vi.restoreAllMocks();
  });

  it("creates a download link and triggers a click", () => {
    const fakeUrl = "blob:http://localhost/fake-url";
    vi.spyOn(URL, "createObjectURL").mockReturnValue(fakeUrl);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const clickSpy = vi.fn();
    const fakeAnchor = { href: "", download: "", click: clickSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(fakeAnchor);

    const programme = makeProgramme({ title: "My Programme" });
    downloadJson(programme);

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(fakeAnchor.href).toBe(fakeUrl);
    expect(fakeAnchor.download).toBe("My_Programme.json");
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(fakeUrl);
  });

  it("uses 'programme' as default filename when title is empty", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const fakeAnchor = { href: "", download: "", click: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(fakeAnchor);

    downloadJson(makeProgramme({ title: "" }));

    expect(fakeAnchor.download).toBe("programme.json");
  });

  it("replaces whitespace in title with underscores for filename", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const fakeAnchor = { href: "", download: "", click: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(fakeAnchor);

    downloadJson(makeProgramme({ title: "Higher  Diploma in  Computing" }));

    expect(fakeAnchor.download).toBe("Higher_Diploma_in_Computing.json");
  });
});

describe("exportProgrammeToJson", () => {
  it("is an alias for downloadJson", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const clickSpy = vi.fn();
    const fakeAnchor = { href: "", download: "", click: clickSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(fakeAnchor);

    const programme = makeProgramme({ title: "Alias Test" });
    exportProgrammeToJson(programme);

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(fakeAnchor.download).toBe("Alias_Test.json");
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
