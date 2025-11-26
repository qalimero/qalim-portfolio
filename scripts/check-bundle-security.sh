#!/bin/bash

# 🔒 Script de vérification de sécurité du bundle
# Vérifie qu'aucune variable secrète n'est exposée dans le code client

set -e

echo "🔍 Security Bundle Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build directory
DIST_DIR="./front/dist/client"

if [ ! -d "$DIST_DIR" ]; then
  echo -e "${YELLOW}⚠️  Distribution directory not found${NC}"
  echo "Run 'npm run build' first in the front directory"
  exit 1
fi

echo "📦 Checking bundle in: $DIST_DIR"
echo ""

# Patterns to search for (secrets that should NEVER be in client code)
# Use word boundaries to avoid false positives from minified code
DANGEROUS_PATTERNS=(
  "STRAPI_URL="
  "API_TOKEN="
  "JWT_SECRET="
  "ADMIN_JWT="
  "APP_KEYS="
  "DATABASE_PASSWORD="
  "DATABASE_USERNAME="
  "import\.meta\.env\.STRAPI_URL"
  "process\.env\.JWT_SECRET"
  "TOKEN_SALT="
)

ISSUES_FOUND=0

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  echo -n "Checking for: $pattern... "
  
  # Search in all JS files
  if grep -r "$pattern" "$DIST_DIR" --include="*.js" --include="*.mjs" 2>/dev/null | grep -v "sourceMappingURL" > /dev/null; then
    echo -e "${RED}❌ FOUND${NC}"
    echo "  ⚠️  This pattern was found in the client bundle!"
    grep -rn "$pattern" "$DIST_DIR" --include="*.js" --include="*.mjs" | grep -v "sourceMappingURL" | head -3
    echo ""
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  else
    echo -e "${GREEN}✓ Safe${NC}"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ Bundle is secure!${NC}"
  echo "No sensitive data found in client code."
  exit 0
else
  echo -e "${RED}❌ Security issues found: $ISSUES_FOUND${NC}"
  echo "Please review the bundle and ensure no secrets are exposed."
  exit 1
fi
