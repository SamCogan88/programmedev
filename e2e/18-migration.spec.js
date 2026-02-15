// @ts-check
import { expect, getProgrammeData, loadProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * E2E tests for programme schema migration via JSON import path and UI verification.
 *
 * localStorage migration logic is tested exhaustively in unit tests
 * (migrate-programme.test.ts — 45 tests). These E2E tests verify the
 * real file-input → migration → state → render integration that unit
 * tests cannot cover.
 */

test.describe("Programme Migration - JSON Import Path", () => {
  test("should migrate imported v1 JSON to v4", async ({ page }) => {
    const v1Programme = {
      schemaVersion: 1,
      title: "Imported V1 Programme",
      awardStandardId: "science",
      awardStandardName: "Science",
      nfqLevel: 9,
      totalCredits: 90,
      modules: [],
      plos: [],
      versions: [
        {
          id: "imp-v1",
          label: "Imported",
          deliveryModalities: ["Blended"],
          deliveryPatterns: { Blended: { weeks: 15 } },
        },
      ],
    };

    // Find the file input for import using data-testid
    const fileInput = page.getByTestId("import-input");

    await fileInput.setInputFiles({
      name: "v1-import.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(v1Programme)),
    });

    await page.waitForTimeout(1000);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    expect(data.title).toBe("Imported V1 Programme");
    // Should be migrated to arrays
    expect(data.awardStandardIds).toEqual(["science"]);
    expect(data.awardStandardNames).toEqual(["Science"]);
    // Delivery modality should be converted
    expect(data.versions[0].deliveryModality).toBe("Blended");
    expect(data.versions[0].deliveryModalities).toBeUndefined();
    // Should have ploToMimlos initialized
    expect(data.ploToMimlos).toEqual({});
  });

  test("should migrate imported v3 JSON to v4", async ({ page }) => {
    const v3Programme = {
      schemaVersion: 3,
      title: "Imported V3 Programme",
      awardStandardIds: ["computing", "science"],
      awardStandardNames: ["Computing", "Science"],
      nfqLevel: 8,
      totalCredits: 60,
      modules: [
        {
          id: "m1",
          title: "Test Module",
          code: "TST001",
          credits: 5,
          mimlos: [{ id: "mim1" }],
        },
      ],
      plos: [{ id: "p1", text: "Test PLO" }],
      ploToModules: { p1: ["m1"] },
      versions: [
        {
          id: "v2-v1",
          label: "V2 Version",
          deliveryModality: "Online",
          deliveryPatterns: { Online: { weeks: 10 } },
        },
      ],
    };

    const fileInput = page.getByTestId("import-input");

    await fileInput.setInputFiles({
      name: "v3-import.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(v3Programme)),
    });

    await page.waitForTimeout(1000);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    expect(data.awardStandardIds).toEqual(["computing", "science"]);
    expect(data.versions[0].deliveryModality).toBe("Online");
    expect(data.modules.length).toBe(1);
    // ploToModules should be converted to ploToMimlos
    expect(data.ploToMimlos.p1).toEqual(["mim1"]);
    expect(data.ploToModules).toBeUndefined();
  });

  test("should accept and preserve imported v4 JSON unchanged", async ({ page }) => {
    const v4Programme = {
      schemaVersion: 4,
      title: "Imported V4 Programme",
      awardStandardIds: ["computing"],
      awardStandardNames: ["Computing"],
      nfqLevel: 8,
      totalCredits: 60,
      modules: [
        {
          id: "m1",
          title: "Test Module",
          code: "TST001",
          credits: 5,
          mimlos: [{ id: "mim1" }],
        },
      ],
      plos: [{ id: "p1", text: "Test PLO" }],
      ploToMimlos: { p1: ["mim1"] },
      versions: [
        {
          id: "v4-v1",
          label: "V4 Version",
          deliveryModality: "F2F",
          deliveryPatterns: { F2F: { weeks: 12 } },
        },
      ],
    };

    const fileInput = page.getByTestId("import-input");

    await fileInput.setInputFiles({
      name: "v4-import.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(v4Programme)),
    });

    await page.waitForTimeout(1000);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    expect(data.title).toBe("Imported V4 Programme");
    expect(data.awardStandardIds).toEqual(["computing"]);
    expect(data.ploToMimlos.p1).toEqual(["mim1"]);
    expect(data.modules.length).toBe(1);
  });
});

test.describe("Programme Migration - UI Verification", () => {
  test("should display migrated award standards in Identity step", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 UI Test",
      nfqLevel: 8,
      awardStandardId: "computing",
      awardStandardName: "Computing",
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);

    // Navigate to Identity step
    await page.getByTestId("step-identity").click();
    await page.waitForTimeout(300);

    // The first standard selector should show Computing as selected value
    const firstStandardSelect = page.locator("select").nth(2); // The third select on the page (after award type and school)
    await expect(firstStandardSelect).toHaveValue("computing");
  });

  test("should display migrated delivery modality in Versions step", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 Delivery Test",
      nfqLevel: 8,
      totalCredits: 60,
      versions: [
        {
          id: "test-v",
          label: "Test Version",
          cohortSize: 30,
          deliveryModalities: ["Blended"],
          deliveryPatterns: { Blended: { weeks: 12 } },
        },
      ],
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);

    // Navigate to Versions step
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(500);

    // Verify version label is visible
    await expect(page.getByText("Test Version")).toBeVisible();
    // Verify the version header shows Blended (format: "No code • Blended • No intakes")
    await expect(page.getByText("No code • Blended • No intakes")).toBeVisible();
  });
});
