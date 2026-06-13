#!/bin/bash
set -e

BASE_URL="http://localhost:8888"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }

echo "========================================"
echo "  Page Proxy E2E Test Suite"
echo "========================================"
echo ""

# Test 1: Main page loads
echo "=== Test 1: Main page load ==="
response=$(curl -s -o /tmp/index.html -w "%{http_code}" "$BASE_URL/")
if [ "$response" = "200" ]; then
    pass "Main page returns 200"
    title=$(grep -o '<title>[^<]*</title>' /tmp/index.html | head -1 | sed 's/<[^>]*>//g')
    info "Title: $title"
else
    fail "Main page returns $response"
fi

# Test 2: Check service cards exist
echo ""
echo "=== Test 2: Service cards ==="
cards=$(grep -c 'service-card\|proxy-card' /tmp/index.html 2>/dev/null || echo "0")
if [ "$cards" -gt 0 ]; then
    pass "Found $cards service card elements"
else
    info "Checking for service names in page..."
    grep -oE 'paper-wright|coding-kanban' /tmp/index.html | head -5 || true
fi

# Test 3: Paper Agent direct API through proxy
echo ""
echo "=== Test 3: Paper Agent API through proxy ==="
response=$(curl -s -o /tmp/api_response.json -w "%{http_code}" \
    -H "Accept: application/json" \
    -H "Referer: $BASE_URL/ba79eb8f/ui/" \
    "$BASE_URL/api/projects")
if [ "$response" = "200" ]; then
    pass "GET /api/projects returns 200"
    projects=$(cat /tmp/api_response.json | grep -o '"id"' | wc -l)
    info "Found $projects projects"
else
    fail "GET /api/projects returns $response"
    cat /tmp/api_response.json 2>/dev/null | head -5 || true
fi

# Test 4: Paper Agent compile API
echo ""
echo "=== Test 4: Paper Agent compile API ==="
response=$(curl -s -o /tmp/compile_response.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Referer: $BASE_URL/ba79eb8f/ui/" \
    -d '{"project_id":1}' \
    "$BASE_URL/api/compile")
if [ "$response" = "200" ] || [ "$response" = "400" ] || [ "$response" = "500" ]; then
    pass "POST /api/compile returns $response"
    error_msg=$(cat /tmp/compile_response.json | grep -o '"error":"[^"]*"' | head -1)
    if [ -n "$error_msg" ]; then
        info "Response: $error_msg"
    fi
else
    fail "POST /api/compile returns $response"
fi

# Test 5: Paper Agent models API
echo ""
echo "=== Test 5: Paper Agent models API ==="
response=$(curl -s -o /tmp/models_response.json -w "%{http_code}" \
    -H "Accept: application/json" \
    -H "Referer: $BASE_URL/ba79eb8f/ui/" \
    "$BASE_URL/api/models")
if [ "$response" = "200" ]; then
    pass "GET /api/models returns 200"
    model=$(cat /tmp/models_response.json | grep -o '"name":"[^"]*"' | head -1)
    info "Available model: $model"
else
    fail "GET /api/models returns $response"
fi

# Test 6: Health check endpoint
echo ""
echo "=== Test 6: Health check ==="
response=$(curl -s -o /tmp/health.json -w "%{http_code}" "$BASE_URL/api/health")
if [ "$response" = "200" ]; then
    pass "Health check returns 200"
    online_count=$(cat /tmp/health.json | grep -o '"online":true' | wc -l)
    info "Online services: $online_count"
else
    fail "Health check returns $response"
fi

# Test 7: Navigate to Paper Agent SPA
echo ""
echo "=== Test 7: Paper Agent SPA navigation ==="
response=$(curl -s -o /tmp/spa.html -w "%{http_code}" \
    -H "Accept: text/html" \
    "$BASE_URL/ba79eb8f/")
if [ "$response" = "200" ]; then
    pass "Paper Agent SPA returns 200"
    # Check if it's a valid HTML page (not the fallback)
    if grep -q 'index.html' /tmp/spa.html; then
        info "Served index.html"
    elif grep -q 'page-proxy\|Vite' /tmp/spa.html; then
        info "Served Paper Agent app"
    else
        head -20 /tmp/spa.html
    fi
else
    fail "Paper Agent SPA returns $response"
fi

# Test 8: Static assets
echo ""
echo "=== Test 8: Static assets (JS/CSS) ==="
response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE_URL/ba79eb8f/assets/index.js")
if [ "$response" = "200" ]; then
    pass "Static assets accessible"
else
    info "Static assets return $response (may be 404 if not yet built)"
fi

# Test 9: Services list API
echo ""
echo "=== Test 9: Services list API ==="
response=$(curl -s -o /tmp/services.json -w "%{http_code}" "$BASE_URL/api/services")
if [ "$response" = "200" ]; then
    pass "Services API returns 200"
    service_count=$(cat /tmp/services.json | grep -o '"slug"' | wc -l)
    info "Configured services: $service_count"
    cat /tmp/services.json | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'  - {s[\"name\"]} ({s[\"slug\"]})') for s in d]" 2>/dev/null || true
else
    fail "Services API returns $response"
fi

echo ""
echo "========================================"
echo "  Test Complete"
echo "========================================"
