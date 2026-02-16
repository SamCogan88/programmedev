// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Reading Lists step E2E tests — workflow-level coverage only.
 *
 * Individual field editing, add/delete, heading, module selector,
 * re-render stability, and type selection are covered by unit tests
 * in ReadingListsStep.test.tsx.
 */

test.describe("Step 10: Reading Lists", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(500);

    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(200);

    await page
      .getByTestId(/^module-code-/)
      .first()
      .fill("CMP8001");
    await page
      .getByTestId(/^module-title-/)
      .first()
      .fill("Software Development");
    await page
      .getByTestId(/^module-credits-/)
      .first()
      .fill("10");
    await page.waitForTimeout(400);

    await page.getByTestId("step-reading-lists").click();
    await page.waitForTimeout(300);
  });

  test("should add complete reading list entry and persist", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    await page
      .getByTestId(/^reading-title-/)
      .first()
      .fill("Clean Code");
    await page
      .getByTestId(/^reading-author-/)
      .first()
      .fill("Robert C. Martin");
    await page
      .getByTestId(/^reading-publisher-/)
      .first()
      .fill("Pearson");
    await page
      .getByTestId(/^reading-year-/)
      .first()
      .fill("2023");
    await page.locator('input[data-testid^="reading-isbn-"]').first().fill("978-0132350884");
    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    const entry = data.modules[0].readingList[0];
    expect(entry.title).toContain("Clean Code");
  });

  test("should add multiple reading list entries", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();

    await addBtn.click();
    await page.waitForTimeout(200);
    await page
      .getByTestId(/^reading-title-/)
      .first()
      .fill("Book 1");

    await addBtn.click();
    await page.waitForTimeout(200);

    await addBtn.click();
    await page.waitForTimeout(500);

    const data = await getProgrammeData(page);
    expect(data.modules[0].readingList.length).toBeGreaterThanOrEqual(3);
  });
});
