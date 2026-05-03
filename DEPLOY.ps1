# ============================================================
#  Sisi Pisi Hotel - Deploy rapid pe site
#  Ruleaza dupa orice modificare in fisierele site-ului
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sisi Pisi Hotel - Upload modificari" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica daca exista modificari
$status = git status --porcelain
if (-not $status) {
    Write-Host "  Nicio modificare. Site-ul este deja la zi." -ForegroundColor Yellow
    Write-Host ""
    Start-Sleep -Seconds 2
    exit 0
}

Write-Host "  Uploading toate modificarile..." -ForegroundColor Yellow

$mesaj = "Update $(Get-Date -Format 'dd.MM.yyyy HH:mm')"

git add .
git commit -m "$mesaj" | Out-Null
$pushResult = git push 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCES! Site actualizat." -ForegroundColor Green
    Write-Host "  https://sisipisihotel.netlify.app" -ForegroundColor Green
    Write-Host "  (activ in ~30 secunde)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  EROARE:" -ForegroundColor Red
    Write-Host $pushResult -ForegroundColor Red
    Read-Host "Apasa Enter pentru a inchide"
    exit 1
}

Write-Host ""
Start-Sleep -Seconds 3
