import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Programme } from "../types";

// Mock docx-templates createReport
const mockCreateReport = vi.fn().mockResolvedValue(new Uint8Array(8));

vi.mock("docx-templates", () => ({
  createReport: (...args: unknown[]) => mockCreateReport(...args),
}));

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("./descriptor-data", () => ({
  buildDescriptorData: vi.fn().mockReturnValue({ programme_title: "Test" }),
}));

import { saveAs } from "file-saver";

import { buildDescriptorData } from "./descriptor-data";
import { exportProgrammeDescriptorWord, exportProgrammeToWord } from "./word";

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return { title: "Test Programme", totalCredits: 60, ...overrides } as Programme;
}

function mockFetchSuccess(): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as Response);
}

describe("exportProgrammeDescriptorWord", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreateReport.mockClear().mockResolvedValue(new Uint8Array(8));
  });

  it("fetches the Word template", async () => {
    mockFetchSuccess();
    await exportProgrammeDescriptorWord(makeProgramme());

    expect(globalThis.fetch).toHaveBeenCalledWith("./assets/programme_descriptor_template.docx");
  });

  it("calls buildDescriptorData with the programme", async () => {
    mockFetchSuccess();
    const p = makeProgramme({ title: "Higher Diploma" });

    await exportProgrammeDescriptorWord(p);

    expect(buildDescriptorData).toHaveBeenCalledWith(p);
  });

  it("calls createReport with template, data, and correct options", async () => {
    mockFetchSuccess();
    await exportProgrammeDescriptorWord(makeProgramme());

    expect(mockCreateReport).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.any(Uint8Array),
        data: { programme_title: "Test" },
        cmdDelimiter: ["{", "}"],
        processLineBreaks: true,
        failFast: false,
      }),
    );
  });

  it("saves with a sanitized filename", async () => {
    mockFetchSuccess();
    await exportProgrammeDescriptorWord(makeProgramme({ title: "Test / Programme (v2)" }));

    expect(saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      "Test_Programme_v2_programme_descriptor.docx",
    );
  });

  it("uses default filename when title is empty", async () => {
    mockFetchSuccess();
    await exportProgrammeDescriptorWord(makeProgramme({ title: "" }));

    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "programme_programme_descriptor.docx");
  });

  it("throws when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(exportProgrammeDescriptorWord(makeProgramme())).rejects.toThrow(
      "Failed to load Word template",
    );
  });
});

describe("exportProgrammeToWord", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreateReport.mockClear().mockResolvedValue(new Uint8Array(8));
  });

  it("delegates to exportProgrammeDescriptorWord on success", async () => {
    mockFetchSuccess();

    await exportProgrammeToWord(makeProgramme());

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalled();
  });

  it("handles errors gracefully without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "alert").mockImplementation(() => {});

    await expect(exportProgrammeToWord(makeProgramme())).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith("Word export failed:", expect.any(Error));
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining("Word export failed"));
  });
});
