# 🌿 RemedyKitchen — Deploy Guide

World Food Remedies & Cooking website. Users never see or need an API key.
Your secret Anthropic key lives only on the server.

---

## Project Structure

```
remedykitchen/
├── server.js          ← Backend (holds your API key, calls Anthropic)
├── package.json
├── .env.example       ← Copy to .env and add your key
├── .gitignore         ← .env is already excluded
└── public/
    └── index.html     ← Full website (calls /api/recipe, not Anthropic directly)
```

---

## Local Development (test on your computer first)

**Step 1 — Install Node.js**
Download from https://nodejs.org (version 18 or higher)

**Step 2 — Install dependencies**
```bash
cd remedykitchen
npm install
```

**Step 3 — Add your API key**
```bash
cp .env.example .env
```
Open `.env` and replace `sk-ant-your-key-here` with your real key from https://console.anthropic.com

**Step 4 — Run it**
```bash
node server.js
```
Open http://localhost:3000 — fully working, no API key prompt for users!

---

## Deploy to Railway (Recommended — Easiest, Free)

Railway gives you $5 free credit/month which covers ~10,000 recipe searches.

**Step 1 — Push to GitHub**
```bash
git init
git add .
git commit -m "Initial RemedyKitchen"
```
Go to github.com → New repository → push your code there.

**Step 2 — Deploy on Railway**
1. Go to https://railway.app → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `remedykitchen` repo
4. Railway auto-detects Node.js and deploys

**Step 3 — Add your API key**
In Railway dashboard:
- Click your project → **Variables** tab
- Add: `ANTHROPIC_API_KEY` = `sk-ant-your-actual-key`
- Railway auto-restarts with the key

**Step 4 — Get your live URL**
Railway gives you a URL like `remedykitchen-production.up.railway.app`
That's your live website! Share it with anyone.

---

## Deploy to Render (Free, No Credit Card)

**Step 1 — Push to GitHub** (same as above)

**Step 2 — Deploy on Render**
1. Go to https://render.com → Sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node

**Step 3 — Add environment variable**
In Render dashboard → **Environment** tab:
- Add `ANTHROPIC_API_KEY` = your key

**Step 4 — Deploy**
Click **Create Web Service** — live in ~2 minutes.

> Note: Render free tier spins down after 15 min inactivity.
> First request after sleep takes ~30 seconds to wake up.
> Upgrade to Starter ($7/mo) to keep it always-on.

---

## Deploy to Vercel (Serverless — also free)

Vercel needs a slight adjustment — use `api/recipe.js` as a serverless function.

**Step 1 — Create `api/recipe.js`:**
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { query } = req.body;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      stream: true,
      messages: [{ role: 'user', content: query }],
    }),
  });
  response.body.pipe(res);
}
```

**Step 2 — Deploy:**
```bash
npm i -g vercel
vercel
```

**Step 3 — Add env var:**
```bash
vercel env add ANTHROPIC_API_KEY
```

---

## Custom Domain (Optional)

Once deployed on Railway/Render, you can add your own domain:
1. Buy a domain on Namecheap/GoDaddy (~$10/year)
2. In Railway/Render dashboard → **Custom Domain**
3. Add a CNAME record pointing to your Railway/Render URL
4. Done — `www.yoursite.com` is live!

---

## Cost Estimate

Using `claude-haiku-4-5` (the fastest, cheapest model):
- ~1,000 recipe searches = ~$0.15
- 10,000 searches/month = ~$1.50
- Railway free credit = $5/month → covers ~33,000 searches free

---

## Security Notes

- ✅ API key is ONLY on the server — users can never see it
- ✅ Rate limiting: 30 requests/hour per IP (edit in server.js)
- ✅ Input validation on all queries
- ✅ `.env` is in `.gitignore` — never committed to git
- ✅ No database needed — fully stateless

---

## Troubleshooting

**"Server is not configured" error**
→ You forgot to add `ANTHROPIC_API_KEY` to your environment variables.

**Recipes load slowly**
→ You're on Render free tier and the server woke from sleep. Upgrade to Starter.

**"Too many requests" error**
→ Rate limit hit. Edit `RATE_LIMIT` in `server.js` to increase it.

**Port already in use locally**
→ Change `PORT=3000` to `PORT=3001` in your `.env` file.
