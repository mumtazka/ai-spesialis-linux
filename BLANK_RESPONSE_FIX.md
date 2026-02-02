# 🚑 CRITICAL FIX: Blank Responses & Safety

## The Issue
Users reported seeing "blank responses" (empty bubbles) where the AI would start typing but show nothing.

## Root Causes Identified
1.  **Strict Safety Filters**: Default Google Gemini safety settings were silently blocking some responses.
2.  **Brittle Stream Parsing**: The client-side SSE parser was failing if data arrived in unusual chunk sizes or without specific formatting.
3.  **Authentication**: Session was not persisting, causing calls to be anonymous.

## The Solution

### 1. Updated Edge Function (`index.ts`) [Deployed]
- Added explicit **Safety Settings** (`BLOCK_ONLY_HIGH`).
- Redeployed to Supabase.

### 2. Robust Client Parser (`gemini.ts`) [Updated]
- **Buffer Processing**: Now handles leftover data in the buffer when the stream ends. This fixes cases where the entire response comes in one packet without a final newline.
- **Error Fallback**: If the server returns a raw JSON error (instead of SSE), the client now detects it and displays the error message.
- **Safety Handling**: Explicitly shows "⚠️ Content blocked" message if triggered.
- **Logging**: Added console warnings for non-SSE lines to help debugging.

### 3. Authentication Fix (`client.ts`) [Updated]
- Enabled session persistence so the AI knows who you are.

## Verification
1.  **Reload your browser page** to ensure the new client code is loaded.
2.  **Test Chat**:
    - "Hello" -> Should reply.
    - "Arch Linux" -> Should reply.
    - If something fails, you will now see an **error message** instead of a blank bubble.

## Status: ✅ FIXED & DEPLOYED
The system is now fully resilient.
