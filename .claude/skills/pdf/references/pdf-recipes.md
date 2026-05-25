# PDF Recipes

## Reading PDFs

### Read tool (preferred for small docs)

```
Read file_path="/path/to/document.pdf" pages="1-10"
```

### pdftotext (poppler)

```bash
# Basic extraction
pdftotext /path/to/input.pdf /path/to/output.txt

# Preserve layout, output to stdout
pdftotext -layout /path/to/input.pdf -

# Extract specific pages
pdftotext -f 1 -l 5 /path/to/input.pdf -
```

### pdfminer (Python)

```python
from pdfminer.high_level import extract_text

text = extract_text("/path/to/document.pdf")
print(text)
```

## Generating PDFs

### weasyprint (HTML to PDF)

```python
from weasyprint import HTML

html_content = """
<html>
<head><style>
  body { font-family: Arial; margin: 2cm; }
  h1 { color: #333; }
</style></head>
<body>
  <h1>Exult Healthcare PLLC</h1>
  <p>McKinney, TX</p>
  <hr>
  <p>Document content here.</p>
</body>
</html>
"""
HTML(string=html_content).write_pdf("output.pdf")
```

### reportlab (programmatic)

```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

c = canvas.Canvas("output.pdf", pagesize=letter)
width, height = letter
c.setFont("Helvetica-Bold", 16)
c.drawString(72, height - 72, "Exult Healthcare PLLC")
c.setFont("Helvetica", 12)
c.drawString(72, height - 92, "McKinney, TX")
c.line(72, height - 100, width - 72, height - 100)
c.drawString(72, height - 130, "Document content here.")
c.save()
```

### pandoc (markdown to PDF)

```bash
pandoc input.md -o output.pdf --pdf-engine=weasyprint
```

## Gotchas

- Large PDFs: always specify page ranges (pages="1-20") when reading.
- Scanned/image PDFs need OCR (tesseract), not pdftotext.
- PHI in PDFs: process in /Users/agent/pi-mono/.pi/services/amd/, don't leave copies elsewhere.
- Font embedding: ensure fonts are available when generating with weasyprint/reportlab.
