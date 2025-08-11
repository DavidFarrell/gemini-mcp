#!/bin/bash

echo "🔍 Gemini MCP Server Diagnostics"
echo "================================"

echo ""
echo "1. Checking if server file exists:"
if [ -f "build/index.js" ]; then
    echo "   ✅ Server file exists"
else
    echo "   ❌ Server file missing"
fi

echo ""
echo "2. Checking environment:"
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    if grep -q "GEMINI_API_KEY=AIzaSy" .env; then
        echo "   ✅ API key is set"
    else
        echo "   ❌ API key not found in .env"
    fi
else
    echo "   ❌ .env file missing"
fi

echo ""
echo "3. Testing server startup:"
timeout 5s node build/index.js < /dev/null 2>&1 | head -5

echo ""
echo "4. Server info:"
echo "   Path: $(realpath build/index.js)"
echo "   Size: $(du -h build/index.js | cut -f1)"
echo "   Node version: $(node --version)"

echo ""
echo "5. Quick API test:"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | timeout 10s node build/index.js | head -3