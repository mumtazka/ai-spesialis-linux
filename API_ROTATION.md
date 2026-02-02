# API Key Rotation System

## Overview
The edge function now supports **automatic API key rotation with failover**. This ensures high availability even if one or more API keys reach their quota limits or fail.

## How It Works

### 1. **Multiple API Keys**
The system supports up to 5 Gemini API keys:
- `GEMINI_API_KEY` (Primary)
- `GEMINI_API_KEY_2`
- `GEMINI_API_KEY_3`
- `GEMINI_API_KEY_4`
- `GEMINI_API_KEY_5`

### 2. **Automatic Failover**
When a request is made:
1. The system tries the first available API key
2. If it fails (quota exceeded, timeout, auth error, etc.), it automatically tries the next key
3. This continues until a key succeeds or all keys are exhausted
4. Each attempt has a 30-second timeout to prevent hanging

### 3. **Error Handling**
The system handles various failure scenarios:
- **429 (Quota Exceeded)**: Immediately tries next key
- **401/403 (Auth Errors)**: Immediately tries next key
- **Network Timeouts**: Tries next key after 30 seconds
- **Other Errors**: Tries next key

### 4. **Logging**
The system logs detailed information:
```
🔑 Loaded 5 API keys for rotation
🔄 Attempting API call with key #1/5
⚠️ Key #1 failed with status 429: Quota exceeded
🔄 Attempting API call with key #2/5
✅ API call successful with key #2
```

## Configuration

### Local Development (.env)
```bash
GEMINI_API_KEY=AIzaSyCU7KISZ3Li3xhWQutdKd3HRYc0BfcArc8
GEMINI_API_KEY_2=AIzaSyBm7lCilfS7QO1g32kVGzKXo796R9lLan0
GEMINI_API_KEY_3=AIzaSyDTCU5BEKNhPxqiWXPjW-wyXoB-4IiPoJc
GEMINI_API_KEY_4=AIzaSyAE0kwNH_B8kiuFiAzRUVV7Gk_WB2RP278
GEMINI_API_KEY_5=AIzaSyBcAHGHbQSAPsQprMNRvTYAD7V2K3zg9mM
```

### Supabase Edge Function Secrets
You need to set these secrets in your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set GEMINI_API_KEY=AIzaSyCU7KISZ3Li3xhWQutdKd3HRYc0BfcArc8
supabase secrets set GEMINI_API_KEY_2=AIzaSyBm7lCilfS7QO1g32kVGzKXo796R9lLan0
supabase secrets set GEMINI_API_KEY_3=AIzaSyDTCU5BEKNhPxqiWXPjW-wyXoB-4IiPoJc
supabase secrets set GEMINI_API_KEY_4=AIzaSyAE0kwNH_B8kiuFiAzRUVV7Gk_WB2RP278
supabase secrets set GEMINI_API_KEY_5=AIzaSyBcAHGHbQSAPsQprMNRvTYAD7V2K3zg9mM
```

Or via Supabase Dashboard:
1. Go to your project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Add each secret with the corresponding key name

## Deployment

### Deploy Edge Function
```bash
# Deploy the updated chat function
supabase functions deploy chat
```

### Verify Deployment
Check the logs to see the rotation in action:
```bash
supabase functions logs chat
```

You should see logs like:
```
🔑 Loaded 5 API keys for rotation
🔄 Attempting API call with key #1/5
✅ API call successful with key #1
```

## Benefits

1. **High Availability**: If one API key fails, the system automatically uses another
2. **Quota Management**: Distribute load across multiple keys to avoid hitting quotas
3. **Resilience**: Network failures or temporary issues won't break the service
4. **Zero Downtime**: Seamless failover without user-facing errors
5. **Debug Information**: Response headers include which key was used (`X-API-Key-Used`)

## Monitoring

### Check Which Key Was Used
The response includes a debug header:
```
X-API-Key-Used: 2
```
This tells you which key (1-5) successfully handled the request.

### View Logs
Monitor the edge function logs to see:
- Which keys are being used
- Which keys are failing
- Error messages for debugging

## Troubleshooting

### All Keys Failing
If you see:
```
🚨 All 5 API keys failed. Last error: ...
```

Check:
1. Are all keys valid and not expired?
2. Have all keys exceeded their quota?
3. Is there a network issue with the Gemini API?
4. Are the secrets properly set in Supabase?

### Verify Secrets
```bash
# List all secrets (values are hidden)
supabase secrets list
```

### Test Locally
The edge function can be tested locally:
```bash
supabase functions serve chat
```

Then make a request:
```bash
curl -X POST http://localhost:54321/functions/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

## Best Practices

1. **Use All 5 Keys**: Maximize availability by providing all 5 API keys
2. **Monitor Usage**: Keep track of which keys are being used most
3. **Rotate Keys**: Periodically update keys to maintain security
4. **Check Quotas**: Monitor your Google Cloud quotas for each key
5. **Test Failover**: Occasionally test with invalid keys to ensure failover works

## Security Notes

- API keys are stored as Supabase secrets (encrypted at rest)
- Keys are never exposed to the client
- All requests go through the secure edge function
- The `.env` file should never be committed to git (already in `.gitignore`)
