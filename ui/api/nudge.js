// Vercel Serverless Function: POST /api/nudge
// Creates a GitHub Issue on caffeineGMT/hivemind tagged "nudge"
// The local poller picks it up and feeds it to the hivemind CLI

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { companyId, message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  try {
    const ghRes = await fetch('https://api.github.com/repos/caffeineGMT/hivemind/issues', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        title: `[nudge] ${message.slice(0, 80)}`,
        body: JSON.stringify({ companyId: companyId || null, message, timestamp: new Date().toISOString() }),
        labels: ['nudge'],
      }),
    });

    if (!ghRes.ok) {
      const err = await ghRes.text();
      return res.status(500).json({ error: 'GitHub API failed', detail: err });
    }

    const issue = await ghRes.json();
    return res.status(200).json({
      success: true,
      issueNumber: issue.number,
      message: 'Nudge queued — local agent will pick it up shortly.',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
