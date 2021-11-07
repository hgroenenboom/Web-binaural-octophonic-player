Push-Location $PSScriptRoot

start powershell {php -S localhost:8000}
start "http://localhost:8000"

Pop-Location
