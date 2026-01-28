#!/bin/bash
# Script to commit and push Railway security fix

echo "Committing Railway security vulnerability fix..."
git add web/package.json package-lock.json .railwayignore
git commit -m "Fix security vulnerability: update Next.js to 14.2.35 for Railway deployment"
echo ""
echo "✅ Changes committed!"
echo ""
echo "Next step: Push to trigger Railway rescan"
echo "Run: git push"
echo ""
echo "After pushing, Railway should rescan and the security error should be resolved."


