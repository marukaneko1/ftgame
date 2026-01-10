# How to Add Agora Credentials to Railway

## Add Environment Variables via Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app)
2. Select your `@omegle-game/api` project
3. Click on the **"Variables"** tab
4. Add these two environment variables:

   **Variable 1:**
   - Key: `AGORA_APP_ID`
   - Value: `84c8da8ab99c4773991719fd053b817a`

   **Variable 2:**
   - Key: `AGORA_APP_CERTIFICATE`
   - Value: `a419f1add466425ebf75bc3882bcc5c3`

5. Click **"Add"** or **"Save"** for each variable
6. Railway will automatically restart your service after adding variables

## Verify They're Set

After adding, your Railway Variables tab should show:
- `AGORA_APP_ID=84c8da8ab99c4773991719fd053b817a`
- `AGORA_APP_CERTIFICATE=a419f1add466425ebf75bc3882bcc5c3`

## Test Video/Audio

After Railway restarts (takes ~1-2 minutes):
1. Try matchmaking again
2. Once matched, video and audio should now work!
3. You should see video streams instead of "Video not available"

