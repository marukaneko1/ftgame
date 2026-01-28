# Railway Port Configuration Guide

## Understanding Railway Ports

Railway automatically assigns a `PORT` environment variable to your service. Your app should listen on `process.env.PORT`.

## Your API Configuration

Your NestJS API (`api/src/main.ts`) is configured to:
```typescript
const port = process.env.PORT || 3001;
```

This means:
- ✅ It uses Railway's `PORT` environment variable if set
- ✅ Falls back to `3001` if `PORT` is not set

## What Port to Enter

### Option 1: Check Railway Logs (Recommended)

1. Go to Railway dashboard → `@omegle-game/api` → **"Logs"** tab
2. Look for a log line that says something like:
   ```
   API listening on http://localhost:XXXX
   ```
3. The `XXXX` is the port your app is listening on
4. Use this port number in the "Generate Service Domain" field

### Option 2: Check Environment Variables

1. Go to Railway dashboard → `@omegle-game/api` → **"Variables"** tab
2. Look for `PORT` variable
3. If it exists, use that value
4. If it doesn't exist, Railway might use the default (often `8080` or `3001`)

### Option 3: Use Common Railway Defaults

Railway commonly uses these ports:
- **8080** - Most common for web services
- **3000** - Common for Node.js apps
- **3001** - Your app's fallback port

If you're unsure, try **8080** first (which you currently have entered).

## Generate the Domain

Once you've entered the correct port:

1. Click the **"Generate Domain"** button (purple button)
2. Railway will create a public URL like: `https://your-service-name.up.railway.app`
3. **Copy this URL** - you'll need it for Vercel

## After Generating the Domain

You'll get a public URL. Use it in:

### Vercel Environment Variables:
```bash
NEXT_PUBLIC_API_URL=https://your-service-name.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-service-name.up.railway.app
```

## Verify the Port is Correct

After generating the domain, test it:

```bash
curl https://your-service-name.up.railway.app/api/auth/health
```

If you get an error like "Connection refused" or timeout:
- The port might be wrong
- Check Railway logs to see what port the app is actually using
- Delete the domain and regenerate with the correct port

## Common Issues

**Port 8080 doesn't work?**
- Check Railway logs to see actual port
- Railway might be using a different port
- Verify `PORT` environment variable is set correctly

**Connection timeout?**
- Make sure the service is running ("Online" status)
- Check that the port matches what your app is listening on
- Verify environment variables are set

## Quick Fix: Just Click Generate Domain

If you're not sure, **8080 is a safe guess** for Railway services. Click "Generate Domain" and:
1. Railway will create the public URL
2. Test it with `curl` or from your frontend
3. If it doesn't work, check logs and regenerate with correct port


