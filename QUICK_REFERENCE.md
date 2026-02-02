# 🚀 Quick Reference - API Key Rotation

## ✅ What's Done
- ✅ 5 API keys configured in `.env`
- ✅ Edge function updated with rotation logic
- ✅ Automatic failover implemented
- ✅ 30-second timeout per attempt
- ✅ Detailed logging added

## 📝 Your API Keys
```
Key #1: AIzaSyCU7KISZ3Li3xhWQutdKd3HRYc0BfcArc8
Key #2: AIzaSyBm7lCilfS7QO1g32kVGzKXo796R9lLan0
Key #3: AIzaSyDTCU5BEKNhPxqiWXPjW-wyXoB-4IiPoJc
Key #4: AIzaSyAE0kwNH_B8kiuFiAzRUVV7Gk_WB2RP278
Key #5: AIzaSyBcAHGHbQSAPsQprMNRvTYAD7V2K3zg9mM
```

## 🚀 Deploy Now

### Quick Deploy (Recommended)
```bash
./deploy-edge-function.sh
```

### Manual Deploy
```bash
# Set secrets
supabase secrets set GEMINI_API_KEY=AIzaSyCU7KISZ3Li3xhWQutdKd3HRYc0BfcArc8
supabase secrets set GEMINI_API_KEY_2=AIzaSyBm7lCilfS7QO1g32kVGzKXo796R9lLan0
supabase secrets set GEMINI_API_KEY_3=AIzaSyDTCU5BEKNhPxqiWXPjW-wyXoB-4IiPoJc
supabase secrets set GEMINI_API_KEY_4=AIzaSyAE0kwNH_B8kiuFiAzRUVV7Gk_WB2RP278
supabase secrets set GEMINI_API_KEY_5=AIzaSyBcAHGHbQSAPsQprMNRvTYAD7V2K3zg9mM

# Deploy
supabase functions deploy chat
```

## 📊 Monitor

### View Logs
```bash
supabase functions logs chat --tail
```

### Check Secrets
```bash
supabase secrets list
```

## 🔍 Test

Just use your app normally! The rotation happens automatically.

Check response headers to see which key was used:
```
X-API-Key-Used: 1
```

## 📚 Documentation

- `IMPLEMENTATION_SUMMARY.md` - Complete overview
- `API_ROTATION.md` - Detailed guide
- `API_FLOW_DIAGRAM.md` - Visual flow
- `verify-implementation.sh` - Verify setup
- `deploy-edge-function.sh` - Deploy script

## ⚡ How It Works

1. User sends chat request
2. Edge function loads all 5 API keys
3. Tries key #1
   - ✅ Success → Return response
   - ❌ Failed → Try key #2
4. Tries key #2
   - ✅ Success → Return response
   - ❌ Failed → Try key #3
5. ... continues until success or all keys exhausted

## 🎯 Benefits

- **5x Capacity**: More quota available
- **High Availability**: Automatic failover
- **Resilient**: Handles errors gracefully
- **Zero Downtime**: Seamless switching
- **Easy Monitoring**: Detailed logs

## 🆘 Troubleshooting

### All keys failing?
1. Check if keys are valid
2. Verify secrets: `supabase secrets list`
3. Check quotas in Google Cloud Console
4. View logs: `supabase functions logs chat`

### Deployment failing?
1. Install CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link: `supabase link`
4. Try again

## 📞 Support

Check the detailed docs:
- Full guide: `API_ROTATION.md`
- Flow diagram: `API_FLOW_DIAGRAM.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`
