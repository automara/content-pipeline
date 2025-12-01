# DataForSEO API Setup Guide

This guide will walk you through setting up your DataForSEO account and getting the credentials needed for the keyword ideation system.

## What is DataForSEO?

DataForSEO is an API service that provides SEO data including:
- Search volume for keywords
- Keyword difficulty scores
- SERP (Search Engine Results Page) analysis
- Related keyword suggestions
- Competitor URL data

## Step 1: Create an Account

1. Go to [https://app.dataforseo.com/](https://app.dataforseo.com/)
2. Click **"Sign Up"** or **"Get Started"**
3. Fill in your information:
   - Email address
   - Password
   - Company name (optional)
4. Verify your email address if required

## Step 2: Get Your API Credentials

Once you're logged in:

1. Navigate to **"API"** or **"API Access"** in the dashboard menu
   - This might be under Settings → API, or in the main navigation
2. You'll see your API credentials:
   - **Login** (usually your email address or a username)
   - **Password** (your API password - this may be different from your account password)

### Important Notes:

- **Login**: This is typically your email address, but sometimes it's a separate API username
- **Password**: This might be:
  - Your account password
  - A separate API password (if you set one up)
  - An API token/key (some services use this format)

If you don't see a password field, look for:
- "API Key" or "API Token"
- "Generate API Password"
- Settings → API → Generate Credentials

## Step 3: Add Credits to Your Account

DataForSEO uses a pay-per-use model. You'll need to add credits to your account:

1. Go to **"Billing"** or **"Credits"** in the dashboard
2. Click **"Add Credits"** or **"Top Up"**
3. Choose a payment plan:
   - Starter plans usually start around $50-100
   - Pay-as-you-go options are available
4. Complete the payment

### Cost Estimates:

Based on the keyword ideation system usage:

| Operation | Cost | Per Seed Topic (10 keywords) |
|-----------|------|------------------------------|
| Search Volume | $0.05/100 keywords | $0.005 |
| Keyword Ideas | $0.05/task | $0.05 |
| SERP Data | $0.003/task | $0.03 |
| Keyword Difficulty | $0.02/100 keywords | $0.002 |
| **Total per seed** | | **~$0.09** |

**Monthly estimates:**
- 100 seed topics/month: ~$9
- Weekly gap scan (50 candidates): ~$18
- Heavy research (500 topics): ~$45

## Step 4: Test Your Credentials

You can test your credentials using DataForSEO's API explorer or by making a test request:

1. In the DataForSEO dashboard, look for **"API Explorer"** or **"Test API"**
2. Try a simple endpoint like `/keywords_data/google/search_volume/live`
3. If you get a successful response, your credentials are working

## Step 5: Add Credentials to Your .env File

Once you have your credentials:

1. Open your `.env` file
2. Find the DataForSEO section:
   ```bash
   DATAFORSEO_LOGIN=your_dataforseo_login
   DATAFORSEO_PASSWORD=your_dataforseo_password
   ```
3. Replace the placeholders:
   - `your_dataforseo_login` → Your DataForSEO login/email
   - `your_dataforseo_password` → Your DataForSEO API password

### Example:
```bash
DATAFORSEO_LOGIN=john@example.com
DATAFORSEO_PASSWORD=my_api_password_123
```

## Step 6: Verify Configuration

After adding your credentials:

1. Restart your development server (if running locally)
2. Check the startup logs - you should see:
   ```
   🔍 Keyword Ideation System Configuration:
      DataForSEO Login: john@e...
      DataForSEO Password: ***SET***
   ```
3. If you see warnings, double-check your credentials

## Troubleshooting

### "Invalid credentials" error

- **Check**: Make sure you're using the API password, not your account password
- **Solution**: Look for "API Password" or "Generate API Key" in the dashboard

### "Insufficient credits" error

- **Check**: Go to Billing → Credits to see your balance
- **Solution**: Add more credits to your account

### "Authentication failed" error

- **Check**: Verify your login is correct (might be email or username)
- **Solution**: Try both your email and any API username shown in the dashboard

### Can't find API credentials

- **Check**: Some accounts need to enable API access first
- **Solution**: 
  1. Go to Settings → API
  2. Look for "Enable API Access" or "Generate API Credentials"
  3. Follow the prompts to create API credentials

## Alternative: Using API Keys Instead of Password

Some DataForSEO accounts use API keys instead of passwords. If that's the case:

1. Generate an API key in the dashboard
2. Use that key as your `DATAFORSEO_PASSWORD`
3. Your login might be a specific API username or your email

## Need Help?

- **DataForSEO Support**: Check their documentation at [https://docs.dataforseo.com/](https://docs.dataforseo.com/)
- **API Reference**: [https://api.dataforseo.com/v3](https://api.dataforseo.com/v3)
- **Contact Support**: Use the support chat in the DataForSEO dashboard

## Security Notes

- **Never commit your `.env` file** to version control (it's already in `.gitignore`)
- **Keep your API password secure** - treat it like a password
- **Rotate credentials** if you suspect they've been compromised
- **Use environment variables** in production (Railway, etc.) instead of hardcoding

## Next Steps

Once your DataForSEO credentials are set up:

1. ✅ Test the keyword research endpoint: `POST /api/keyword/research`
2. ✅ Try a gap analysis: `POST /api/keyword/gap-scan`
3. ✅ Monitor your DataForSEO credit usage in their dashboard
4. ✅ Set up alerts for low credit balance if available

