#!/bin/bash
# Guest Chat System - Quick Start Script
# Run this to get started in 2 minutes!

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          🚀 Guest Chat + Keyword Tagging System Setup             ║"
echo "║                     Quick Start Guide                              ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed. Exiting."
    exit 1
fi

echo "✅ Dependencies installed!"
echo ""

# Step 2: Create .env file
echo "🔧 Step 2: Setting up environment..."
if [ ! -f .env.local ]; then
    cat > .env.local << EOF
# Guest Chat Server URL
VITE_SOCKET_URL=http://localhost:3001

# Gemini API Key (get from https://aistudio.google.com)
VITE_GEMINI_API_KEY=your_key_here
EOF
    echo "✅ Created .env.local (edit with your API key)"
else
    echo "⚠️  .env.local already exists (skipped)"
fi
echo ""

# Step 3: Show start instructions
echo "🎯 Step 3: Ready to start!"
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                       NEXT STEPS                                    ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║                                                                    ║"
echo "║  1️⃣  In Terminal 1 - Start the Backend Server:                    ║"
echo "║     npm run server:dev                                             ║"
echo "║     📍 Server: http://localhost:3001                               ║"
echo "║                                                                    ║"
echo "║  2️⃣  In Terminal 2 - Start the Frontend:                          ║"
echo "║     npm run dev                                                    ║"
echo "║     📍 Frontend: http://localhost:5173                             ║"
echo "║                                                                    ║"
echo "║  3️⃣  Click \"Guest Chat\" button to start chatting!                ║"
echo "║                                                                    ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║  📖 Documentation:                                                 ║"
echo "║  • README.md - Project overview                                   ║"
echo "║  • GUEST_CHAT_SETUP.md - Complete setup guide                    ║"
echo "║                                                                    ║"
echo "║  💡 Tips:                                                          ║"
echo "║  • Edit keywords: server/config/keywords.txt                       ║"
echo "║  • Customize server: server/index.js                               ║"
echo "║  • Create AI personas: constants.ts                                ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Ready? Open two terminals and start the services!"
echo ""
