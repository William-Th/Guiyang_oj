#!/bin/bash
# Assessment Registration API Tests using curl
# 测评报名功能API测试

BASE_URL="http://localhost:3001/api"
ADMIN_TOKEN=""
TEACHER_TOKEN=""
STUDENT_TOKEN=""
TEST_ACTIVITY_ID=""
TEST_LOCATION_ID=""

echo "========================================"
echo "   Assessment Registration API Tests"
echo "========================================"
echo ""

# Login as admin
echo "=== Testing Login ==="
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ADMIN_TOKEN" ]; then
  echo "✅ Admin login successful"
else
  echo "❌ Admin login failed"
  echo "Response: $ADMIN_RESPONSE"
  exit 1
fi

# Login as teacher
TEACHER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher01","password":"password123"}')

TEACHER_TOKEN=$(echo $TEACHER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TEACHER_TOKEN" ]; then
  echo "✅ Teacher login successful"
else
  echo "❌ Teacher login failed"
fi

# Login as student
STUDENT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138003","password":"password123"}')

STUDENT_TOKEN=$(echo $STUDENT_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$STUDENT_TOKEN" ]; then
  echo "✅ Student login successful"
else
  echo "❌ Student login failed"
  echo "Response: $STUDENT_RESPONSE"
fi

echo ""
echo "=== Finding Test Activity ==="
ACTIVITIES_RESPONSE=$(curl -s -X GET "$BASE_URL/activities?type=assessment" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

# Try to extract first activity ID
TEST_ACTIVITY_ID=$(echo $ACTIVITIES_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$TEST_ACTIVITY_ID" ]; then
  echo "✅ Found test activity ID: $TEST_ACTIVITY_ID"
else
  echo "⚠️ No assessment activities found"
  echo "Response: $ACTIVITIES_RESPONSE"
fi

echo ""
echo "=== Testing Location API ==="

if [ -n "$TEST_ACTIVITY_ID" ]; then
  # Get locations for activity
  echo "Getting locations for activity $TEST_ACTIVITY_ID..."
  LOCATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/activities/$TEST_ACTIVITY_ID/locations" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  echo "Locations response: $LOCATIONS_RESPONSE"

  # Create a new location
  echo ""
  echo "Creating a new test location..."
  TIMESTAMP=$(date +%s)
  CREATE_LOCATION_RESPONSE=$(curl -s -X POST "$BASE_URL/activities/$TEST_ACTIVITY_ID/locations" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"测试测评点-$TIMESTAMP\",
      \"address\": \"贵阳市云岩区测试路123号\",
      \"capacity\": 30,
      \"contact_name\": \"张老师\",
      \"contact_phone\": \"13800000001\",
      \"exam_date\": \"2025-12-15\",
      \"exam_time_start\": \"09:00\",
      \"exam_time_end\": \"11:00\",
      \"check_in_time\": \"08:30\",
      \"notes\": \"API测试创建的测评点\"
    }")
  echo "Create location response: $CREATE_LOCATION_RESPONSE"

  # Extract location ID
  TEST_LOCATION_ID=$(echo $CREATE_LOCATION_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -n "$TEST_LOCATION_ID" ]; then
    echo "✅ Location created with ID: $TEST_LOCATION_ID"
  else
    echo "⚠️ Location creation may have failed (could be expected if activity doesn't require location)"
  fi
fi

echo ""
echo "=== Testing Student Registration API ==="

if [ -n "$TEST_ACTIVITY_ID" ] && [ -n "$STUDENT_TOKEN" ]; then
  # Check eligibility
  echo "Checking eligibility..."
  ELIGIBILITY_RESPONSE=$(curl -s -X GET "$BASE_URL/activities/$TEST_ACTIVITY_ID/registration/eligibility" \
    -H "Authorization: Bearer $STUDENT_TOKEN")
  echo "Eligibility response: $ELIGIBILITY_RESPONSE"

  # Try to register
  echo ""
  echo "Attempting registration..."
  if [ -n "$TEST_LOCATION_ID" ]; then
    REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/activities/$TEST_ACTIVITY_ID/register" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"location_id\": $TEST_LOCATION_ID}")
  else
    REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/activities/$TEST_ACTIVITY_ID/register" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{}")
  fi
  echo "Registration response: $REGISTER_RESPONSE"

  # Get student's registrations
  echo ""
  echo "Getting student's registrations..."
  MY_REGISTRATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/assessments/my-registrations" \
    -H "Authorization: Bearer $STUDENT_TOKEN")
  echo "My registrations: $MY_REGISTRATIONS_RESPONSE"
fi

echo ""
echo "=== Testing Admin Registration Management ==="

if [ -n "$TEST_ACTIVITY_ID" ]; then
  # Get all registrations for activity
  echo "Getting all registrations for activity..."
  ADMIN_REGISTRATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/activities/$TEST_ACTIVITY_ID/registrations" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  echo "Admin registrations response: $ADMIN_REGISTRATIONS_RESPONSE"
fi

echo ""
echo "=== Cleanup ==="

if [ -n "$TEST_LOCATION_ID" ]; then
  echo "Deleting test location $TEST_LOCATION_ID..."
  DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/locations/$TEST_LOCATION_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  echo "Delete response: $DELETE_RESPONSE"
fi

echo ""
echo "========================================"
echo "   Tests Completed"
echo "========================================"
