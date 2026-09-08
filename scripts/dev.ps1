# Internet Treasure Hunts — Local Development Helper
# Run from repo root: .\scripts\dev.ps1

Write-Host "🗝️  Internet Treasure Hunts — Dev Setup" -ForegroundColor Yellow
Write-Host ""

# 1. Check .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠  .env.local not found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "   Edit .env.local before continuing." -ForegroundColor Cyan
}

# 2. Install frontend deps
Write-Host "📦  Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install --silent
Set-Location ..

# 3. Install Foundry deps (if forge is available)
if (Get-Command forge -ErrorAction SilentlyContinue) {
    Write-Host "🔨  Installing Foundry libraries..." -ForegroundColor Cyan
    Set-Location contracts
    if (-not (Test-Path "lib/openzeppelin-contracts")) {
        forge install OpenZeppelin/openzeppelin-contracts --no-commit
    }
    if (-not (Test-Path "lib/chainlink")) {
        forge install smartcontractkit/chainlink --no-commit
    }
    Set-Location ..
} else {
    Write-Host "⚠  forge not found. Install Foundry: https://book.getfoundry.sh/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅  Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Start Anvil:        anvil" -ForegroundColor Cyan
Write-Host "  2. Deploy contracts:   cd contracts && forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" -ForegroundColor Cyan
Write-Host "  3. Run frontend:       cd frontend && npm run dev" -ForegroundColor Cyan
Write-Host ""
