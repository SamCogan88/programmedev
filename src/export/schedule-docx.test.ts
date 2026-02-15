import { describe, expect, it, vi, beforeEach } from "vitest";
import { Packer } from "docx";

vi.mock("docx", async () => {
  const actual = await vi.importActual<typeof import("docx")>("docx");
  return {
    ...actual,
    Packer: {
      toBlob: vi.fn().mockResolvedValue(new Blob(["fake"], { type: "application/octet-stream" })),
    },
  };
});

import { downloadScheduleDocx } from "./schedule-docx";

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
    ...overrides,
  } as Programme;
}

describe("downloadScheduleDocx", () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    (Packer.toBlob as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Blob(["fake"], { type: "application/octet-stream" }),
    );

    createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;
  });

  it("is exported and callable", () => {
    expect(typeof downloadScheduleDocx).toBe("function");
  });

  it("generates a document and triggers download", async () => {
    const clickSpy = vi.fn();
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      (node as HTMLAnchorElement).click = clickSpy;
      return node;
    });
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => {
      return node;
    });

    const p = makeProgramme({
      versions: [
        {
          id: "v1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [
            {
              id: "s1",
              name: "Year 1",
              creditsTarget: 60,
              modules: [{ moduleId: "mod1", semester: "1" }],
            },
          ],
        },
      ],
      modules: [
        {
          id: "mod1",
          title: "Programming",
          code: "COMP001",
          credits: 5,
          assessments: [{ id: "a1", type: "Continuous Assessment", weighting: 100 }],
        },
      ],
    });

    await downloadScheduleDocx(p);

    expect(Packer.toBlob).toHaveBeenCalled();
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it("handles programme with empty versions", async () => {
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      (node as HTMLAnchorElement).click = vi.fn();
      return node;
    });
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    const p = makeProgramme({ versions: [] });

    await expect(downloadScheduleDocx(p)).resolves.toBeUndefined();
    expect(Packer.toBlob).toHaveBeenCalled();

    appendChildSpy.mockRestore();
  });

  it("handles programme with no versions property", async () => {
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      (node as HTMLAnchorElement).click = vi.fn();
      return node;
    });
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    const p = makeProgramme();
    delete (p as Partial<Programme>).versions;

    await expect(downloadScheduleDocx(p)).resolves.toBeUndefined();
    expect(Packer.toBlob).toHaveBeenCalled();

    appendChildSpy.mockRestore();
  });

  it("handles stages with empty modules", async () => {
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      (node as HTMLAnchorElement).click = vi.fn();
      return node;
    });
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    const p = makeProgramme({
      versions: [
        {
          id: "v1",
          label: "Full-time",
          code: "FT",
          stages: [{ id: "s1", name: "Year 1", modules: [] }],
        },
      ],
      modules: [],
    });

    await expect(downloadScheduleDocx(p)).resolves.toBeUndefined();
    expect(Packer.toBlob).toHaveBeenCalled();

    appendChildSpy.mockRestore();
  });

  it("uses the provided filename for download", async () => {
    let downloadAttr = "";
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      const anchor = node as HTMLAnchorElement;
      downloadAttr = anchor.download;
      anchor.click = vi.fn();
      return node;
    });
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    const p = makeProgramme({ versions: [] });
    await downloadScheduleDocx(p, "custom-name.docx");

    expect(downloadAttr).toBe("custom-name.docx");

    appendChildSpy.mockRestore();
  });
});
