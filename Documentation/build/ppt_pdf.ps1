param([string]$Pptx, [string]$Pdf)
$app = New-Object -ComObject PowerPoint.Application
try { $pres = $app.Presentations.Open($Pptx, $true, $false, $false); $pres.SaveAs($Pdf, 32); $pres.Close() } finally { $app.Quit() }
