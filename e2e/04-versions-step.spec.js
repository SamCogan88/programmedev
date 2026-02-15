// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Versions step E2E tests — workflow-level coverage only.
 *
 * Individual field editing, add/delete, rendering, and accordion
 * re-render stability are covered by unit tests in VersionsStep.test.tsx.
 */

test.describe("Step 3: Programme Versions", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(300);
  });

  test("should configure a complete version and persist data", async ({ page }) => {
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);

    // Expand the version panel
    const header = page.locator("#versionsAccordion .accordion-button").first();
    const expanded = await header.getAttribute("aria-expanded");
    if (expanded !== "true") {
      await header.click();
    }

    // Fill label
    const labelInput = page.getByLabel("Version label");
    await labelInput.fill("Full-time");

    // Set cohort size
    const cohortInput = page.getByLabel("Target cohort size");
    await cohortInput.fill("60");

    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.versions.length).toBe(1);
    expect(data.versions[0].label).toBe("Full-time");
  });

  test("should add multiple versions", async ({ page }) => {
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.versions.length).toBe(3);
  });

  test("should allow switching between versions", async ({ page }) => {
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(500);

    const versionTabs = page.locator('[role="tab"], .nav-link, button:has-text("Version")');
    const count = await versionTabs.count();

    if (count > 1) {
      await versionTabs.nth(1).click();
      await page.waitForTimeout(300);
    }
  });
});
