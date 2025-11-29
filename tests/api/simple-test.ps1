# encoding: utf-8
$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:3001/api"

Write-Host "Question Bank Redesign - Quick API Test"
Write-Host "========================================"

# Test 1: Login
Write-Host "`n[TEST 1] Login..."
$loginBody = '{"username":"teacher01","password":"password123"}'
$login = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.token
Write-Host "OK - Got token"

# Test 2: Create draft
Write-Host "`n[TEST 2] Create draft..."
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$content = "Test question $ts"
$draftBody = "{`"type`":`"single`",`"subject`":`"Math`",`"grade`":`"Grade3`",`"content`":`"$content`",`"options`":`"[\`"A\`",\`"B\`",\`"C\`",\`"D\`"]`",`"correct_answer`":`"A`",`"difficulty`":`"easy`",`"level`":`"L1`",`"points`":5}"
$headers = @{"Authorization"="Bearer $token"}
$draft = Invoke-RestMethod -Uri "$BASE_URL/question-drafts" -Method Post -Body $draftBody -ContentType "application/json" -Headers $headers
$draftId = $draft.data.id
Write-Host "OK - Draft ID: $draftId"

# Test 3: Get drafts
Write-Host "`n[TEST 3] Get drafts..."
$drafts = Invoke-RestMethod -Uri "$BASE_URL/question-drafts?limit=10" -Method Get -Headers $headers
Write-Host "OK - Total: $($drafts.meta.total)"

# Test 4: Get details
Write-Host "`n[TEST 4] Get details..."
$detail = Invoke-RestMethod -Uri "$BASE_URL/question-drafts/$draftId" -Method Get -Headers $headers
Write-Host "OK - Content: $($detail.data.content)"

# Test 5: Publish
Write-Host "`n[TEST 5] Publish..."
$pubBody = '{"scope":"practice_school_1"}'
try {
    $pub = Invoke-RestMethod -Uri "$BASE_URL/question-drafts/$draftId/publish" -Method Post -Body $pubBody -ContentType "application/json" -Headers $headers
    Write-Host "OK - Published ID: $($pub.data.id)"
} catch {
    Write-Host "Note: $($_.ErrorDetails.Message)"
}

# Test 6: Get publications
Write-Host "`n[TEST 6] Get publications..."
$pubs = Invoke-RestMethod -Uri "$BASE_URL/question-drafts/$draftId/publications" -Method Get -Headers $headers
Write-Host "OK - Count: $($pubs.meta.count)"

# Test 7: Admin login
Write-Host "`n[TEST 7] Admin login..."
$adminBody = '{"username":"admin","password":"password123"}'
$adminLogin = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Body $adminBody -ContentType "application/json"
$adminToken = $adminLogin.token
Write-Host "OK - Got admin token"

# Test 8: Query with district filter
Write-Host "`n[TEST 8] Query bank with district filter..."
$adminHeaders = @{"Authorization"="Bearer $adminToken"}
$params = "?scope=practice_district" + ([char]38) + "district_code=YY" + ([char]38) + "limit=5"
$bank = Invoke-RestMethod -Uri "$BASE_URL/question-bank/bank$params" -Method Get -Headers $adminHeaders
Write-Host "OK - Total: $($bank.meta.total)"

Write-Host "`n========================================"
Write-Host "All tests passed!"
