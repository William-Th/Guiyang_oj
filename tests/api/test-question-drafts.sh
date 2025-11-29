#!/bin/bash

BASE_URL="http://localhost:3001/api"

echo "============================================================"
echo "Question Bank Redesign - API Tests (via curl)"
echo "============================================================"

# Test 1: Login as teacher
echo -e "\n[TEST 1] Login as teacher..."
TEACHER_RESPONSE=$(wget -qO- --post-data='{"username":"teacher01","password":"password123"}' \
  --header='Content-Type: application/json' \
  ${BASE_URL}/auth/login 2>&1)

TEACHER_TOKEN=$(echo "$TEACHER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TEACHER_TOKEN" ]; then
  echo "✅ Teacher login successful"
  echo "   Token: ${TEACHER_TOKEN:0:50}..."
else
  echo "❌ Teacher login failed"
  echo "   Response: $TEACHER_RESPONSE"
  exit 1
fi

# Test 2: Login as admin
echo -e "\n[TEST 2] Login as admin..."
ADMIN_RESPONSE=$(wget -qO- --post-data='{"username":"admin","password":"password123"}' \
  --header='Content-Type: application/json' \
  ${BASE_URL}/auth/login 2>&1)

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
  echo "✅ Admin login successful"
  echo "   Token: ${ADMIN_TOKEN:0:50}..."
else
  echo "❌ Admin login failed"
  exit 1
fi

# Test 3: Create a draft
echo -e "\n[TEST 3] Create a draft question..."
TIMESTAMP=$(date +%s)
DRAFT_DATA="{\"type\":\"single_choice\",\"subject\":\"数学\",\"grade\":\"三年级\",\"content\":\"【测试-${TIMESTAMP}】3+5=?\",\"options\":\"[\\\"6\\\",\\\"7\\\",\\\"8\\\",\\\"9\\\"]\",\"correct_answer\":\"8\",\"difficulty\":\"easy\",\"level\":\"K1\",\"points\":5,\"explanation\":\"测试\"}"

CREATE_RESPONSE=$(wget -qO- --post-data="$DRAFT_DATA" \
  --header="Content-Type: application/json" \
  --header="Authorization: Bearer $TEACHER_TOKEN" \
  ${BASE_URL}/question-drafts 2>&1)

DRAFT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$DRAFT_ID" ]; then
  echo "✅ Draft created successfully, ID: $DRAFT_ID"
else
  echo "❌ Create draft failed"
  echo "   Response: $CREATE_RESPONSE"
  exit 1
fi

# Test 4: Get my drafts
echo -e "\n[TEST 4] Get my drafts..."
DRAFTS_RESPONSE=$(wget -qO- \
  --header="Authorization: Bearer $TEACHER_TOKEN" \
  "${BASE_URL}/question-drafts?limit=5" 2>&1)

TOTAL=$(echo "$DRAFTS_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)

if [ -n "$TOTAL" ]; then
  echo "✅ Got drafts list, total: $TOTAL"
else
  echo "❌ Get drafts failed"
  exit 1
fi

# Test 5: Get draft details
echo -e "\n[TEST 5] Get draft details..."
DETAIL_RESPONSE=$(wget -qO- \
  --header="Authorization: Bearer $TEACHER_TOKEN" \
  "${BASE_URL}/question-drafts/${DRAFT_ID}" 2>&1)

CONTENT=$(echo "$DETAIL_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CONTENT" ]; then
  echo "✅ Got draft details"
  echo "   Content: $CONTENT"
else
  echo "❌ Get draft details failed"
  exit 1
fi

# Test 6: Publish to school scope
echo -e "\n[TEST 6] Publish draft to school scope..."
PUBLISH_DATA='{"scope":"practice_school_1"}'

PUBLISH_RESPONSE=$(wget -qO- --post-data="$PUBLISH_DATA" \
  --header="Content-Type: application/json" \
  --header="Authorization: Bearer $TEACHER_TOKEN" \
  "${BASE_URL}/question-drafts/${DRAFT_ID}/publish" 2>&1)

PUB_ID=$(echo "$PUBLISH_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$PUB_ID" ]; then
  echo "✅ Published successfully, publication ID: $PUB_ID"
else
  echo "❌ Publish failed"
  echo "   Response: $PUBLISH_RESPONSE"
fi

# Test 7: Get publications
echo -e "\n[TEST 7] Get publication records..."
PUBS_RESPONSE=$(wget -qO- \
  --header="Authorization: Bearer $TEACHER_TOKEN" \
  "${BASE_URL}/question-drafts/${DRAFT_ID}/publications" 2>&1)

PUB_COUNT=$(echo "$PUBS_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ -n "$PUB_COUNT" ]; then
  echo "✅ Got publication records, count: $PUB_COUNT"
else
  echo "❌ Get publications failed"
fi

# Test 8: Query question bank (admin with district filter)
echo -e "\n[TEST 8] Query district questions (admin with filter)..."
BANK_RESPONSE=$(wget -qO- \
  --header="Authorization: Bearer $ADMIN_TOKEN" \
  "${BASE_URL}/question-bank/bank?scope=practice_district&district_code=YY&limit=5" 2>&1)

BANK_TOTAL=$(echo "$BANK_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)

if [ -n "$BANK_TOTAL" ]; then
  echo "✅ Got question bank, total: $BANK_TOTAL"
  echo "   District filter applied: YY"
else
  echo "❌ Query question bank failed"
  echo "   Response: ${BANK_RESPONSE:0:200}"
fi

# Test 9: Update draft
echo -e "\n[TEST 9] Update draft..."
UPDATE_DATA="{\"content\":\"【更新-${TIMESTAMP}】3+5=?\",\"difficulty\":\"medium\"}"

UPDATE_RESPONSE=$(wget -qO- --method=PUT --body-data="$UPDATE_DATA" \
  --header="Content-Type: application/json" \
  --header="Authorization: Bearer $TEACHER_TOKEN" \
  "${BASE_URL}/question-drafts/${DRAFT_ID}" 2>&1)

NEW_DIFF=$(echo "$UPDATE_RESPONSE" | grep -o '"difficulty":"[^"]*"' | cut -d'"' -f4)

if [ "$NEW_DIFF" = "medium" ]; then
  echo "✅ Draft updated successfully"
  echo "   New difficulty: $NEW_DIFF"
else
  echo "⚠️  Update may have issues"
  echo "   Response: ${UPDATE_RESPONSE:0:200}"
fi

echo -e "\n============================================================"
echo "API Tests Completed"
echo "============================================================"
