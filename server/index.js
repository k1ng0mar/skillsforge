import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/api/ai', async (req, res) => {
  const { prompt, system } = req.body;

  const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer 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`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system + '\n\nCRITICAL: Respond with ONLY valid JSON. NO markdown. NO EMOJIS.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

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