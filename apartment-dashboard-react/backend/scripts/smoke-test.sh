#!/usr/bin/env bash
set -euo pipefail

# Simple smoke test: register (or login), create a task, list tasks, mark done
# Requirements: curl, jq

BASE_URL=${BASE_URL:-http://localhost:3000}
APARTMENT_CODE=${APARTMENT_CODE:-GP412}

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this script. Install it (brew install jq) and rerun." >&2
  exit 1
fi

echo "==> Health check"
curl -s "$BASE_URL/api/health" | jq . || true

STAMP=$(date +%s)
USERNAME="smoketest_$STAMP"
PASSWORD="secret123"
EMAIL="smoketest+$STAMP@example.com"

echo "\n==> Register user ($USERNAME)"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"email\":\"$EMAIL\",\"apartmentCode\":\"$APARTMENT_CODE\"}")
echo "$REGISTER_RESPONSE" | jq .

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "\n==> Register failed or user exists. Attempting login..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"apartmentCode\":\"$APARTMENT_CODE\"}")
  echo "$LOGIN_RESPONSE" | jq .
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
fi

if [ -z "$TOKEN" ]; then
  echo "\n❌ Failed to obtain auth token. Exiting." >&2
  exit 1
fi

echo "\n==> Verify current user (/api/auth/me)"
curl -s "$BASE_URL/api/auth/me" -H "Authorization: Bearer $TOKEN" | jq .

TASK_NAME="Test Task $STAMP"
echo "\n==> Create task: $TASK_NAME"
CREATE_TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$TASK_NAME\",\"assignedTo\":\"$USERNAME\",\"frequencyDays\":2,\"notes\":\"smoke test\",\"pinned\":true,\"active\":true}")
echo "$CREATE_TASK_RESPONSE" | jq .

TASK_ID=$(echo "$CREATE_TASK_RESPONSE" | jq -r '._id // empty')

echo "\n==> List tasks"
curl -s "$BASE_URL/api/tasks" -H "Authorization: Bearer $TOKEN" | jq '. | map({id: ._id, name: .name, lastDone: .lastDone})'

if [ -n "$TASK_ID" ]; then
  echo "\n==> Mark task done ($TASK_ID)"
  curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/done" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"completedBy\":\"$USERNAME\"}" | jq '{id: ._id, name: .name, lastDone: .lastDone, lastCompletedBy: .lastCompletedBy}'
fi

echo "\n✅ Smoke test completed"


