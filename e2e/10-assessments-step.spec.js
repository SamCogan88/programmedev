// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Assessments step E2E tests — workflow-level coverage only.
 *
 * Individual field editing, add/delete, heading, module selector,
 * re-render stability, and type options are covered by unit tests
 * in AssessmentsStep.test.tsx.
 */

test.describe("Step 9: Assessments", () => {
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

    await page.getByTestId("step-mimlos").click();
    await page.waitForTimeout(200);

    const addMimloBtn = page.getByTestId(/^add-mimlo-/).first();
    if (await addMimloBtn.isVisible()) {
      await addMimloBtn.click();
      await page.waitForTimeout(200);
      await page
        .getByTestId(/^mimlo-input-/)
        .first()
        .fill("Design and implement software solutions");
      await page.waitForTimeout(400);
    }

    await page.getByTestId("step-assessments").click();
    await page.waitForTimeout(300);
  });

  test("should add and configure assessment with MIMLO linking", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    // Set title
    const titleInput = page.getByTestId(/^asm-title-/).first();
    await titleInput.fill("Programming Project");

    // Set type
    const typeSelect = page.getByTestId(/^asm-type-/).first();
    await typeSelect.selectOption({ index: 1 });

    // Set weighting
    const weightingInput = page.getByTestId(/^asm-weight-/).first();
    await weightingInput.fill("50");

    // Link MIMLO
    const mimloCheckbox = page.getByTestId(/^asm-mimlo-/).first();
    if (await mimloCheckbox.isVisible()) {
      await mimloCheckbox.check();
    }

    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments[0].title).toBe("Programming Project");
    expect(data.modules[0].assessments[0].weighting).toBe(50);
  });

  test("should validate weightings sum to 100%", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);
    await page
      .getByTestId(/^asm-weight-/)
      .first()
      .fill("60");
    await page.waitForTimeout(300);

    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(500);

    const assessmentHeaders = page.locator(".accordion-item .accordion-item .accordion-button");
    if ((await assessmentHeaders.count()) > 1) {
      const secondHeader = assessmentHeaders.nth(1);
      const isCollapsed = (await secondHeader.getAttribute("aria-expanded")) === "false";
      if (isCollapsed) {
        await secondHeader.click();
        await page.waitForTimeout(300);
      }
    }

    const weightInputs = page.getByTestId(/^asm-weight-/);
    await weightInputs.nth(1).fill("60");
    await page.waitForTimeout(600);

    await expect(page.locator("text=/120%/")).toBeVisible();
  });
});
