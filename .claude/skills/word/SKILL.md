---
name: word
description: "Use when creating clinical letters, referral documents, patient summaries, or any .docx files."
allowed-tools:
  - Bash(python3 *)
  - Read
  - Write
---

# /word -- Word Document Operations

## Library

Uses `python-docx` for all .docx creation and editing.

## Standard Header

All Exult Healthcare documents use this header:

```
Exult Healthcare PLLC
McKinney, TX
```

## Core Operations

### Create a Clinical Letter

```python
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from datetime import date

def create_clinical_letter(patient_name, provider_name, body_paragraphs, output_path):
    doc = Document()

    # Header
    header = doc.add_paragraph()
    header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = header.add_run("Exult Healthcare PLLC")
    run.bold = True
    run.font.size = Pt(16)
    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.add_run("McKinney, TX").font.size = Pt(10)

    # Date
    date_para = doc.add_paragraph()
    date_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    date_para.add_run(date.today().strftime("%B %d, %Y"))

    # Patient reference
    doc.add_paragraph(f"RE: {patient_name}")
    doc.add_paragraph()

    # Body
    for para_text in body_paragraphs:
        doc.add_paragraph(para_text)

    # Signature block
    doc.add_paragraph()
    doc.add_paragraph("Sincerely,")
    doc.add_paragraph()
    doc.add_paragraph(provider_name)
    doc.add_paragraph("Exult Healthcare PLLC")

    doc.save(output_path)
```

### Create a Document with a Table

```python
def create_table_document(title, headers, rows, output_path):
    doc = Document()

    # Header
    header = doc.add_paragraph()
    header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = header.add_run("Exult Healthcare PLLC")
    run.bold = True
    run.font.size = Pt(14)

    doc.add_heading(title, level=2)

    # Table
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"

    # Header row
    for i, h in enumerate(headers):
        table.rows[0].cells[i].text = h

    # Data rows
    for row_data in rows:
        row = table.add_row()
        for i, val in enumerate(row_data):
            row.cells[i].text = str(val)

    doc.save(output_path)
```

## Gotchas

- **Always include the Exult Healthcare header.** Every document generated for clinic use needs the standard header.
- **PHI in documents.** Patient-specific documents should be saved to `/Users/agent/pi-mono/.pi/services/amd/` or a clearly labeled output directory (see [`INDEX.md`](../INDEX.md)).
- **Font availability.** python-docx uses system fonts. Stick to standard fonts (Arial, Times New Roman, Calibri).
- **Template reuse.** For recurring document types (referral letters, treatment summaries), check if a template already exists before creating from scratch.
- **Page breaks.** Use `doc.add_page_break()` between sections in multi-page documents.

## Reference Docs

See `references/docx-recipes.md` for additional patterns including headers/footers, images, and styles.
