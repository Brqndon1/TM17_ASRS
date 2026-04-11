# Batch Import Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-file drag-and-drop import with a review screen and sequential execution across all supported import tables.

**Architecture:** Keep the existing import API unchanged for single-table preview/execute. Add a small shared batch helper module for filename inference and dependency ordering, and update the import page to stage many files, preview each one, and execute the batch sequentially.

**Tech Stack:** Next.js app router, React client component state, existing import API, Vitest

---

### Task 1: Add batch helper tests

**Files:**
- Create: `src/lib/import-batch.test.js`

- [ ] **Step 1: Write failing tests for filename inference, ordering, and totals**
- [ ] **Step 2: Run Vitest and confirm the new tests fail**

### Task 2: Implement batch helper module

**Files:**
- Create: `src/lib/import-batch.js`
- Test: `src/lib/import-batch.test.js`

- [ ] **Step 1: Implement minimal helper functions to satisfy the failing tests**
- [ ] **Step 2: Re-run the targeted tests and confirm they pass**

### Task 3: Update the import page for multi-file staging and review

**Files:**
- Modify: `src/app/admin/import/page.js`
- Modify: `src/lib/import-batch.js`

- [ ] **Step 1: Add multi-file selection and drag-drop support**
- [ ] **Step 2: Preview each staged file using the existing import preview endpoint**
- [ ] **Step 3: Replace single-file preview with batch review UI**
- [ ] **Step 4: Execute staged files sequentially in dependency order**

### Task 4: Verify the feature

**Files:**
- Verify: `src/lib/import-batch.test.js`
- Verify: `src/app/admin/import/page.js`

- [ ] **Step 1: Run targeted tests**
- [ ] **Step 2: Run the broader import-related test suite or project test command**
- [ ] **Step 3: Review the UI logic for regressions in the single-file path**
