/**
 * Programme Schedule Template - Entry point.
 * Handles file upload, rendering, and export functionality.
 * @module template
 */

import { downloadScheduleDocx } from "./export/schedule-docx";
import { renderAllMiploAssessments } from "./template/miplo-assessment-html";
import { renderAllModuleDescriptors } from "./template/module-descriptors-html";
import { renderAllSchedules } from "./template/schedule-html";
import type { Programme } from "./types";
import { migrateProgramme } from "./utils/migrate-programme";

/** localStorage key used by the main app (read-only here). */
const APP_STORAGE_KEY = "nci_pds_mvp_programme_v1";

let currentProgrammeData: Programme | null = null;

function copyToClipboard(
  container: HTMLElement,
  button: HTMLButtonElement,
  statusEl: HTMLElement,
): void {
  // Temporarily set font size to 11pt for copying
  document.documentElement.style.setProperty("--display-font-size", "11pt");

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    document.execCommand("copy");
    const originalText = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 1500);
  } catch {
    statusEl.textContent = "Copy failed - please select manually";
    statusEl.className = "error";
  }

  // Restore display font size to 9pt
  document.documentElement.style.setProperty("--display-font-size", "9pt");
  selection?.removeAllRanges();
}

async function handleFileUpload(
  file: File,
  statusEl: HTMLElement,
  schedulesContainer: HTMLElement,
  miploAssessmentContainer: HTMLElement,
  moduleDescriptorsContainer: HTMLElement,
  schedulesHeader: HTMLElement,
  miploAssessmentHeader: HTMLElement,
  moduleDescriptorsHeader: HTMLElement,
): Promise<void> {
  statusEl.textContent = "Loading...";
  statusEl.className = "";

  try {
    const text = await file.text();
    const data: Programme = JSON.parse(text);

    // Basic validation
    if (!data.modules || !data.versions) {
      throw new Error("Invalid programme JSON: missing required fields (modules, versions)");
    }

    statusEl.textContent = `✓ Loaded: ${data.title || file.name}`;
    statusEl.className = "success";
    currentProgrammeData = data;
    schedulesContainer.innerHTML = renderAllSchedules(data);
    miploAssessmentContainer.innerHTML = renderAllMiploAssessments(data);
    moduleDescriptorsContainer.innerHTML = renderAllModuleDescriptors(data);

    // Show section headers and TOC
    schedulesHeader.style.display = "flex";
    miploAssessmentHeader.style.display = "flex";
    moduleDescriptorsHeader.style.display = "flex";
    document.getElementById("toc")!.style.display = "block";
  } catch (error) {
    const err = error as Error;
    statusEl.textContent = `✗ Error: ${err.message}`;
    statusEl.className = "error";
  }
}

async function handleDownloadDocx(button: HTMLButtonElement, statusEl: HTMLElement): Promise<void> {
  if (!currentProgrammeData) {
    statusEl.textContent = "Please upload a programme JSON first";
    statusEl.className = "error";
    return;
  }

  try {
    button.textContent = "Generating...";
    await downloadScheduleDocx(currentProgrammeData);
    button.textContent = "Download DOCX";
  } catch (error) {
    const err = error as Error;
    statusEl.textContent = `✗ DOCX Error: ${err.message}`;
    statusEl.className = "error";
    button.textContent = "Download DOCX";
  }
}

/**
 * Loads programme data from the main app's localStorage (read-only).
 * The stored data is never modified or deleted — only read for rendering.
 */
function loadFromAppStorage(
  statusEl: HTMLElement,
  schedulesContainer: HTMLElement,
  miploAssessmentContainer: HTMLElement,
  moduleDescriptorsContainer: HTMLElement,
  schedulesHeader: HTMLElement,
  miploAssessmentHeader: HTMLElement,
  moduleDescriptorsHeader: HTMLElement,
): void {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) {
      statusEl.textContent =
        "✗ No programme found in app storage. Open the main app and save a programme first.";
      statusEl.className = "error";
      return;
    }

    let data: Programme = JSON.parse(raw);
    data = migrateProgramme(data) as Programme;

    if (!data.modules || !data.versions) {
      throw new Error("Programme in app storage is missing required fields (modules, versions)");
    }

    statusEl.textContent = `✓ Loaded from app: ${data.title || "Untitled Programme"}`;
    statusEl.className = "success";
    currentProgrammeData = data;
    schedulesContainer.innerHTML = renderAllSchedules(data);
    miploAssessmentContainer.innerHTML = renderAllMiploAssessments(data);
    moduleDescriptorsContainer.innerHTML = renderAllModuleDescriptors(data);

    schedulesHeader.style.display = "flex";
    miploAssessmentHeader.style.display = "flex";
    moduleDescriptorsHeader.style.display = "flex";
    document.getElementById("toc")!.style.display = "block";
  } catch (error) {
    const err = error as Error;
    statusEl.textContent = `✗ Error loading from app: ${err.message}`;
    statusEl.className = "error";
  }
}

function init(): void {
  const uploadSection = document.getElementById("upload-section") as HTMLElement;
  const fileUpload = document.getElementById("file-upload") as HTMLInputElement;
  const uploadStatus = document.getElementById("upload-status") as HTMLElement;
  const schedulesContainer = document.getElementById("schedules-container") as HTMLElement;
  const miploAssessmentContainer = document.getElementById(
    "miplo-assessment-container",
  ) as HTMLElement;
  const moduleDescriptorsContainer = document.getElementById(
    "module-descriptors-container",
  ) as HTMLElement;
  const schedulesHeader = document.getElementById("schedules-header") as HTMLElement;
  const miploAssessmentHeader = document.getElementById("miplo-assessment-header") as HTMLElement;
  const moduleDescriptorsHeader = document.getElementById(
    "module-descriptors-header",
  ) as HTMLElement;
  const copySchedulesBtn = document.getElementById("copy-schedules-btn") as HTMLButtonElement;
  const copyMiploAssessmentBtn = document.getElementById(
    "copy-miplo-assessment-btn",
  ) as HTMLButtonElement;
  const copyModuleDescriptorsBtn = document.getElementById(
    "copy-module-descriptors-btn",
  ) as HTMLButtonElement;
  const downloadDocxBtn = document.getElementById("download-docx-btn") as HTMLButtonElement;
  const loadFromAppBtn = document.getElementById("load-from-app-btn") as HTMLButtonElement;
  const toc = document.getElementById("toc") as HTMLElement;

  // Wire up event handlers
  loadFromAppBtn?.addEventListener("click", () => {
    loadFromAppStorage(
      uploadStatus,
      schedulesContainer,
      miploAssessmentContainer,
      moduleDescriptorsContainer,
      schedulesHeader,
      miploAssessmentHeader,
      moduleDescriptorsHeader,
    );
  });

  copySchedulesBtn?.addEventListener("click", () => {
    copyToClipboard(schedulesContainer, copySchedulesBtn, uploadStatus);
  });

  copyMiploAssessmentBtn?.addEventListener("click", () => {
    copyToClipboard(miploAssessmentContainer, copyMiploAssessmentBtn, uploadStatus);
  });

  copyModuleDescriptorsBtn?.addEventListener("click", () => {
    copyToClipboard(moduleDescriptorsContainer, copyModuleDescriptorsBtn, uploadStatus);
  });

  downloadDocxBtn?.addEventListener("click", () => {
    handleDownloadDocx(downloadDocxBtn, uploadStatus);
  });

  fileUpload?.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleFileUpload(
        file,
        uploadStatus,
        schedulesContainer,
        miploAssessmentContainer,
        moduleDescriptorsContainer,
        schedulesHeader,
        miploAssessmentHeader,
        moduleDescriptorsHeader,
      );
    }
  });

  // Drag and drop handlers
  uploadSection?.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadSection.classList.add("drag-over");
  });

  uploadSection?.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadSection.classList.remove("drag-over");
  });

  uploadSection?.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadSection.classList.remove("drag-over");

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".json")) {
        handleFileUpload(
          file,
          uploadStatus,
          schedulesContainer,
          miploAssessmentContainer,
          moduleDescriptorsContainer,
          schedulesHeader,
          miploAssessmentHeader,
          moduleDescriptorsHeader,
        );
      } else {
        uploadStatus.textContent = "✗ Please drop a JSON file";
        uploadStatus.className = "error";
      }
    }
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
