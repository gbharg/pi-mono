# Word Document Recipes (python-docx)

## Basic document creation

```python
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Header
header = doc.add_paragraph()
header.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = header.add_run("Exult Healthcare PLLC")
run.bold = True
run.font.size = Pt(16)

subheader = doc.add_paragraph()
subheader.alignment = WD_ALIGN_PARAGRAPH.CENTER
subheader.add_run("McKinney, TX")

doc.add_paragraph()  # spacer
```

## Referral letter template

```python
from docx import Document
from docx.shared import Pt
from datetime import date

doc = Document()
style = doc.styles["Normal"]
style.font.name = "Arial"
style.font.size = Pt(11)

doc.add_paragraph("Exult Healthcare PLLC").bold = True
doc.add_paragraph("McKinney, TX")
doc.add_paragraph(f"Date: {date.today().strftime('%B %d, %Y')}")
doc.add_paragraph()

doc.add_paragraph(f"RE: Patient Referral")
doc.add_paragraph()
doc.add_paragraph("Dear Doctor,")
doc.add_paragraph()
doc.add_paragraph("I am writing to refer the above patient for evaluation...")
doc.add_paragraph()
doc.add_paragraph("Sincerely,")
doc.add_paragraph("Exult Healthcare PLLC")

doc.save("referral_letter.docx")
```

## Adding tables

```python
table = doc.add_table(rows=3, cols=3)
table.style = "Table Grid"

# Header row
hdr = table.rows[0].cells
hdr[0].text = "Date"
hdr[1].text = "Service"
hdr[2].text = "Notes"

# Data rows
row1 = table.rows[1].cells
row1[0].text = "2026-04-01"
row1[1].text = "Initial Evaluation"
row1[2].text = "Completed"
```

## Gotchas

- Save all generated docs to ~/claude-workspace/reports/.
- Standard header: always include "Exult Healthcare PLLC, McKinney TX".
- python-docx cannot read .doc (old format) -- only .docx.
- For PDF conversion after creating .docx, use: libreoffice --headless --convert-to pdf file.docx
