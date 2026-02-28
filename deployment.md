# Premium Free Deployment Guide (Vercel + TiDB Cloud)

Follow these steps to host your portfolio for **free** with the best performance.

## 1. Get your Database (TiDB Cloud)
TiDB Cloud is where your data (messages, projects) will be stored.

1.  **Sign Up**: Go to [TiDB Cloud](https://pingcap.com/tidb-cloud) and create a free account.
2.  **Create Cluster**: Click **Create Cluster** & choose **Serverless** (it's free!).
3.  **Click "Connect"**: Look for a big blue **Connect** button in the top right.
4.  **Get the String**:
    - Select **Public** connection.
    - Click **Generate Password** (Copy this password! You'll never see it again).
    - Look for the **Connection String**. It looks like a long URL starting with `mysql://`.
5.  **Copy this entire string**. This is your "Database Key".


## 2. Upload to GitHub
1. Create a new repository on [GitHub](https://github.com/new).
2. Upload all your files (except `node_modules`).
3. **Important**: Make sure `.env` is **NOT** uploaded to GitHub.

## 3. In **Environment Variables**, add these **EXACTLY**:
   - `DATABASE_URL`: (Paste your TiDB Connection String here)
   - `ADMIN_PASSWORD`: (Choose something secret)
   - `NODE_ENV`: `production`

> [!TIP]
> **SSL Fix**: I have updated the code to automatically handle SSL for TiDB Cloud, so you don't need to worry about extra configuration!


## 4. Final Steps
Once Vercel finishes, your site will be live!

- **Live Site**: `https://your-portfolio.vercel.app`
- **Admin Panel**: `https://your-portfolio.vercel.app/admin.html`

# Troubleshooting (If you see "Internal Server Error")

If the site crashes, **Vercel Logs** will tell you exactly why.
1. Go to your **Vercel Dashboard**.
2. Click on your project.
3. Click the **Logs** tab at the top.
4. Refresh your website to trigger the error.
5. In the logs, look for **red text** or messages like `CRITICAL: Database initialization failed`.
6. **Take a screenshot of those logs and share it!**

