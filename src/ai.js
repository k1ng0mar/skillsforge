const KEY = 'sf_provider';

export const PRESETS = {
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'] },
};

export function presetModels(draft) {
  const hit = Object.values(PRESETS).find(p => p.baseUrl === (draft && draft.baseUrl));
  return hit ? hit.models : [];
}

const BROWSER_BLOCKED = ['opencode.ai', 'integrate.api.nvidia.com'];

function networkError(base) {
  if (BROWSER_BLOCKED.some(h => (base || '').includes(h))) throw new Error('This provider blocks requests sent from browsers (no CORS headers). Use Groq here, or call it from a server instead.');
  throw new Error('Network error reaching provider');
}

async function providerDetail(res) {
  try {
    const t = await res.text();
    try {
      const j = JSON.parse(t);
      const err = j?.error || {};
      let msg = err.message || j?.message || '';
      if ((!msg || /provider returned/i.test(msg)) && err.metadata?.raw) {
        try {
          const raw = JSON.parse(err.metadata.raw);
          msg = raw?.error?.message || raw?.message || err.metadata.raw;
        } catch { msg = err.metadata.raw; }
      }
      msg = String(msg);
      return msg ? `: ${msg.slice(0, 300)}` : '';
    } catch { return t ? `: ${t.slice(0, 300)}` : ''; }
  } catch { return ''; }
}

export async function fetchModels(baseUrl, apiKey) {
  const base = (baseUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('Set a base URL first.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  let res;
  try {
    res = await fetch(`${base}/models`, {
      signal: ctrl.signal,
      headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Models request timed out (30s).');
    networkError(base);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error('That API key did not work.');
    throw new Error(`Models request failed (${res.status})${await providerDetail(res)}`);
  }
  const d = await res.json().catch(() => null);
  const ids = (d && Array.isArray(d.data) ? d.data : []).map(m => m && m.id).filter(Boolean).sort();
  if (!ids.length) throw new Error('Provider returned no models.');
  return ids;
}

const KEYS_KEY = 'sf_provider_keys';

export function loadKeys() {
  try {
    const raw = localStorage.getItem(KEYS_KEY);
    if (raw) return JSON.parse(raw) || {};
  } catch { /* Fresh start */ }
  return {};
}

export function saveKey(baseUrl, apiKey) {
  if (!baseUrl) return;
  try {
    const keys = loadKeys();
    if (apiKey) keys[baseUrl] = apiKey;
    else delete keys[baseUrl];
    localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  } catch { /* Storage full or blocked */ }
}

export function availableModels(draft, fetched) {
  const out = [...presetModels(draft), ...(fetched || [])];
  if (draft && draft.model && !out.includes(draft.model)) out.push(draft.model);
  return [...new Set(out)];
}

export function loadProvider() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { baseUrl: '', apiKey: '', model: '', ...JSON.parse(raw) };
  } catch { /* Fresh start */ }
  return { baseUrl: PRESETS.groq.baseUrl, apiKey: '', model: PRESETS.groq.models[0] };
}

export function saveProvider(cfg) {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* Storage full or blocked */ }
}

function salvage(raw) {
  if (!raw || !raw.trim()) throw new Error('Empty response from AI');
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const attempts = [
    cleaned,
    cleaned.replace(/^["']|["']$/g, ''),
    cleaned.replace(/^[^{[]*/, '').replace(/[}\]]*$/, ''),
  ];
  for (const t of attempts) {
    try { return JSON.parse(t); } catch { /* Try next */ }
  }
  throw new Error('Could not parse AI response');
}

export async function callAI(prompt, sys) {
  const cfg = loadProvider();
  if (!cfg.apiKey) throw new Error('No API key set. Tap the gear up top to add one.');
  const base = (cfg.baseUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('No API base URL set. Tap the gear up top to add one.');
  if (!cfg.model) throw new Error('No model set. Tap the gear up top to add one.');

  let response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
        ...(base.includes('openrouter.ai') ? { 'HTTP-Referer': 'https://skillsforge.local', 'X-Title': 'SkillsForge' } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: sys + '\n\nReturn ONLY valid json. No markdown fences, no preamble.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Request timed out (120s). The route may be slow or the model id wrong. Use Fetch models to list valid ids.');
    networkError(base);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await providerDetail(response);
    if (response.status === 401) throw new Error(`That API key did not work. Check settings${detail}.`);
    if (response.status === 429) throw new Error(`Rate limited. Wait a bit and retry${detail}.`);
    throw new Error(`AI error ${response.status}${detail}`);
  }

  let d;
  let raw = '';
  try { raw = await response.text(); d = JSON.parse(raw); }
  catch { throw new Error(`Invalid response from AI provider${raw ? `: ${raw.slice(0, 200)}` : ''}`); }
  if (d?.error) {
    const msg = d.error.message || JSON.stringify(d.error).slice(0, 300);
    throw new Error(`AI error: ${msg}`);
  }
  return salvage(d.choices?.[0]?.message?.content || '');
}
