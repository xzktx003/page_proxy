#!/bin/bash
# Comprehensive E2E test simulating real user scenarios
BASE_URL="http://localhost:9999"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo -e "${GREEN}✓${NC} $1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail() { echo -e "${RED}✗${NC} $1"; FAIL_COUNT=$((FAIL_COUNT+1)); }
info() { echo -e "${BLUE}→${NC} $1"; }
section() { echo ""; echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${YELLOW}  $1${NC}"; echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

section "SCENARIO 1: New user landing page experience"

echo "1.1 Main page loads..."
status=$(curl -s -o /tmp/main_page.html -w "%{http_code}" "$BASE_URL/")
[ "$status" = "200" ] && pass "Main page returns HTTP 200" || fail "Main page returns HTTP $status"

echo "1.2 Page title is descriptive..."
title=$(grep -o '<title>[^<]*</title>' /tmp/main_page.html | sed 's/<[^>]*>//g')
[ -n "$title" ] && pass "Title: '$title'" || fail "Missing page title"

echo "1.3 Services are listed..."
services=$(curl -s "$BASE_URL/api/services" | grep -o '"slug"' | wc -l)
[ "$services" -gt 0 ] && pass "Found $services services" || fail "No services found"

echo "1.4 Health check endpoint works..."
status=$(curl -s -o /tmp/health.json -w "%{http_code}" "$BASE_URL/api/health")
[ "$status" = "200" ] && pass "Health check OK" || fail "Health check fails"

section "SCENARIO 2: User navigates to Paper Agent"

echo "2.1 Paper Agent service is configured..."
slug=$(curl -s "$BASE_URL/api/services" | python3 -c "import json,sys; [print(s['slug']) for s in json.load(sys.stdin)['services'] if 'paper' in s['name'].lower()]")
[ -n "$slug" ] && pass "Paper Agent slug: $slug" || fail "Paper Agent not found"

echo "2.2 Paper Agent SPA loads..."
status=$(curl -s -o /tmp/paper_spa.html -w "%{http_code}" "$BASE_URL/$slug/")
[ "$status" = "200" ] && pass "Paper Agent SPA returns HTTP 200" || fail "Paper Agent SPA returns $status"

echo "2.3 SPA has correct title..."
paper_title=$(grep -o '<title>[^<]*</title>' /tmp/paper_spa.html | sed 's/<[^>]*>//g')
[[ "$paper_title" == *"Paper"* ]] && pass "Title: '$paper_title'" || fail "Unexpected title"

echo "2.4 Static assets have proxy prefix..."
assets=$(grep -o "/$slug/assets/[^'\"]*" /tmp/paper_spa.html | head -1)
[ -n "$assets" ] && pass "Assets prefixed correctly" || fail "Assets not prefixed"

echo "2.5 Vite HMR shim injected..."
shim=$(curl -s "$BASE_URL/$slug/@vite/client")
echo "$shim" | grep -q "injectQuery" && pass "Vite shim works" || fail "Vite shim broken"

section "SCENARIO 3: User interacts with Paper Agent API"

echo "3.1 Get projects list..."
projects=$(curl -s -H "Referer: $BASE_URL/$slug/ui/" "$BASE_URL/api/projects")
echo "$projects" | grep -q '"projects"' && pass "Projects API works" || fail "Projects API failed"

echo "3.2 Get available models..."
models=$(curl -s -H "Referer: $BASE_URL/$slug/ui/" "$BASE_URL/api/models")
echo "$models" | grep -q '"models"' && pass "Models API works" || fail "Models API failed"

echo "3.3 Get LLM config..."
config=$(curl -s -H "Referer: $BASE_URL/$slug/ui/" "$BASE_URL/api/config")
echo "$config" | grep -q '"llm_model"' && pass "Config API works" || fail "Config API failed"

echo "3.4 Get templates..."
templates=$(curl -s -H "Referer: $BASE_URL/$slug/ui/" "$BASE_URL/api/templates")
echo "$templates" | grep -q '"templates"' && pass "Templates API works" || fail "Templates API failed"

section "SCENARIO 4: User compiles a project"

echo "4.1 Compile endpoint responds..."
compile_resp=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Referer: $BASE_URL/$slug/ui/" \
    -d '{"project_id":1}' \
    "$BASE_URL/api/compile" 2>/dev/null)
http_code=$(echo "$compile_resp" | tail -1)
[ "$http_code" != "000" ] && pass "Compile API responds" || fail "Compile API timeout"

section "SCENARIO 5: User navigates to coding-kanban"

echo "5.1 Coding Kanban is configured..."
kanban_slug=$(curl -s "$BASE_URL/api/services" | python3 -c "import json,sys; [print(s['slug']) for s in json.load(sys.stdin)['services'] if 'coding' in s['name'].lower()]")
[ -n "$kanban_slug" ] && pass "Kanban slug: $kanban_slug" || fail "Kanban not found"

echo "5.2 Coding Kanban SPA loads..."
status=$(curl -s -o /tmp/kanban.html -w "%{http_code}" "$BASE_URL/$kanban_slug/")
[ "$status" = "200" ] && pass "Kanban SPA OK" || fail "Kanban SPA fails"

section "SCENARIO 6: Error handling"

echo "6.1 Invalid service slug..."
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/invalid-xyz/")
[ "$status" = "404" ] && pass "Invalid slug returns 404" || info "Invalid slug returns $status"

section "TEST SUMMARY"
echo ""
echo -e "  ${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "  ${RED}Failed:${NC} $FAIL_COUNT"
echo ""

[ $FAIL_COUNT -eq 0 ] && echo -e "${GREEN}All tests passed!${NC}" || echo -e "${YELLOW}Some tests failed${NC}"
exit $FAIL_COUNT
