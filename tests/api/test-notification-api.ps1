# Test Notification API
$BaseUrl = "http://localhost:3001/api"

Write-Host "=== Testing Notification API ===" -ForegroundColor Cyan

# Step 1: Login as student
Write-Host "`n[1] Logging in as student..." -ForegroundColor Yellow
$loginBody = @{
    username = "13800138003"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$studentToken = $loginResponse.token
Write-Host "Student login successful!" -ForegroundColor Green

$studentHeaders = @{
    Authorization = "Bearer $studentToken"
}

# Step 2: Get unread count
Write-Host "`n[2] Getting unread notification count..." -ForegroundColor Yellow
try {
    $unreadCount = Invoke-RestMethod -Uri "$BaseUrl/notifications/unread-count" -Method Get -Headers $studentHeaders
    Write-Host "Unread count: notifications=$($unreadCount.count.notifications), announcements=$($unreadCount.count.announcements), total=$($unreadCount.count.total)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Step 3: Get notifications list
Write-Host "`n[3] Getting notifications list..." -ForegroundColor Yellow
try {
    $notifications = Invoke-RestMethod -Uri "$BaseUrl/notifications" -Method Get -Headers $studentHeaders
    Write-Host "Total notifications: $($notifications.pagination.total)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Step 4: Get announcements
Write-Host "`n[4] Getting announcements..." -ForegroundColor Yellow
try {
    $announcements = Invoke-RestMethod -Uri "$BaseUrl/notifications/announcements" -Method Get -Headers $studentHeaders
    Write-Host "Total announcements: $($announcements.pagination.total)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Step 5: Login as admin
Write-Host "`n[5] Logging in as admin..." -ForegroundColor Yellow
$adminLoginBody = @{
    username = "admin"
    password = "password123"
} | ConvertTo-Json

$adminLoginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $adminLoginBody
$adminToken = $adminLoginResponse.token
Write-Host "Admin login successful!" -ForegroundColor Green

$adminHeaders = @{
    Authorization = "Bearer $adminToken"
}

# Step 6: Create a test announcement
Write-Host "`n[6] Creating test announcement..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$announcementBody = @{
    title = "Test Announcement - $timestamp"
    content = "This is a test announcement content for notification system verification."
    summary = "Test announcement summary"
    type = "notice"
    target_audience = "all"
    is_pinned = $false
    is_popup = $false
} | ConvertTo-Json

try {
    $newAnnouncement = Invoke-RestMethod -Uri "$BaseUrl/notifications/admin/announcements" -Method Post -ContentType "application/json" -Headers $adminHeaders -Body $announcementBody
    Write-Host "Announcement created! ID: $($newAnnouncement.announcement.id)" -ForegroundColor Green
    $announcementId = $newAnnouncement.announcement.id
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    $announcementId = $null
}

# Step 7: Publish the announcement
if ($announcementId) {
    Write-Host "`n[7] Publishing announcement..." -ForegroundColor Yellow
    try {
        $publishedAnnouncement = Invoke-RestMethod -Uri "$BaseUrl/notifications/admin/announcements/$announcementId/publish" -Method Put -Headers $adminHeaders
        Write-Host "Announcement published! Status: $($publishedAnnouncement.announcement.status)" -ForegroundColor Green
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 8: Get announcements as student again
Write-Host "`n[8] Getting announcements as student again..." -ForegroundColor Yellow
try {
    $announcements2 = Invoke-RestMethod -Uri "$BaseUrl/notifications/announcements" -Method Get -Headers $studentHeaders
    Write-Host "Total announcements after publish: $($announcements2.pagination.total)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 9: Mark announcement as read
if ($announcementId) {
    Write-Host "`n[9] Marking announcement as read..." -ForegroundColor Yellow
    try {
        $readResult = Invoke-RestMethod -Uri "$BaseUrl/notifications/announcements/$announcementId/read" -Method Put -Headers $studentHeaders
        Write-Host "Mark as read result: $($readResult.success)" -ForegroundColor Green
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 10: Get notification templates
Write-Host "`n[10] Getting notification templates..." -ForegroundColor Yellow
try {
    $templates = Invoke-RestMethod -Uri "$BaseUrl/notifications/admin/templates" -Method Get -Headers $adminHeaders
    Write-Host "Total templates: $($templates.templates.Count)" -ForegroundColor Green
    $templates.templates | ForEach-Object {
        Write-Host "  - [$($_.code)] $($_.name)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
