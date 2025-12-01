# Assessment Registration API Tests using PowerShell
# Test assessment registration functionality

$BASE_URL = "http://localhost:3001/api"
$ADMIN_TOKEN = ""
$STUDENT_TOKEN = ""
$TEST_ACTIVITY_ID = ""
$TEST_LOCATION_ID = ""

Write-Host "`n========================================"
Write-Host "   Assessment Registration API Tests"
Write-Host "========================================`n"

# Function to make API calls
function Invoke-API {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = $null,
        [string]$Token = $null
    )

    $headers = @{
        "Content-Type" = "application/json"
    }

    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $params = @{
        Uri = "$BASE_URL$Endpoint"
        Method = $Method
        Headers = $headers
        UseBasicParsing = $true
    }

    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    }
    catch {
        $errorMsg = $_.Exception.Message
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            return @{ Success = $false; Error = $errorBody.message; Status = $_.Exception.Response.StatusCode }
        }
        catch {
            return @{ Success = $false; Error = $errorMsg }
        }
    }
}

Write-Host "=== Testing Login ==="

# Admin login
$result = Invoke-API -Method "POST" -Endpoint "/auth/login" -Body @{
    username = "admin"
    password = "password123"
}

if ($result.Success -and $result.Data.token) {
    $ADMIN_TOKEN = $result.Data.token
    Write-Host "[OK] Admin login successful" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Admin login failed: $($result.Error)" -ForegroundColor Red
    exit 1
}

# Student login
$result = Invoke-API -Method "POST" -Endpoint "/auth/login" -Body @{
    username = "13800138003"
    password = "password123"
}

if ($result.Success -and $result.Data.token) {
    $STUDENT_TOKEN = $result.Data.token
    Write-Host "[OK] Student login successful" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Student login failed: $($result.Error)" -ForegroundColor Red
}

Write-Host "`n=== Finding Test Activity ==="

$result = Invoke-API -Method "GET" -Endpoint "/activities?type=assessment" -Token $ADMIN_TOKEN

# Handle both response formats (data or activities)
$activities = if ($result.Data.data) { $result.Data.data } elseif ($result.Data.activities) { $result.Data.activities } else { $null }

if ($result.Success -and $activities -and $activities.Count -gt 0) {
    $TEST_ACTIVITY_ID = $activities[0].id
    $activity = $activities[0]
    Write-Host "[OK] Found test activity: ID=$TEST_ACTIVITY_ID, Title=$($activity.title), AbilityLevel=$($activity.ability_level), Status=$($activity.status)" -ForegroundColor Green
} else {
    Write-Host "[WARN] No assessment activities found" -ForegroundColor Yellow
    Write-Host "Response: $($result.Data | ConvertTo-Json -Depth 2)"
}

Write-Host "`n=== Testing Location API ==="

if ($TEST_ACTIVITY_ID) {
    # Get locations for activity
    Write-Host "Getting locations for activity $TEST_ACTIVITY_ID..."
    $result = Invoke-API -Method "GET" -Endpoint "/activities/$TEST_ACTIVITY_ID/locations" -Token $ADMIN_TOKEN

    if ($result.Success) {
        $locCount = if ($result.Data.data) { $result.Data.data.Count } else { 0 }
        Write-Host "[OK] Got $locCount locations" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Failed to get locations: $($result.Error)" -ForegroundColor Red
    }

    # Create a new location
    Write-Host "`nCreating a new test location..."
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $result = Invoke-API -Method "POST" -Endpoint "/activities/$TEST_ACTIVITY_ID/locations" -Token $ADMIN_TOKEN -Body @{
        name = "Test Location $timestamp"
        address = "Test Address 123"
        capacity = 30
        contact_name = "Test Teacher"
        contact_phone = "13800000001"
        exam_date = "2025-12-15"
        exam_time_start = "09:00"
        exam_time_end = "11:00"
        check_in_time = "08:30"
        notes = "API test location"
    }

    if ($result.Success -and $result.Data.data.id) {
        $TEST_LOCATION_ID = $result.Data.data.id
        Write-Host "[OK] Location created: ID=$TEST_LOCATION_ID" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Location creation result: $($result.Error)" -ForegroundColor Yellow
        # Check if it's because activity doesn't require location
        if ($result.Error -match "require|not supported|L[123]") {
            Write-Host "Activity might not require location (L1-L3 online assessment)" -ForegroundColor Cyan
        }
    }

    # If we have a location, test update
    if ($TEST_LOCATION_ID) {
        Write-Host "`nUpdating location..."
        $result = Invoke-API -Method "PUT" -Endpoint "/locations/$TEST_LOCATION_ID" -Token $ADMIN_TOKEN -Body @{
            capacity = 40
            notes = "Updated test location"
        }

        if ($result.Success) {
            Write-Host "[OK] Location updated successfully" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] Location update failed: $($result.Error)" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Testing Student Registration API ==="

if ($TEST_ACTIVITY_ID -and $STUDENT_TOKEN) {
    # Check eligibility
    Write-Host "Checking eligibility..."
    $result = Invoke-API -Method "GET" -Endpoint "/activities/$TEST_ACTIVITY_ID/registration/eligibility" -Token $STUDENT_TOKEN

    if ($result.Success) {
        $eligible = $result.Data.eligible
        if ($eligible) {
            Write-Host "[OK] Student is eligible to register" -ForegroundColor Green
        } else {
            Write-Host "[INFO] Student is not eligible: $($result.Data.reason)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "[FAIL] Eligibility check failed: $($result.Error)" -ForegroundColor Red
    }

    # Try to register
    Write-Host "`nAttempting registration..."
    $regBody = @{}
    if ($TEST_LOCATION_ID) {
        $regBody["location_id"] = $TEST_LOCATION_ID
    }

    $result = Invoke-API -Method "POST" -Endpoint "/activities/$TEST_ACTIVITY_ID/register" -Token $STUDENT_TOKEN -Body $regBody

    if ($result.Success) {
        Write-Host "[OK] Registration successful" -ForegroundColor Green
        Write-Host "Registration ID: $($result.Data.data.id)"
    } else {
        Write-Host "[INFO] Registration result: $($result.Error)" -ForegroundColor Cyan
    }

    # Get student's registrations
    Write-Host "`nGetting student's registrations..."
    $result = Invoke-API -Method "GET" -Endpoint "/assessments/my-registrations" -Token $STUDENT_TOKEN

    if ($result.Success) {
        $regCount = if ($result.Data.data) { $result.Data.data.Count } else { 0 }
        Write-Host "[OK] Student has $regCount registrations" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Failed to get registrations: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host "`n=== Testing Admin Registration Management ==="

if ($TEST_ACTIVITY_ID) {
    # Get all registrations for activity
    Write-Host "Getting all registrations for activity..."
    $result = Invoke-API -Method "GET" -Endpoint "/activities/$TEST_ACTIVITY_ID/registrations" -Token $ADMIN_TOKEN

    if ($result.Success) {
        $regCount = if ($result.Data.data) { $result.Data.data.Count } else { 0 }
        Write-Host "[OK] Activity has $regCount registrations" -ForegroundColor Green

        if ($result.Data.statistics) {
            Write-Host "Statistics: $($result.Data.statistics | ConvertTo-Json -Compress)"
        }
    } else {
        Write-Host "[FAIL] Failed to get registrations: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host "`n=== Cleanup ==="

if ($TEST_LOCATION_ID) {
    Write-Host "Deleting test location $TEST_LOCATION_ID..."

    # First try to cancel any registrations
    if ($STUDENT_TOKEN) {
        $null = Invoke-API -Method "POST" -Endpoint "/activities/$TEST_ACTIVITY_ID/register/cancel" -Token $STUDENT_TOKEN -Body @{}
    }

    $result = Invoke-API -Method "DELETE" -Endpoint "/locations/$TEST_LOCATION_ID" -Token $ADMIN_TOKEN

    if ($result.Success) {
        Write-Host "[OK] Location deleted" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Location deletion: $($result.Error)" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================"
Write-Host "   Tests Completed"
Write-Host "========================================`n"
