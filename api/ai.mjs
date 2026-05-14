import { validateInput, callAI } from './ai-core.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...CORS, 'Allow': 'POST' });
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { prompt, system, model } = req.body;

  const error = validateInput(prompt, system, model);
  if (error) {
    return res.status(error.status).json({ error: error.error });
  }

  const result = await callAI(prompt, system, model);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.json(result.data);
}