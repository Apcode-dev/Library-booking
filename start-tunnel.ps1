# Script to run Cloudflare Tunnel safely without Error 1033
Write-Host "🧹 Stopping any existing cloudflared background processes..." -ForegroundColor Yellow
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🚀 Starting Cloudflare Tunnel for http://127.0.0.1:5173 ..." -ForegroundColor Green
& "F:\OneDrive\Desktop\lib\cloudflared.exe" tunnel --edge-ip-version 4 --protocol http2 --url http://127.0.0.1:5173
