---
name: rippling-documents
description: "Use when setting up Rippling Documents templates from DOC/DOCX source files, including multi-recipient agreements, document variables, employee/contractor recipients, signature fields, and publish validation."
allowed-tools:
  - Read
  - Grep
  - Glob
---

# /rippling documents

## Overview

Use this child skill for Rippling document-template setup. It is separate from payroll/timecard API work. Drive the logged-in Rippling admin session in Chrome, and treat `Publish` as the commit point because imported editor content and fields may not persist when leaving an unpublished template.

## Workflow

1. Find the reference template first when style matters. For Exult agreements, use `Consulting/1099 Agreement & NDA` as the plain style reference: unbranded, Times New Roman 11 pt body, centered title, numbered clauses, no logo.
2. Prepare a clean `.docx` import file before opening Rippling. Remove logos and heavy styling. Use visible placeholder markers such as `[[EFFECTIVE_DATE_OPENING]]`, `[[FULL_NAME_OPENING]]`, and signature-block markers.
3. In Rippling, go to `Documents > Templates > Create > Create a template > Start from scratch > Multi-recipient template`.
4. Set `Document name` before import. Use stable names such as `BAA - EXULT HEALTHCARE SOLUTIONS LLC`.
5. Click `Import`, upload the `.docx`, and confirm the import. Reimporting replaces editor content, which is useful for clearing test fields or failed insertions.
6. Open `Recipients`, search `employee`, and select `Add employee/contractor as recipient`. Do this before adding signature fields; otherwise `Signature` and `Signature date` buttons are disabled.
7. Replace every plain marker with the corresponding Rippling field:
   - Employee prefill: `Full name`
   - Effective date: `Start date / Effective date`
   - Employee signer fields: recipient `Signature`, recipient `Signature date`
   - Company prefill fields: `Company signatory signature`, `Company signatory name`, `Company signatory title`, `Company signatory date signed`
8. Validate before publishing:
   - No raw `[[...]]` markers remain.
   - The correct covered entity text is present and the wrong entity text is absent.
   - Expected document variables exist.
   - Expected recipient fields exist.
9. Publish only after the user authorizes publication or the user explicitly requested publishing. After publish, verify the template appears in `Documents > Templates > Active`.

## Editor Notes

Read `references/editor-fielding.md` when field placement is fragile, placeholders split oddly after import, or the Chrome plugin needs a more deterministic sequence.

## Stop Rules

- Stop before publishing if validation fails, the template name is wrong, the wrong entity appears in the body, or signer fields cannot be enabled.
- Stop before using direct API writes unless the request explicitly calls for API-level work and the payload schema has been verified from current Rippling code or current API responses.
- Do not treat an unpublished editor draft as saved evidence. Reopen or publish-then-list to verify persistence.
