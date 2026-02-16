// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Modules step E2E tests — workflow-level coverage only.
 *
 * Individual field editing, add/delete, heading, button rendering,
 * re-render stability, and credits mismatch validation are covered
 * by unit tests in StructureStep.test.tsx and validation.test.ts.
 */

test.describe("Step 5: Credits & Modules", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(300);

    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(300);
  });

  test("should add and configure multiple modules", async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await page.getByTestId("add-module-btn").click();
      await page.waitForTimeout(200);
    }

    await page.waitForTimeout(500);

    const data = await getProgrammeData(page);
    expect(data.modules.length).toBe(4);
  });

  test("should show credits sum and mismatch warning (cross-component)", async ({ page }) => {
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(200);

    const creditsInput = page.getByTestId(/^module-credits-/).first();
    await creditsInput.fill("30");
    await page.waitForTimeout(600);

    // Verify total credits display from Identity step
    await expect(page.getByTestId("total-credits-display")).toHaveValue("60");
    // Should show mismatch in flags
    await expect(page.getByText("mismatch")).toBeVisible();
  });
});
