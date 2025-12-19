#!/bin/bash
# Test admin chat endpoints

echo "=== Testing Admin Chat Endpoints ==="
echo ""

# Test chat stats
echo "1. Testing GET /api/admin/chat-stats"
curl -X GET http://localhost:8000/api/admin/chat-stats 2>/dev/null | python -m json.tool
echo ""
echo ""

# Test populate test data
echo "2. Testing POST /api/admin/test-data/populate"
curl -X POST http://localhost:8000/api/admin/test-data/populate 2>/dev/null | python -m json.tool
echo ""
echo ""

# Test users chat history (after populate)
echo "3. Testing GET /api/admin/users-chat-history"
curl -X GET http://localhost:8000/api/admin/users-chat-history 2>/dev/null | python -m json.tool
echo ""
echo ""

# Test chroma collections
echo "4. Testing GET /api/admin/chroma-collections"
curl -X GET http://localhost:8000/api/admin/chroma-collections 2>/dev/null | python -m json.tool
echo ""
echo ""

echo "=== All tests completed ==="
