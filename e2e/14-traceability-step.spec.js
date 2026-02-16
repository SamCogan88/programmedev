// @ts-check
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Traceability step E2E tests — workflow-level coverage only.
 *
 * Heading and diagram container rendering are covered by unit tests
 * in TraceabilityStep.test.tsx. This E2E test verifies the full
 * cross-step data chain.
 */

test.describe("Step 13: Traceability Chain", () => {
  test("should trace PLO → Module → MIMLO → Assessment chain", async ({ page }) => {
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");

    // PLO
    await page.getByTestId("step-outcomes").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-plo-btn").click();
    await page
      .getByTestId(/^plo-textarea-/)
      .first()
      .fill("Design software applications");
    await page.waitForTimeout(300);

    // Module
    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page
      .getByTestId(/^module-title-/)
      .first()
      .fill("Software Development");
    await page.waitForTimeout(300);

    // MIMLO
    await page.getByTestId("step-mimlos").click();
    await page.waitForTimeout(200);
    const addMimloBtn = page.getByTestId(/^add-mimlo-/).first();
    if (await addMimloBtn.isVisible()) {
      await addMimloBtn.click();
      await page
        .getByTestId(/^mimlo-input-/)
        .first()
        .fill("Design OO software");
    }
    await page.waitForTimeout(300);

    // Assessment linked to MIMLO
    await page.getByTestId("step-assessments").click();
    await page.waitForTimeout(200);
    const addAsmBtn = page.getByTestId(/^add-asm-/).first();
    if (await addAsmBtn.isVisible()) {
      await addAsmBtn.click();
      await page.waitForTimeout(200);
      await page
        .getByTestId(/^asm-title-/)
        .first()
        .fill("Programming Project");
    }
    const mimloCheckbox = page.getByTestId(/^asm-mimlo-/).first();
    if (await mimloCheckbox.isVisible()) {
      await mimloCheckbox.click();
    }
    await page.waitForTimeout(300);

    // Map PLO to Module
    await page.getByTestId("step-mapping").click();
    await page.waitForTimeout(200);
    const mapCheckbox = page.getByTestId(/^mapping-module-checkbox-/).first();
    if (await mapCheckbox.isVisible()) {
      await mapCheckbox.click();
    }
    await page.waitForTimeout(400);

    // View Traceability
    await page.getByTestId("step-traceability").click();
    await page.waitForTimeout(1000);

    // Verify data structure supports traceability
    const data = await getProgrammeData(page);
    expect(data.plos.length).toBeGreaterThan(0);
    expect(data.modules.length).toBeGreaterThan(0);
    expect(data.modules[0].mimlos?.length || 0).toBeGreaterThan(0);
    expect(Object.keys(data.ploToMimlos || {}).length).toBeGreaterThan(0);
  });
});
