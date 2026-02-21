import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the imported modules before importing template
vi.mock("./export/schedule-docx", () => ({
  downloadScheduleDocx: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./template/module-descriptors-html", () => ({
  renderAllModuleDescriptors: vi.fn().mockReturnValue("<div>module descriptors</div>"),
}));

vi.mock("./template/miplo-assessment-html", () => ({
  renderAllMiploAssessments: vi.fn().mockReturnValue("<div>miplo assessments</div>"),
}));

vi.mock("./template/schedule-html", () => ({
  renderAllSchedules: vi.fn().mockReturnValue("<div>schedules</div>"),
}));

vi.mock("./utils/migrate-programme", () => ({
  migrateProgramme: vi.fn().mockImplementation((p: unknown) => p),
}));

import { downloadScheduleDocx } from "./export/schedule-docx";
import { renderAllMiploAssessments } from "./template/miplo-assessment-html";
import { renderAllModuleDescriptors } from "./template/module-descriptors-html";
import { renderAllSchedules } from "./template/schedule-html";
import type { Module, Programme, ProgrammeVersion } from "./types";

/** Create a File-like object with a working text() method */
function createMockFile(content: string, name: string): File {
  const file = {
    name,
    text: () => Promise.resolve(content),
  } as unknown as File;
  return file;
}

function createMockElement(overrides: Partial<HTMLElement> = {}): HTMLElement {
  return {
    textContent: "",
    className: "",
    innerHTML: "",
    style: { display: "" },
    addEventListener: vi.fn(),
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    ...overrides,
  } as unknown as HTMLElement;
}

function setupDOM(): Record<string, HTMLElement> {
  const elements: Record<string, HTMLElement> = {
    "upload-section": createMockElement(),
    "file-upload": createMockElement(),
    "upload-status": createMockElement(),
    "schedules-container": createMockElement(),
    "miplo-assessment-container": createMockElement(),
    "module-descriptors-container": createMockElement(),
    "schedules-header": createMockElement(),
    "miplo-assessment-header": createMockElement(),
    "module-descriptors-header": createMockElement(),
    "copy-schedules-btn": createMockElement(),
    "copy-miplo-assessment-btn": createMockElement(),
    "copy-module-descriptors-btn": createMockElement(),
    "download-docx-btn": createMockElement(),
    "load-from-app-btn": createMockElement(),
  };

  vi.spyOn(document, "getElementById").mockImplementation((id: string) => elements[id] ?? null);

  return elements;
}

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    schemaVersion: 1,
    id: "prog1",
    title: "Test Programme",
    awardType: "Major",
    awardTypeIsOther: false,
    nfqLevel: 8,
    school: "Computing",
    awardStandardIds: [],
    awardStandardNames: [],
    totalCredits: 60,
    electiveDefinitions: [],
    modules: [
      {
        id: "mod_1",
        title: "Module 1",
        code: "M1",
        credits: 10,
        nfqLevel: 8,
        stageAssignments: {},
        mimlos: [],
        assessments: [],
        readingList: [],
      } as Module,
    ],
    versions: [
      {
        id: "v1",
        label: "Full Time",
        code: "FT",
        stages: [],
      } as ProgrammeVersion,
    ],
    ...overrides,
  } as Programme;
}

describe("template entry point", () => {
  let domContentLoadedHandler: EventListener;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(document, "addEventListener").mockImplementation(
      (event: string, handler: EventListenerOrEventListenerObject) => {
        if (event === "DOMContentLoaded") {
          domContentLoadedHandler = handler as EventListener;
        }
      },
    );
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function loadTemplate(): Promise<void> {
    await import("./template");
  }

  describe("init()", () => {
    it("should register a DOMContentLoaded listener", async () => {
      await loadTemplate();
      expect(document.addEventListener).toHaveBeenCalledWith(
        "DOMContentLoaded",
        expect.any(Function),
      );
    });

    it("should wire event handlers on all interactive elements", async () => {
      await loadTemplate();
      const elements = setupDOM();

      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const fileUpload = elements["file-upload"];
      const uploadSection = elements["upload-section"];
      const copySchedulesBtn = elements["copy-schedules-btn"];
      const copyModuleDescriptorsBtn = elements["copy-module-descriptors-btn"];
      const downloadDocxBtn = elements["download-docx-btn"];

      expect(fileUpload.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
      expect(uploadSection.addEventListener).toHaveBeenCalledWith("dragover", expect.any(Function));
      expect(uploadSection.addEventListener).toHaveBeenCalledWith(
        "dragleave",
        expect.any(Function),
      );
      expect(uploadSection.addEventListener).toHaveBeenCalledWith("drop", expect.any(Function));
      expect(copySchedulesBtn.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
      expect(copyModuleDescriptorsBtn.addEventListener).toHaveBeenCalledWith(
        "click",
        expect.any(Function),
      );
      expect(downloadDocxBtn.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    });
  });

  describe("file upload handling", () => {
    it("should parse valid JSON and render schedules and module descriptors", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const programme = makeProgramme();
      const mockFile = createMockFile(JSON.stringify(programme), "test.json");

      // Find the change handler
      const fileUpload = elements["file-upload"];
      const changeCall = (fileUpload.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "change",
      );
      const changeHandler = changeCall![1] as (e: Partial<Event>) => void;

      // Trigger the change event
      changeHandler({
        target: { files: [mockFile] } as unknown as EventTarget,
      });

      // Wait for async file.text() to resolve
      await vi.waitFor(() => {
        expect(elements["upload-status"].className).toBe("success");
      });

      expect(elements["upload-status"].textContent).toContain("Loaded: Test Programme");
      expect(renderAllSchedules).toHaveBeenCalled();
      expect(renderAllMiploAssessments).toHaveBeenCalled();
      expect(renderAllModuleDescriptors).toHaveBeenCalled();
      expect(elements["schedules-header"].style.display).toBe("flex");
      expect(elements["miplo-assessment-header"].style.display).toBe("flex");
      expect(elements["module-descriptors-header"].style.display).toBe("flex");
    });

    it("should show error for invalid JSON missing required fields", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const mockFile = createMockFile(
        JSON.stringify({ title: "No modules or versions" }),
        "bad.json",
      );

      const fileUpload = elements["file-upload"];
      const changeCall = (fileUpload.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "change",
      );
      const changeHandler = changeCall![1] as (e: Partial<Event>) => void;

      changeHandler({
        target: { files: [mockFile] } as unknown as EventTarget,
      });

      await vi.waitFor(() => {
        expect(elements["upload-status"].className).toBe("error");
      });

      expect(elements["upload-status"].textContent).toContain("missing required fields");
    });

    it("should show error for malformed JSON", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const mockFile = createMockFile("not valid json", "bad.json");

      const fileUpload = elements["file-upload"];
      const changeCall = (fileUpload.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "change",
      );
      const changeHandler = changeCall![1] as (e: Partial<Event>) => void;

      changeHandler({
        target: { files: [mockFile] } as unknown as EventTarget,
      });

      await vi.waitFor(() => {
        expect(elements["upload-status"].className).toBe("error");
      });

      expect(elements["upload-status"].textContent).toContain("Error:");
    });
  });

  describe("drag and drop handlers", () => {
    it("should add drag-over class on dragover", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const uploadSection = elements["upload-section"];
      const dragoverCall = (
        uploadSection.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "dragover");
      const dragoverHandler = dragoverCall![1] as (e: Partial<DragEvent>) => void;

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };
      dragoverHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(uploadSection.classList.add).toHaveBeenCalledWith("drag-over");
    });

    it("should remove drag-over class on dragleave", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const uploadSection = elements["upload-section"];
      const dragleaveCall = (
        uploadSection.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "dragleave");
      const dragleaveHandler = dragleaveCall![1] as (e: Partial<DragEvent>) => void;

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };
      dragleaveHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(uploadSection.classList.remove).toHaveBeenCalledWith("drag-over");
    });

    it("should handle drop of a JSON file", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const programme = makeProgramme();
      const mockFile = createMockFile(JSON.stringify(programme), "test.json");

      const uploadSection = elements["upload-section"];
      const dropCall = (uploadSection.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "drop",
      );
      const dropHandler = dropCall![1] as (e: Partial<DragEvent>) => void;

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: [mockFile] as unknown as FileList },
      } as unknown as Partial<DragEvent>;
      dropHandler(mockEvent);

      expect(uploadSection.classList.remove).toHaveBeenCalledWith("drag-over");

      await vi.waitFor(() => {
        expect(elements["upload-status"].className).toBe("success");
      });
    });

    it("should reject non-JSON files on drop", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const mockFile = new File(["data"], "test.txt", { type: "text/plain" });

      const uploadSection = elements["upload-section"];
      const dropCall = (uploadSection.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "drop",
      );
      const dropHandler = dropCall![1] as (e: Partial<DragEvent>) => void;

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: [mockFile] as unknown as FileList },
      } as unknown as Partial<DragEvent>;
      dropHandler(mockEvent);

      expect(elements["upload-status"].textContent).toBe("✗ Please drop a JSON file");
      expect(elements["upload-status"].className).toBe("error");
    });
  });

  describe("DOCX download handler", () => {
    it("should show error when no programme data is loaded", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const downloadDocxBtn = elements["download-docx-btn"];
      const clickCall = (
        downloadDocxBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      const clickHandler = clickCall![1] as () => void;

      clickHandler();

      await vi.waitFor(() => {
        expect(elements["upload-status"].textContent).toBe("Please upload a programme JSON first");
      });
      expect(elements["upload-status"].className).toBe("error");
    });

    it("should call downloadScheduleDocx after uploading data", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      // First, upload data
      const programme = makeProgramme();
      const mockFile = createMockFile(JSON.stringify(programme), "test.json");
      const fileUpload = elements["file-upload"];
      const changeCall = (fileUpload.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "change",
      );
      const changeHandler = changeCall![1] as (e: Partial<Event>) => void;
      changeHandler({
        target: { files: [mockFile] } as unknown as EventTarget,
      });

      await vi.waitFor(() => {
        expect(elements["upload-status"].className).toBe("success");
      });

      // Now click download
      const downloadDocxBtn = elements["download-docx-btn"];
      const clickCall = (
        downloadDocxBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      const clickHandler = clickCall![1] as () => void;

      clickHandler();

      await vi.waitFor(() => {
        expect(downloadScheduleDocx).toHaveBeenCalled();
      });
      expect(downloadDocxBtn.textContent).toBe("Download DOCX");
    });

    it("should handle DOCX download errors", async () => {
      (downloadScheduleDocx as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("DOCX generation failed"),
      );

      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      // Upload data first
      const programme = makeProgramme();
      const mockFile = createMockFile(JSON.stringify(programme), "test.json");
      const fileUpload = elements["file-upload"];
      const changeCall = (fileUpload.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "change",
      );
      (changeCall![1] as (e: Partial<Event>) => void)({
        target: { files: [mockFile] } as unknown as EventTarget,
      });

      await vi.waitFor(() => {
        expect(elements["upload-status"].className).toBe("success");
      });

      // Click download
      const downloadDocxBtn = elements["download-docx-btn"];
      const clickCall = (
        downloadDocxBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      (clickCall![1] as () => void)();

      await vi.waitFor(() => {
        expect(elements["upload-status"].textContent).toContain("DOCX Error:");
      });
      expect(elements["upload-status"].textContent).toContain("DOCX generation failed");
      expect(downloadDocxBtn.textContent).toBe("Download DOCX");
    });
  });

  describe("load from app storage", () => {
    it("should register click handler on load-from-app button", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const loadFromAppBtn = elements["load-from-app-btn"];
      expect(loadFromAppBtn.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    });

    it("should load and render programme data from localStorage", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const programme = makeProgramme({ title: "Stored Programme" });
      vi.spyOn(Storage.prototype, "getItem").mockReturnValue(JSON.stringify(programme));

      const loadFromAppBtn = elements["load-from-app-btn"];
      const clickCall = (
        loadFromAppBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      (clickCall![1] as () => void)();

      expect(localStorage.getItem).toHaveBeenCalledWith("nci_pds_mvp_programme_v1");
      expect(elements["upload-status"].textContent).toContain("Loaded from app: Stored Programme");
      expect(elements["upload-status"].className).toBe("success");
      expect(renderAllSchedules).toHaveBeenCalled();
      expect(renderAllMiploAssessments).toHaveBeenCalled();
      expect(renderAllModuleDescriptors).toHaveBeenCalled();
      expect(elements["schedules-header"].style.display).toBe("flex");
      expect(elements["miplo-assessment-header"].style.display).toBe("flex");
      expect(elements["module-descriptors-header"].style.display).toBe("flex");
    });

    it("should show error when no data exists in localStorage", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);

      const loadFromAppBtn = elements["load-from-app-btn"];
      const clickCall = (
        loadFromAppBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      (clickCall![1] as () => void)();

      expect(elements["upload-status"].textContent).toContain("No programme found in app storage");
      expect(elements["upload-status"].className).toBe("error");
    });

    it("should show error when stored data is invalid", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      vi.spyOn(Storage.prototype, "getItem").mockReturnValue(
        JSON.stringify({ title: "No modules" }),
      );

      const loadFromAppBtn = elements["load-from-app-btn"];
      const clickCall = (
        loadFromAppBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      (clickCall![1] as () => void)();

      expect(elements["upload-status"].textContent).toContain("missing required fields");
      expect(elements["upload-status"].className).toBe("error");
    });

    it("should never modify or delete localStorage data", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const programme = makeProgramme();
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");
      vi.spyOn(Storage.prototype, "getItem").mockReturnValue(JSON.stringify(programme));

      const loadFromAppBtn = elements["load-from-app-btn"];
      const clickCall = (
        loadFromAppBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      (clickCall![1] as () => void)();

      expect(setItemSpy).not.toHaveBeenCalled();
      expect(removeItemSpy).not.toHaveBeenCalled();
    });

    it("should enable DOCX download after loading from app", async () => {
      await loadTemplate();
      const elements = setupDOM();
      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const programme = makeProgramme();
      vi.spyOn(Storage.prototype, "getItem").mockReturnValue(JSON.stringify(programme));

      // Load from app
      const loadFromAppBtn = elements["load-from-app-btn"];
      const loadClick = (
        loadFromAppBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      (loadClick![1] as () => void)();

      // Click download
      const downloadDocxBtn = elements["download-docx-btn"];
      const downloadClick = (
        downloadDocxBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      (downloadClick![1] as () => void)();

      await vi.waitFor(() => {
        expect(downloadScheduleDocx).toHaveBeenCalled();
      });
    });
  });

  describe("clipboard copy", () => {
    it("should copy schedules content and show feedback", async () => {
      await loadTemplate();
      const elements = setupDOM();

      // Mock clipboard-related APIs
      const mockSelection = {
        removeAllRanges: vi.fn(),
        addRange: vi.fn(),
      };
      vi.spyOn(window, "getSelection").mockReturnValue(mockSelection as unknown as Selection);
      vi.spyOn(document, "createRange").mockReturnValue({
        selectNodeContents: vi.fn(),
      } as unknown as Range);
      document.execCommand = vi.fn().mockReturnValue(true);

      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const copySchedulesBtn = elements["copy-schedules-btn"];
      const clickCall = (
        copySchedulesBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      const clickHandler = clickCall![1] as () => void;

      clickHandler();

      expect(document.execCommand).toHaveBeenCalledWith("copy");
      expect(copySchedulesBtn.textContent).toBe("Copied!");
      expect(mockSelection.removeAllRanges).toHaveBeenCalled();
    });

    it("should show error when copy fails", async () => {
      await loadTemplate();
      const elements = setupDOM();

      vi.spyOn(window, "getSelection").mockReturnValue({
        removeAllRanges: vi.fn(),
        addRange: vi.fn(),
      } as unknown as Selection);
      vi.spyOn(document, "createRange").mockReturnValue({
        selectNodeContents: vi.fn(),
      } as unknown as Range);
      document.execCommand = vi.fn().mockImplementation(() => {
        throw new Error("Copy not supported");
      });

      domContentLoadedHandler(new Event("DOMContentLoaded"));

      const copyModuleDescriptorsBtn = elements["copy-module-descriptors-btn"];
      const clickCall = (
        copyModuleDescriptorsBtn.addEventListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: unknown[]) => c[0] === "click");
      (clickCall![1] as () => void)();

      expect(elements["upload-status"].textContent).toBe("Copy failed - please select manually");
      expect(elements["upload-status"].className).toBe("error");
    });
  });
});
