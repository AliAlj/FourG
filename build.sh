#!/bin/bash
# Generates readingai/frontend/config.js from Render environment variables.
# Set all variables in the Render dashboard before deploying.

cat > readingai/frontend/config.js << EOF
const CONFIG = {
  AZURE_KEY:        "${AZURE_KEY}",
  AZURE_REGION:     "${AZURE_REGION}",
  IBM_PROJECT_ID:   "${IBM_PROJECT_ID}",
  IBM_API_KEY:      "${IBM_API_KEY}",
  SUPABASE_URL:     "${SUPABASE_URL}",
  SUPABASE_ANON_KEY:"${SUPABASE_ANON_KEY}",
  GOOGLE_AI_KEY:    "${GOOGLE_AI_KEY}",
  GOOGLE_TTS_KEY:   "${GOOGLE_TTS_KEY}",
  GROQ_API_KEY:     "${GROQ_API_KEY}"
};
EOF

echo "✅ config.js generated"
