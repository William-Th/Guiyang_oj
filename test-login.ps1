$body = @{
    username = "admin"
    password = "password123"
    loginType = "username"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    Write-Output "Login successful:"
    $response | ConvertTo-Json
} catch {
    Write-Output "Error:"
    Write-Output $_.Exception.Message
    Write-Output "Status Code: $($_.Exception.Response.StatusCode.value__)"
}
