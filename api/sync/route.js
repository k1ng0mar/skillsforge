import { clerkClient } from '@clerk/clerk-sdk-node';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

export async function POST(req, res) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let userId;
    try {
      const claims = await clerkClient.verifyToken(token);
      userId = claims.sub;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      body = {};
    }

    const { journeys, progress, memory, lessons, badges, dark, localUpdated = 0 } = body || {};

    const cloudRows = await sql`
      SELECT data, updated_at FROM user_data
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC LIMIT 1
    `;

    if (cloudRows.length === 0) {
      await sql`
        INSERT INTO user_data (user_id, data, updated_at)
        VALUES (
          ${userId},
          ${JSON.stringify({
            journeys: journeys || [],
            progress: progress || {},
            memory: memory || { cards: [], history: [] },
            lessons: lessons || {},
            badges: badges || [],
            dark: dark ?? true,
          })},
          NOW()
        )
      `;
      return res.status(201).json({ synced: true, source: 'local' });
    }

    const { data: cloudRaw, updated_at: cloudTs } = cloudRows[0];
    const cloudData = typeof cloudRaw === 'string' ? JSON.parse(cloudRaw) : cloudRaw;
    const cloudUpdated = new Date(cloudTs).getTime();
    const localTs = localUpdated ? new Date(localUpdated).getTime() : 0;

    if (cloudUpdated > localTs) {
      return res.status(200).json({ synced: true, source: 'cloud', data: cloudData });
    }

    await sql`
      UPDATE user_data
      SET data = ${JSON.stringify({
        journeys: journeys || cloudData.journeys,
        progress: progress || cloudData.progress,
        memory: memory || cloudData.memory,
        lessons: lessons || cloudData.lessons,
        badges: badges || cloudData.badges,
        dark: dark !== undefined ? dark : cloudData.dark,
      })},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    return res.status(200).json({ synced: true, source: 'local' });
  } catch (e) {
    console.error('Sync error:', e);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
