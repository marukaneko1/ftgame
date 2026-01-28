# Debug: Matchmaking Not Working

## Requirements for Matchmaking:

Both users MUST have:
1. ✅ **Not banned** (`isBanned: false`)
2. ✅ **18+ verified** (`is18PlusVerified: true`)
3. ✅ **Active subscription** (`subscription.status === "ACTIVE"`)

## Requirements for Matching:

Both users MUST select:
- ✅ **Same region** (e.g., both select "United States")
- ✅ **Same language** (e.g., both select "English (US)")

## Common Issues:

### Issue 1: Users Don't Have Active Subscriptions

**Check Railway Logs:**
Look for messages like:
```
User X is not eligible
Active subscription required
```

**Fix:**
Both users need active subscriptions. Create test subscriptions for both accounts.

### Issue 2: Users Aren't 18+ Verified

**Check Railway Logs:**
Look for:
```
Age verification required (18+)
```

**Fix:**
Set `is18PlusVerified: true` for both users in the database.

### Issue 3: Different Region/Language

**Check:**
- Both users must select the **same region**
- Both users must select the **same language**

**Fix:**
Make sure both users select the same region and language dropdowns.

### Issue 4: Queue Length Too Short

**Check Railway Logs:**
Look for:
```
Queue too short (1 < 2)
findClosestMatch for user X, queue length: 1
```

This means only one user is in the queue at a time, so they can't match.

**Why this happens:**
- Users might be joining at different times
- One user might be getting removed due to eligibility checks
- Region/language mismatch causing separate queues

### Issue 5: Eligibility Check Fails During Matching

The `findClosestMatch` method checks eligibility again when trying to match. If a user's eligibility changes (subscription expires, etc.), they'll be skipped.

**Check Railway Logs:**
Look for:
```
User X is not eligible
No eligible matches found
```

## Debug Steps:

### Step 1: Check Railway Logs

When both users try to match, check Railway logs for:

1. **Queue joins:**
   ```
   User X joined queue match_queue:United States:English (US). Queue length: 1
   User Y joined queue match_queue:United States:English (US). Queue length: 2
   ```

2. **Eligibility checks:**
   ```
   User X is not eligible
   Active subscription required
   Age verification required (18+)
   ```

3. **Match attempts:**
   ```
   findClosestMatch for user X, queue length: 2
   Found 1 items in queue
   No eligible matches found
   ```

4. **Periodic matching:**
   ```
   Periodic match found for user X with user Y
   Successfully matched user X with user Y (atomic)
   ```

### Step 2: Verify User Eligibility

**Using Railway Shell:**

```bash
# Check user 1
railway run --service @omegle-game/api npx prisma studio
# Or use psql:
# SELECT id, email, "isBanned", "is18PlusVerified", 
#        (SELECT status FROM "Subscription" WHERE "userId" = "User".id) as subscription_status
# FROM "User"
# WHERE email = 'user1@example.com';
```

**Check:**
- `isBanned`: `false`
- `is18PlusVerified`: `true`
- `subscription.status`: `"ACTIVE"`

**Fix if needed:**
```sql
-- Make user eligible (if testing)
UPDATE "User" SET "is18PlusVerified" = true WHERE email = 'user1@example.com';
UPDATE "Subscription" SET status = 'ACTIVE' WHERE "userId" = (SELECT id FROM "User" WHERE email = 'user1@example.com');
```

### Step 3: Check Region/Language Match

**Make sure both users:**
- Select the same region (e.g., "United States")
- Select the same language (e.g., "English (US)")

The queue key is: `match_queue:{region}:{language}`

If they select different options, they'll be in different queues and won't match.

### Step 4: Check Queue State

**Using Railway Shell:**

```bash
railway run --service @omegle-game/api
```

Then:
```bash
# Connect to Redis
redis-cli --tls -u $REDIS_URL

# List all queue keys
KEYS match_queue:*

# Check queue contents
LRANGE match_queue:United\ States:English\ \(US\) 0 -1

# Check queue length
LLEN match_queue:United\ States:English\ \(US\)
```

**Expected:**
- Queue length should be 2 (or more) when both users are matching
- Both users should appear in the same queue

### Step 5: Check Periodic Matching

The periodic matching checks every 2 seconds. Check Railway logs for:
```
Periodic match found for user X with user Y
```

If you don't see this, the matching logic might be failing silently.

## Quick Fix for Testing:

**If you just want to test matchmaking quickly:**

1. **Ensure both users have:**
   - `is18PlusVerified: true`
   - Active subscription
   - `isBanned: false`

2. **Both users select:**
   - Same region: "United States"
   - Same language: "English (US)"

3. **Check Railway logs** for any errors

4. **Wait up to 2 seconds** for periodic matching to find the match

## Add Debug Logging:

I'll add more detailed logging to help diagnose the issue. Check Railway logs after this update.


