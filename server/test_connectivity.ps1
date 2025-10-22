Write-Host "=== Testing Server Connectivity ==="

Write-Host "`n1. Testing basic server response:"
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -TimeoutSec 5
    Write-Host "Status: $($response.StatusCode)"
} catch {
    Write-Host "Connection failed: $($_.Exception.Message)"
}

Write-Host "`n2. Testing coordinator login:"
try {
    $body = @{
        email = "markivan.night@gmail.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/coordinator/auth/login" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 5
    
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Login failed: $($_.Exception.Message)"
}

Write-Host "`n3. Testing service approvals endpoint:"
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/coordinator/service-approvals" -TimeoutSec 5
    Write-Host "Status: $($response.StatusCode) (expected 401 without auth)"
} catch {
    Write-Host "Test request result: $($_.Exception.Message)"
}