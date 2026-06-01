# Rippling Document Editor Fielding

## Stable Labels

Use these Rippling labels when replacing source placeholders:

| Source marker | Rippling field |
| --- | --- |
| `[[EFFECTIVE_DATE_OPENING]]` | Document variable: `Start date / Effective date` |
| `[[FULL_NAME_OPENING]]` | Document variable: `Full name` |
| `[[EFFECTIVE_DATE_SIGNATURE]]` | Document variable: `Start date / Effective date` |
| `[[FULL_NAME_SIGNATURE]]` | Document variable: `Full name` |
| `[[EMPLOYEE_SIGNATURE]]` | Recipient field: `Signature` |
| `[[EMPLOYEE_SIGNATURE_DATE]]` | Recipient field: `Signature date` |
| `[[COMPANY_SIGNATURE]]` | Document variable: `Company signatory signature` |
| `[[COMPANY_SIGNATORY_NAME]]` | Document variable: `Company signatory name` |
| `[[COMPANY_SIGNATORY_TITLE]]` | Document variable: `Company signatory title` |
| `[[COMPANY_SIGNATORY_DATE]]` | Document variable: `Company signatory date signed` |

## Automation Pattern

Use the Chrome plugin against the user's logged-in tab. The editor is Lexical-based, and direct DOM selection is unreliable in the Chrome plugin evaluate context. Prefer real cursor placement and normal editor button clicks.

1. Import clean DOCX with literal `[[...]]` markers.
2. For inline opening fields, click before the first marker, insert the document variable, press Delete for the marker length, move the cursor with ArrowRight to the next marker, insert the next variable, then delete that marker.
3. For signature-table markers, scroll the marker into view, click the start of the marker text, click the matching field button, then press Delete for the marker length.
4. For recipient fields, add the employee/contractor recipient first; then click `Recipient fields > Signature` or `Recipient fields > Signature date`.
5. Verify with DOM inspection:
   - Document variables: `[data-node="p-variable"]`
   - Recipient signer fields: `[data-node="p-recipient-form-field"]`
   - Raw markers: regex `\[\[[^\]]+\]\]` against editor text

## Current BAA Pattern

The Exult/MDPA BAA import files used this run were generated as clean DOCX files with:

- Times New Roman 11 pt body text
- Centered `BUSINESS ASSOCIATE AGREEMENT` title
- No logo or source-document decorative styling
- Two-column signature table
- Entity-specific covered entity names:
  - `EXULT HEALTHCARE SOLUTIONS LLC`
  - `DEEPIKA BHARGAVA M.D.P.A.`

Publishing was required for persistence: leaving and reopening an unpublished draft restored only the shell, not the imported body and fields.
