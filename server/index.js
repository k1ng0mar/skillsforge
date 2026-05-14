import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { validateInput, callAI } from '../api/ai-core.mjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.post('/api/ai', async (req, res) => {
  const { prompt, system, model } = req.body;

  const error = validateInput(prompt, system, model);
  if (error) {
    return res.status(error.status).json({ error: error.error });
  }

  const result = await callAI(prompt, system, model);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json(result.data);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));