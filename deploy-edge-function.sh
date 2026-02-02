#!/bin/bash

# ============================================
# Deploy Edge Function with API Key Secrets
# ============================================

set -e

echo "🚀 Deploying Edge Function with API Key Rotation..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with your API keys"
    exit 1
fi

# Load environment variables
source .env

# Check if at least one API key is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: GEMINI_API_KEY not set in .env"
    exit 1
fi

echo "📝 Setting Supabase secrets..."

# Set all available API keys as secrets
if [ ! -z "$GEMINI_API_KEY" ]; then
    echo "  Setting GEMINI_API_KEY..."
    supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
fi

if [ ! -z "$GEMINI_API_KEY_2" ]; then
    echo "  Setting GEMINI_API_KEY_2..."
    supabase secrets set GEMINI_API_KEY_2="$GEMINI_API_KEY_2"
fi

if [ ! -z "$GEMINI_API_KEY_3" ]; then
    echo "  Setting GEMINI_API_KEY_3..."
    supabase secrets set GEMINI_API_KEY_3="$GEMINI_API_KEY_3"
fi

if [ ! -z "$GEMINI_API_KEY_4" ]; then
    echo "  Setting GEMINI_API_KEY_4..."
    supabase secrets set GEMINI_API_KEY_4="$GEMINI_API_KEY_4"
fi

if [ ! -z "$GEMINI_API_KEY_5" ]; then
    echo "  Setting GEMINI_API_KEY_5..."
    supabase secrets set GEMINI_API_KEY_5="$GEMINI_API_KEY_5"
fi

# Set Supabase secrets
if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "  Setting SUPABASE_SERVICE_ROLE_KEY..."
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
fi

if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "  Setting SUPABASE_URL..."
    supabase secrets set SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
fi

echo ""
echo "✅ Secrets set successfully!"
echo ""

# Deploy the edge function
echo "📦 Deploying chat edge function..."
supabase functions deploy chat

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 View logs with: supabase functions logs chat"
echo "🔍 Test function at: $NEXT_PUBLIC_SUPABASE_URL/functions/v1/chat"
