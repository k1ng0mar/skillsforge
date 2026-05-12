export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, system, model } = req.body;

  const MODEL_MAP = {
    lesson:   'deepseek-chat',
    code:     'codestral@latest',
    curriculum: 'llama-3.3-70b-versatile',
    exam:     'llama-3.3-70b-versatile',
  };

  const resolvedModel = MODEL_MAP[model] || 'llama-3.3-70b-versatile';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: resolvedModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system + '\n\nCRITICAL: Respond with ONLY valid JSON. No markdown. No emojis.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API Error: ${response.status}` });
    }

    const d = await response.json();
    const raw = d.choices?.[0]?.message?.content || '';

    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    console.error('AI error:', e);
    res.status(500).json({ error: 'Failed to parse AI response' });
  }
}
