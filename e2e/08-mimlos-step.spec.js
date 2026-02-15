// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * MIMLOs step E2E tests — workflow-level coverage only.
 *
 * Individual MIMLO add/delete, heading, module selector, re-render
 * stability, and empty state are covered by unit tests in
 * MimlosStep.test.tsx.
 */

test.describe("Step 7: MIMLOs (Module Intended Learning Outcomes)", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(500);

    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(300);

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
    await page.waitForTimeout(500);

    await page.getByTestId("step-mimlos").click();
    await page.waitForTimeout(300);
  });

  test("should add multiple MIMLOs to a module and persist", async ({ page }) => {
    const mimlos = [
      "Design and implement object-oriented software solutions",
      "Apply software development methodologies",
      "Evaluate and select appropriate data structures",
      "Demonstrate proficiency in version control",
    ];

    for (let i = 0; i < mimlos.length; i++) {
      const addBtn = page.getByTestId(/^add-mimlo-/).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);

        const mimloInputs = page.getByTestId(/^mimlo-input-/);
        await mimloInputs.nth(i).fill(mimlos[i]);
        await page.waitForTimeout(500);
      }
    }

    await page.waitForTimeout(600);
    const data = await getProgrammeData(page);
    expect(data.modules[0].mimlos.length).toBe(4);
  });

  test("should switch between modules (cross-step data)", async ({ page }) => {
    // Add second module
    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(600);

    const expandAllBtn = page.getByRole("button", { name: "Expand all" });
    if (await expandAllBtn.isVisible()) {
      await expandAllBtn.click();
      await page.waitForTimeout(300);
    }

    await page
      .getByTestId(/^module-code-/)
      .nth(1)
      .fill("CMP8002");
    await page
      .getByTestId(/^module-title-/)
      .nth(1)
      .fill("Databases");
    await page.waitForTimeout(600);

    await page.getByTestId("step-mimlos").click();
    await page.waitForTimeout(300);

    const mimloCards = page.getByTestId(/^mimlo-module-/);
    expect(await mimloCards.count()).toBeGreaterThanOrEqual(2);
  });
});
