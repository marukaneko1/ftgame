#!/bin/bash
# Script to run Railway migrations

echo "🚀 Railway Migration Script"
echo "=========================="
echo ""

# Check if logged in
if ! railway whoami &>/dev/null; then
    echo "📝 Step 1: Login to Railway"
    echo "This will open a browser window..."
    railway login
    echo ""
fi

echo "🔗 Step 2: Link to your project"
echo "Select: lovely-luck project"
echo "Select: @omegle-game/api service"
railway link
echo ""

echo "📊 Step 3: Running database migrations..."
cd api
railway run npx prisma migrate deploy
echo ""

echo "👤 Step 4: Creating admin user..."
railway run node create-admin.js admin@example.com admin123
echo ""

echo "✅ Done! Your database is set up."
echo ""
echo "Test your API:"
echo "curl https://omegle-gameapi-production.up.railway.app/api/auth/health"


