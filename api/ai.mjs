export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, system, model } = req.body;

  const ALLOWED_MODELS = ['lesson', 'code', 'curriculum', 'exam'];
  if (!prompt || typeof prompt !== 'string' || prompt.length > 50000) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }
  if (system && (typeof system !== 'string' || system.length > 10000)) {
    return res.status(400).json({ error: 'Invalid system prompt' });
  }
  if (model && !ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: 'Invalid model' });
  }

  const MODEL_MAP = {
    lesson:   'tencent/hy3-preview',
    code:     'mistral/codestral-2501',
    curriculum: 'groq/llama-3.3-70b-versatile',
    exam:     'groq/llama-3.3-70b-versatile',
  };

  const resolvedModel = MODEL_MAP[model] || MODEL_MAP.curriculum;
  const isGroq = resolvedModel.startsWith('groq/');
  const actualModel = isGroq ? resolvedModel.replace('groq/', '') : resolvedModel;

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
      'Authorization': `Bearer ${isGroq ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify(body),
  };

  if (!isGroq) {
    fetchOptions.headers['HTTP-Referer'] = 'https://skillforge.app';
    fetchOptions.headers['X-Title'] = 'SkillForge';
  }

  let response;
  try {
    const base = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
    response = await fetch(base, fetchOptions);
  } catch (e) {
    console.error('Fetch error:', e);
    return res.status(502).json({ error: 'Network error reaching AI provider' });
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('AI API error:', response.status, errText.slice(0, 300));
    return res.status(response.status).json({ error: `API Error: ${response.status}` });
  }

  let d;
  try {
    d = await response.json();
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
}
