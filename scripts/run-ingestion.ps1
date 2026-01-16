# Script PowerShell para executar ingestão de dados históricos
# Aguarda o servidor estar pronto antes de executar

param(
    [int]$Months = 12,
    [string]$Parks = "",
    [string]$BaseUrl = "http://localhost:3000"
)

$CronSecret = $env:CRON_SECRET

if ([string]::IsNullOrEmpty($CronSecret)) {
    Write-Host "Erro: CRON_SECRET não definido" -ForegroundColor Red
    Write-Host "Defina a variável de ambiente CRON_SECRET:"
    Write-Host "  `$env:CRON_SECRET = '35e14f04d15110575b8dcf7c2f097fc764bc51e43681a5de069b9fbfbf69b5bf'"
    exit 1
}

Write-Host "Aguardando servidor estar pronto..." -ForegroundColor Yellow
$MaxAttempts = 30
$Attempt = 0
$ServerReady = $false

while ($Attempt -lt $MaxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Servidor está pronto!" -ForegroundColor Green
            $ServerReady = $true
            break
        }
    } catch {
        # Servidor ainda não está pronto
        $Attempt++
        Write-Host "Tentativa $Attempt/$MaxAttempts - aguardando servidor..."
        if ($Attempt -lt $MaxAttempts) {
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $ServerReady) {
    Write-Host "Erro: Servidor não está respondendo após $MaxAttempts tentativas" -ForegroundColor Red
    Write-Host "Certifique-se de que o servidor está rodando: npm run dev"
    exit 1
}

$Url = "$BaseUrl/api/admin/ingest-historical-data?months=$Months"
if (-not [string]::IsNullOrEmpty($Parks)) {
    $Url += "&parks=$Parks"
}

Write-Host ""
Write-Host "Iniciando ingestão de dados históricos..." -ForegroundColor Cyan
Write-Host "URL: $Url"
Write-Host "Meses: $Months"
if (-not [string]::IsNullOrEmpty($Parks)) {
    Write-Host "Parques: $Parks"
} else {
    Write-Host "Parques: Todos"
}
Write-Host ""

# Executa ingestão
try {
    $headers = @{
        "Authorization" = "Bearer $CronSecret"
        "Content-Type" = "application/json"
    }
    
    Write-Host "Executando ingestão..." -ForegroundColor Yellow
    $ingestionResult = Invoke-RestMethod -Uri $Url -Method POST -Headers $headers
    Write-Host "Resultado da ingestão:" -ForegroundColor Green
    $ingestionResult | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro na ingestão: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Aguardando 5 segundos antes de processar estatísticas..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Processa estatísticas por hora
Write-Host ""
Write-Host "Processando estatísticas por hora..." -ForegroundColor Cyan
try {
    $hourlyResult = Invoke-RestMethod -Uri "$BaseUrl/api/cron/aggregate_hourly" -Method GET -Headers $headers
    Write-Host "Resultado das estatísticas por hora:" -ForegroundColor Green
    $hourlyResult | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro ao processar estatísticas por hora: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Aguardando 5 segundos antes de processar estatísticas diárias..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Processa estatísticas diárias
Write-Host ""
Write-Host "Processando estatísticas diárias..." -ForegroundColor Cyan
try {
    $dailyResult = Invoke-RestMethod -Uri "$BaseUrl/api/cron/aggregate_daily" -Method GET -Headers $headers
    Write-Host "Resultado das estatísticas diárias:" -ForegroundColor Green
    $dailyResult | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro ao processar estatísticas diárias: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Processo concluído!" -ForegroundColor Green
