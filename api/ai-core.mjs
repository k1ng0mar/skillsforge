const ALLOWED_MODELS = ['lesson', 'code', 'curriculum', 'exam'];

const MODEL_MAP = {
  lesson:     { provider: 'dashscope', model: 'qwen-max' },
  code:       { provider: 'dashscope', model: 'qwen-max' },
  curriculum: { provider: 'dashscope', model: 'deepseek-v3' },
  exam:       { provider: 'dashscope', model: 'qwen-max' },
};

/**
 * Validates request input. Returns null if valid, or an error status + message.
 */
export function validateInput(prompt, system, model) {
  if (!prompt || typeof prompt !== 'string' || prompt.length > 50000) {
    return { status: 400, error: 'Invalid prompt' };
  }
  if (system && (typeof system !== 'string' || system.length > 10000)) {
    return { status: 400, error: 'Invalid system prompt' };
  }
  if (model && !ALLOWED_MODELS.includes(model)) {
    return { status: 400, error: 'Invalid model' };
  }
  return null;
}

/**
 * Calls the AI provider and returns the parsed JSON result.
 * @param {string} prompt
 * @param {string} system
 * @param {string} model - logical model name (lesson, code, curriculum, exam)
 * @returns {Promise<{data?: object, error?: string, status?: number}>}
 */
export async function callAI(prompt, system, model) {
  const { provider, model: actualModel } = MODEL_MAP[model] || MODEL_MAP.curriculum;

  const body = {
    model: actualModel,
    messages: [
      { role: 'system', content: system + '\n\nCRITICAL: Respond with ONLY valid JSON. No markdown. No emojis. No explanations outside the JSON.' },
      { role: 'user', content: prompt },
    ],
  };

  // DashScope supports response_format for JSON mode (works for both Qwen and DeepSeek models)
  body.response_format = { type: 'json_object' };

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
    },
    body: JSON.stringify(body),
  };

  let response;
  try {
    const base = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    response = await fetch(base, fetchOptions);
  } catch (e) {
    console.error('Fetch error:', e);
    return { status: 502, error: 'Network error reaching AI provider' };
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('AI API error:', response.status, errText.slice(0, 300));
    return { status: response.status, error: `API Error: ${response.status}` };
  }

  let d;
  try {
    d = await response.json();
  } catch (e) {
    console.error('JSON parse error on response:', e);
    return { status: 500, error: 'Invalid JSON from AI provider' };
  }

  const raw = d.choices?.[0]?.message?.content || '';

  if (!raw || raw.trim() === '') {
    const reasoning = d.choices?.[0]?.message?.reasoning || d.choices?.[0]?.message?.thought || '';
    if (reasoning) {
      try {
        const parsed = JSON.parse(reasoning.replace(/```json|```/g, '').trim());
        return { data: parsed };
      } catch {}
    }
    return { status: 500, error: 'Empty response from AI' };
  }

  try {
    let cleaned = raw.replace(/```json|```/g, '').trim();
    try {
      return { data: JSON.parse(cleaned) };
    } catch (e1) {
      try {
        const stripped = cleaned.replace(/^["']|["']$/g, '');
        return { data: JSON.parse(stripped) };
      } catch (e2) {
        const trimmed = cleaned.replace(/^[^{[]*/, '').replace(/[}\]]*$/, '');
        return { data: JSON.parse(trimmed) };
      }
    }
  } catch (e) {
    console.error('JSON parse error on content:', e, 'Raw:', raw.slice(0, 300));
    return { status: 500, error: 'Failed to parse AI response' };
  }
}