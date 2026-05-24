---
description: "Use when reading PDFs, extracting text from faxes or medical documents, or generating PDF letters and reports."
allowed-tools:
  - Bash(python3 *)
  - Bash(pdftotext *)
  - Bash(pandoc *)
  - Read
  - Write
---

# /pdf -- PDF Operations

## Reading PDFs

### Option 1: Read Tool (preferred for small docs)
The Read tool natively supports PDFs up to 20 pages. Specify `pages` parameter for large files.

### Option 2: pdftotext (poppler)
For text extraction when you need raw text output:
```bash
pdftotext /path/to/input.pdf /path/to/output.txt
pdftotext -layout /path/to/input.pdf -  # preserve layout, stdout
```

### Option 3: Python (pdfplumber)
For structured extraction (tables, coordinates):
```python
import pdfplumber
with pdfplumber.open("input.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        tables = page.extract_tables()
```

## Generating PDFs

### WeasyPrint (HTML to PDF)
Best for styled documents with CSS:
```python
from weasyprint import HTML
HTML(string=html_content).write_pdf("output.pdf")
```

### ReportLab (Programmatic)
Best for precise layout control:
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
c = canvas.Canvas("output.pdf", pagesize=letter)
c.drawString(72, 700, "Exult Healthcare PLLC")
c.save()
```

### Pandoc (Markdown to PDF)
Best for text-heavy documents:
```bash
pandoc input.md -o output.pdf --pdf-engine=weasyprint
```

## Gotchas

- **Large PDFs.** Always specify page ranges when reading PDFs over 10 pages. Reading a full large PDF will fail.
- **Scanned documents.** pdftotext and Read tool won't extract text from scanned/image PDFs. You'd need OCR (tesseract).
- **PHI in PDFs.** Fax PDFs and medical documents contain PHI. Process them in `~/claude-workspace/data/amd_phi/` and don't leave copies elsewhere.
- **Font embedding.** When generating PDFs with WeasyPrint or ReportLab, ensure fonts are available on the system.

## Reference Docs

See `references/pdf-recipes.md` for detailed code examples.
