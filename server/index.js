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

  const MODEL_MAP = {
    lesson:   'tencent/hy3-preview',
    code:     'mistral/codestral-2501',
    curriculum: 'groq/llama-3.3-70b-versatile',
    exam:     'groq/llama-3.3-70b-versatile',
  };

  const resolvedModel = MODEL_MAP[model] || MODEL_MAP.curriculum;

  let res2;
  if (resolvedModel.startsWith('groq/')) {
    const actual = resolvedModel.replace('groq/', '');
    res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: actual,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system + '\n\nCRITICAL: Respond with ONLY valid JSON. NO markdown. NO EMOJIS.' },
          { role: 'user', content: prompt }
        ],
      }),
    });
  } else {
    res2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://skillforge.app',
        'X-Title': 'SkillForge',
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
      }),
    });
  }

  if (!res2.ok) {
    return res.status(res2.status).json({ error: `API Error: ${res2.status}` });
  }

  const d = await res2.json();
  const raw = d.choices?.[0]?.message?.content || '';

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    console.error('Parse error:', e);
    res.status(500).json({ error: 'Failed to parse AI response' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));