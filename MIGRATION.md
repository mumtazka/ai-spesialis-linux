# Migration Guide: Local/Insecure API to Supabase Edge Functions

This document outlines the changes made to migrate the Linux Expert AI backend from a direct client-side/Next.js API architecture to a secure Supabase Edge Function architecture.

## Overview of Changes

1.  **Backend Layer (`supabase/functions/chat`)**:
    *   Created a new Edge Function `chat` using Deno.
    *   Handles authentication, rate limiting (20 req/min/IP), and safety guardrails.
    *   acts as a secure proxy to Google Gemini API.
    *   Supports SSE streaming logic.

2.  **Client Layer (`lib/ai/gemini.ts`)**:
    *   **REMOVED** all direct `fetch` calls to Google Gemini.
    *   **REMOVED** logic that read `process.env.GEMINI_API_KEY`.
    *   **ADDED** `supabase.functions.invoke('chat', ...)` call.
    *   Parses the streamed response from the Edge Function.
    *   Safe to use in Client Components.

3.  **Safety Guardrails (`lib/ai/guardrails.ts`)**:
    *   Shared logic (RegExp patterns) provided for client-side pre-checks (optional) and enforced server-side.
    *   Detects dangerous commands like `rm -rf /`, `mkfs`, fork bombs, piping to shell.

## Architecture

**Before:**
`Client` -> `Next.js API Route` (or direct) -> `Gemini API (Google)`
*Risk: API Key potentially exposed if code refactored poorly; Rate limiting hard to enforcement per-IP globally.*

**After:**
`Client` -> `Supabase Edge Function` -> `Gemini API (Google)`
*Benefit: API Key stored only in Supabase Secrets; Guardrails run in secure environment; Auth enforced.*

## Deployment Steps

To go live with this new architecture, follow these steps:

### 1. Set Secrets
Run this in your terminal (using Supabase CLI):
```bash
supabase secrets set GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Deploy Function
Deploy the `chat` function:
```bash
supabase functions deploy chat --no-verify-jwt
# Note: --no-verify-jwt is used if you handle auth manually or allow anon access. 
# Our code checks for Anon/Service role implicitly via Supabase Gateway, 
# but if you enforce strict User Auth, ensure client sends valid session.
```

### 3. Environment Cleanup
*   Remove `GEMINI_API_KEY` from your Netlify/Vercel environment variables.
*   Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Netlify.

## Rollback Plan

If the Edge Function fails or you need to revert:

1.  Restore `lib/ai/gemini.ts` from git history (previous commit).
2.  Set `GEMINI_API_KEY` back in Netlify environment variables.
3.  Redeploy frontend.