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

# Detecteaza comanda Python disponibila pe sistem
$pyCmd = $null
foreach ($cmd in @("py", "python", "python3")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python") {
            $pyCmd = $cmd
            break
        }
    } catch {}
}

if ($pyCmd) {
    Write-Host "  Python detectat: $pyCmd" -ForegroundColor Yellow

    # Verifica si instaleaza deep-translator daca lipseste
    & $pyCmd -c "import deep_translator" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Instalare deep-translator..." -ForegroundColor Yellow
        & $pyCmd -m pip install deep-translator -q 2>$null
    }

    # Ruleaza sincronizarea i18n
    Write-Host "  Sincronizare i18n.js cu HTML (RO + EN + HU)..." -ForegroundColor Yellow
    & $pyCmd sync-i18n.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ATENTIE: sync-i18n.py a esuat. Continui deploy fara sincronizare." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Python negasit. Sincronizarea i18n.js este sarita." -ForegroundColor Yellow
    Write-Host "  Instaleaza Python de la https://python.org pentru traduceri automate." -ForegroundColor Yellow
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
