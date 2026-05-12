import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.post('/api/ai', async (req, res) => {
  const { prompt, system, model } = req.body;

  const ALLOWED_MODELS = ['lesson', 'code', 'curriculum', 'exam'];
  if (!prompt || typeof prompt !== 'string' || prompt.length > 50000) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }
  if (model && !ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: 'Invalid model' });
  }

  const MODEL_MAP = {
    lesson:     { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    code:       { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    curriculum: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    exam:       { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  };

  const { provider, model: actualModel } = MODEL_MAP[model] || MODEL_MAP.curriculum;
  const isGroq = provider === 'groq';

  const body = {
    model: actualModel,
    messages: [
      { role: 'system', content: system + '\n\nCRITICAL: Respond with ONLY valid JSON. No markdown. No emojis. No explanations outside the JSON.' },
      { role: 'user', content: prompt }
    ],
  };

  if (isGroq) {
    body.response_format = { type: 'json_object' };
  }

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  };

  let res2;
  try {
    const base = 'https://api.groq.com/openai/v1/chat/completions';
    res2 = await fetch(base, fetchOptions);
  } catch (e) {
    console.error('Fetch error:', e);
    return res.status(502).json({ error: 'Network error reaching AI provider' });
  }

  if (!res2.ok) {
    const errText = await res2.text();
    console.error('AI API error:', res2.status, errText.slice(0, 300));
    return res.status(res2.status).json({ error: `API Error: ${res2.status}` });
  }

  let d;
  try {
    d = await res2.json();
  } catch (e) {
    console.error('JSON parse error on response:', e);
    return res.status(500).json({ error: 'Invalid JSON from AI provider' });
  }

  const raw = d.choices?.[0]?.message?.content || '';

  if (!raw || raw.trim() === '') {
    const reasoning = d.choices?.[0]?.message?.reasoning || d.choices?.[0]?.message?.thought || '';
    if (reasoning) {
      try {
        const parsed = JSON.parse(reasoning.replace(/```json|```/g, '').trim());
        return res.json(parsed);
      } catch {}
    }
    return res.status(500).json({ error: 'Empty response from AI' });
  }

  try {
    let cleaned = raw.replace(/```json|```/g, '').trim();
    cleaned = cleaned.replace(/^[^{[]*/, '').replace(/[}\]]$/, '');
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (e) {
    console.error('JSON parse error on content:', e, 'Raw:', raw.slice(0, 300));
    res.status(500).json({ error: 'Failed to parse AI response' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));