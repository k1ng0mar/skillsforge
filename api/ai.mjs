export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, system, model } = req.body;

  const MODEL_MAP = {
    lesson:   'tencent/hy3-preview',
    code:     'mistral/codestral-2501',
    curriculum: 'groq/llama-3.3-70b-versatile',
    exam:     'groq/llama-3.3-70b-versatile',
  };

  const resolvedModel = MODEL_MAP[model] || MODEL_MAP.curriculum;

  let response;
  if (resolvedModel.startsWith('groq/')) {
    const actual = resolvedModel.replace('groq/', '');
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: actual,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system + '\n\nCRITICAL: Respond with ONLY valid JSON. No markdown. No emojis.' },
          { role: 'user', content: prompt }
        ],
      }),
    });
  } else {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

  if (!response.ok) {
    const errText = await response.text();
    console.error('AI API error:', response.status, errText);
    return res.status(response.status).json({ error: `API Error: ${response.status}` });
  }

  const d = await response.json();
  const raw = d.choices?.[0]?.message?.content || '';

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    console.error('Parse error:', e, 'Raw:', raw.slice(0, 200));
    res.status(500).json({ error: 'Failed to parse AI response' });
  }
}
