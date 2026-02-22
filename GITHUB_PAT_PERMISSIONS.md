# GitHub Personal Access Token (PAT) Permissions

This document lists the minimum GitHub Personal Access Token (PAT) permissions required to interact with this repository for common development, automation, and CI/CD operations.

GitHub offers two types of PATs:
- **Fine-grained PATs** (recommended) — scoped to a specific repository or organization with individual permission grants.
- **Classic PATs** — broader scopes that apply across all repositories the token has access to.

---

## Fine-Grained PAT Permissions

> Fine-grained PATs always implicitly require **Read access to metadata** (this cannot be removed).

### Required Permissions

| Permission | Access Level | Required For |
|---|---|---|
| **Contents** | Read | Cloning the repository and reading source files |
| **Contents** | Read and Write | Pushing code changes (branches, commits, tags) |
| **Issues** | Read and Write | Opening, editing, labelling, and closing issues |
| **Pull requests** | Read and Write | Opening, reviewing, commenting on, and merging pull requests |

### Optional / CI/CD Permissions

These permissions are only needed when automating CI/CD workflows or running GitHub Actions on behalf of a token.

| Permission | Access Level | Required For |
|---|---|---|
| **Actions** | Read and Write | Triggering `workflow_dispatch` on the [Deploy to GitHub Pages](.github/workflows/deploy.yml) workflow |
| **Checks** | Read and Write | Publishing unit and Playwright test results via `dorny/test-reporter` (used in [Build and Test](.github/workflows/playwright.yml)) |
| **Pages** | Read and Write | Deploying the built application to GitHub Pages (used in [Deploy to GitHub Pages](.github/workflows/deploy.yml)) |

> **Note:** The `id-token: write` permission used in the deploy workflow is an OIDC identity token granted by GitHub Actions itself — it is not a PAT permission and cannot be replicated with a personal token.

---

## Classic PAT Scopes

Classic PAT scopes are coarser-grained and apply across all repositories the token can access.

### Required Scopes

| Scope | Required For |
|---|---|
| `repo` | Full access: push code, read/write issues and pull requests, access repository content. For public repositories, `public_repo` is sufficient if only push access is needed. |

### Optional / CI/CD Scopes

| Scope | Required For |
|---|---|
| `workflow` | Updating or triggering GitHub Actions workflow files. Required if pushing changes to files under `.github/workflows/` or triggering `workflow_dispatch` events. |

> **Note:** Classic PAT `repo` scope already covers reading/writing issues, pull requests, repository content, and Pages settings. The `workflow` scope is only needed on top of `repo` if you intend to modify workflow files or trigger workflows directly.

---

## Summary: Minimum Permissions by Use Case

| Use Case | Fine-Grained PAT | Classic PAT |
|---|---|---|
| Clone / read repository | `contents: read` | `repo` (or `public_repo`) |
| Push code | `contents: read/write` | `repo` |
| Open and manage issues | `issues: read/write` | `repo` |
| Open and manage pull requests | `pull_requests: read/write` | `repo` |
| All of the above (typical developer) | `contents` + `issues` + `pull_requests` (all read/write) | `repo` |
| Trigger deploy workflow (`workflow_dispatch`) | + `actions: read/write` | + `workflow` |
| Publish CI test results | + `checks: read/write` | `repo` (included) |
| Deploy to GitHub Pages | + `pages: read/write` | `repo` (included) |
