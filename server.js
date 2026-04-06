require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting (simple in-memory) ──
const requestCounts = new Map();
const RATE_LIMIT = 30; // requests per hour per IP
setInterval(() => requestCounts.clear(), 60 * 60 * 1000);

function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);
  if (count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please wait a while before trying again.' });
  }
  next();
}

// ── Recipe API endpoint with streaming ──
app.post('/api/recipe', rateLimit, async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(400).json({ error: 'Invalid query.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is not configured. Please set ANTHROPIC_API_KEY.' });
  }

  const prompt = `You are the world's foremost expert on traditional food remedies, culinary medicine, and global cooking traditions. The user is searching for: "${query.trim()}"

Respond with ONLY a valid JSON object. No markdown fences, no extra text before or after. Exact structure:
{"name":"Full dish name","origin":"Country/region","tradition":"e.g. Ayurvedic / TCM / Mediterranean","category":"e.g. Healing Soup / Herbal Tea / Main Dish","tags":["tag1","tag2","tag3"],"description":"2-3 sentences on history and medicinal significance.","servings":"Serves X","prep_time":"X min","cook_time":"X min","difficulty":"Easy","ingredients":["qty + ingredient — prep note","qty + ingredient"],"steps":"steps":["Step 1","Step 2","Step 3","Step 4"],"health_remedies":[{"benefit":"Name","description":"One science-backed sentence."},{"benefit":"Name","description":"sentence."},{"benefit":"Name","description":"sentence."},{"benefit":"Name","description":"sentence."}],"nutrition":[{"key":"Calories","val":"~XXX kcal"},{"key":"Protein","val":"Xg"},{"key":"Vitamin C","val":"Xmg"},{"key":"Antioxidants","val":"High"}],"best_for":"Who benefits most.","pro_tip":"One specific tip most people don't know.","caution":"Any warnings or None for most people"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' });
    }

    // Stream the response directly back to the browser
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    console.error('Recipe API error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error. Please try again.' });
    }
  }
});

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RemedyKitchen is running 🌿' });
});

// ── Catch-all: serve frontend ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌿 RemedyKitchen running on http://localhost:${PORT}`);
});
