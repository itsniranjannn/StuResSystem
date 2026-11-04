$here = Split-Path -Parent $MyInvocation.MyCommand.Path; $doc = Split-Path -Parent $here
Set-Location $here
node build_report.mjs
powershell -NoProfile -File word_pdf.ps1 -Docx "$doc\Anka_Project_Report.docx" -Pdf "$doc\Anka_Project_Report.pdf"
node paginate.mjs
node build_report.mjs
powershell -NoProfile -File word_pdf.ps1 -Docx "$doc\Anka_Project_Report.docx" -Pdf "$doc\Anka_Project_Report.pdf"
node paginate.mjs
node build_report.mjs
powershell -NoProfile -File word_pdf.ps1 -Docx "$doc\Anka_Project_Report.docx" -Pdf "$doc\Anka_Project_Report.pdf"
node paginate.mjs
