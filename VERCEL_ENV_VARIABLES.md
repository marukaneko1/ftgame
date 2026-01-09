# Vercel Environment Variables - Complete List

Copy and paste these directly into Vercel:

## ✅ Add These Variables to Vercel

Go to: **Vercel Dashboard** → Your API Project (`ftgame-api`) → **Settings** → **Environment Variables**

For each variable below:
- Click **Add New**
- Enter the **Key** and **Value**
- Select all three environments: ✅ **Production**, ✅ **Preview**, ✅ **Development**
- Click **Save**

---

### 1. DATABASE_URL (Required)
```
postgresql://neondb_owner:npg_6iYxb1ThJgMU@ep-quiet-mode-ahcijim1-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2. REDIS_URL (Required)
**Your Upstash Redis connection string**:
```
redis://default:ATU9AAIncDEwNTQxOTVlYzk4MmM0NWUxODU2MjkwYWVkNTI3ZmNmOXAxMTM2Mjk@present-civet-13629.upstash.io:6379
```

**Note**: Your code automatically detects Upstash URLs and enables TLS, so `redis://` format works perfectly!

### 3. JWT_ACCESS_SECRET (Required)
```
CH6omNhm8bTdfHMK+B5sLIXP7Qf/pzM6WqX4DnzN3ng=
```

### 4. JWT_REFRESH_SECRET (Required)
```
gF/V/bYbuZAi2Kk4xRWqGWgcAKho/sFV509rfNYHDaw=
```

### 5. ALLOWED_ORIGINS (Recommended for CORS)
```
https://ftgame-theta.vercel.app,https://ftgame-git-main-marukaneko1s-projects.vercel.app
```

### 6. WEB_BASE_URL (Recommended)
```
https://ftgame-theta.vercel.app
```

### 7. NODE_ENV (Optional but Recommended)
```
production
```

---

## After Adding All Variables

1. **Redeploy** your function:
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**
   - OR just push a commit to trigger auto-deploy

2. **Verify**:
   - Go to latest deployment → **Function Logs**
   - Check for: ✅ "Database connected successfully"
   - Check for: ✅ No errors

3. **Test your API**:
   ```bash
   curl https://ftgame-api.vercel.app/api/auth/login
   ```
   Should return an error about missing body (not a connection error!)

---

## Quick Checklist

- [ ] DATABASE_URL added
- [ ] REDIS_URL added (use `rediss://` for SSL)
- [ ] JWT_ACCESS_SECRET added
- [ ] JWT_REFRESH_SECRET added
- [ ] ALLOWED_ORIGINS added (optional but recommended)
- [ ] WEB_BASE_URL added (optional but recommended)
- [ ] All variables set for all environments (Production, Preview, Development)
- [ ] Redeployed function
- [ ] Verified in function logs

---

## Troubleshooting

### "Invalid REDIS_URL format"
- Try using `rediss://` instead of `redis://` (SSL/TLS)
- Make sure there are no extra spaces or line breaks

### "Can't reach database"
- Verify DATABASE_URL is correct
- Check that `?sslmode=require` is at the end
- Test connection with: `psql "YOUR_DATABASE_URL"`

### "CORS error"
- Add your frontend URL to `ALLOWED_ORIGINS`
- Set `WEB_BASE_URL` to your frontend URL
- Redeploy after adding variables

### "Missing environment variable"
- Double-check variable names (case-sensitive!)
- Make sure variables are set for the right environment
- Redeploy after adding variables

