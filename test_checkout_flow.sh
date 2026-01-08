#!/bin/bash

# Test Checkout with AI-Selected Items Flow
# This script tests the complete shopping flow from AI chat to checkout

echo "========================================="
echo "TEST: AI Chat → Checkout Flow"
echo "========================================="

# Configuration
PYTHON_SERVICE_URL="http://localhost:8000"
SPRING_SERVICE_URL="http://localhost:8080"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test credentials
TEST_EMAIL="customer@test.com"
TEST_PASSWORD="password123"

echo ""
echo "Step 1: Login to get auth token..."
LOGIN_RESPONSE=$(curl -s -X POST "${SPRING_SERVICE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

AUTH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$AUTH_TOKEN" == "null" ] || [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Token: ${AUTH_TOKEN:0:20}..."

echo ""
echo "========================================="
echo "Step 2: Simulate AI chat conversation"
echo "========================================="

# Message 1: Ask about product
echo ""
echo "User: 'tôi muốn mua iPhone 15'"
CHAT_RESPONSE_1=$(curl -s -X POST "${PYTHON_SERVICE_URL}/api/groq/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "message": "tôi muốn mua iPhone 15"
  }')

echo "AI Response:"
echo $CHAT_RESPONSE_1 | jq -r '.response' | head -n 5
echo ""

# Check for ADD_TO_CART action
ACTIONS=$(echo $CHAT_RESPONSE_1 | jq '.actions')
if [ "$ACTIONS" != "null" ]; then
  echo -e "${YELLOW}Actions detected:${NC}"
  echo $ACTIONS | jq '.'
fi

echo ""
echo "----------------------------------------"
echo "User: '2 chiếc'"
CHAT_RESPONSE_2=$(curl -s -X POST "${PYTHON_SERVICE_URL}/api/groq/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "message": "2 chiếc"
  }')

echo "AI Response:"
echo $CHAT_RESPONSE_2 | jq -r '.response' | head -n 5
echo ""

ACTIONS=$(echo $CHAT_RESPONSE_2 | jq '.actions')
if [ "$ACTIONS" != "null" ]; then
  echo -e "${YELLOW}Actions detected:${NC}"
  echo $ACTIONS | jq '.'
fi

echo ""
echo "----------------------------------------"
echo "User: 'dùng mã SAVE10 và thanh toán'"
CHAT_RESPONSE_3=$(curl -s -X POST "${PYTHON_SERVICE_URL}/api/groq/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "message": "dùng mã SAVE10 và thanh toán"
  }')

echo "AI Response:"
echo $CHAT_RESPONSE_3 | jq -r '.response'
echo ""

ACTIONS=$(echo $CHAT_RESPONSE_3 | jq '.actions')
if [ "$ACTIONS" != "null" ]; then
  echo -e "${YELLOW}Actions detected:${NC}"
  echo $ACTIONS | jq '.'
  
  # Check for CHECKOUT_WITH_ITEMS action
  CHECKOUT_ACTION=$(echo $ACTIONS | jq '.[] | select(.type == "CHECKOUT_WITH_ITEMS")')
  if [ ! -z "$CHECKOUT_ACTION" ] && [ "$CHECKOUT_ACTION" != "null" ]; then
    echo ""
    echo -e "${GREEN}✓ CHECKOUT_WITH_ITEMS action found!${NC}"
    echo ""
    echo "Items to checkout:"
    echo $CHECKOUT_ACTION | jq '.items'
    echo ""
    echo "Discount code:"
    echo $CHECKOUT_ACTION | jq '.discountCode'
    echo ""
    echo "Total amount:"
    echo $CHECKOUT_ACTION | jq '.total'
  else
    echo -e "${RED}❌ CHECKOUT_WITH_ITEMS action NOT found${NC}"
  fi
fi

echo ""
echo "========================================="
echo "Step 3: Verify cart (should be separate)"
echo "========================================="

CART_RESPONSE=$(curl -s -X GET "${PYTHON_SERVICE_URL}/api/agent/cart" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

echo "Current cart:"
echo $CART_RESPONSE | jq '.cart.items[] | {productId: .productId, productName: .productName, quantity: .quantity}'

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "Expected behavior:"
echo "1. ✓ AI should detect product request (iPhone 15)"
echo "2. ✓ AI should ask for quantity"
echo "3. ✓ AI should detect quantity (2 chiếc)"
echo "4. ✓ AI should ask about discount/checkout"
echo "5. ✓ AI should detect CHECKOUT_WITH_ITEMS action"
echo "6. ✓ Action should contain ONLY AI-selected items (not full cart)"
echo "7. ✓ Frontend should show checkout with these specific items"
echo ""
echo "Frontend action handler should:"
echo "- Receive CHECKOUT_WITH_ITEMS action"
echo "- Extract items array (productId, productName, price, quantity)"
echo "- Extract discountCode if provided"
echo "- Open order confirmation dialog with ONLY these items"
echo "- Ignore other items in existing cart"
echo ""
