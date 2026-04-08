// api/profile.js
// Returns read-only public profile data for a builder, gated by profile_token.
// Called on load by profile/index.html.
// GET only — no writes, no sensitive fields returned.

const ARCHETYPE_COLORS = {
  'The Builder':   '#C8F135',
  'The Narrator':  '#7B2FFF',
  'The Sonic':     '#38CFFF',
  'The Visionary': '#FF5C5C',
  'The Maker':     '#FFB840',
  'The Activist':  '#FF6B6B',
  'The Connector': '#A8D020',
  'The Pioneer':   '#9B5FFF',
};

const CARD_SYSTEM_PROMPT = `You generate trading card profiles for youth builders.
Return ONLY valid JSON — no preamble, no explanation, no markdown fences.
The JSON must have exactly these keys:
  archetype       — pick the single best fit from: The Builder, The Narrator, The Sonic, The Visionary, The Maker, The Activist, The Connector, The Pioneer
  archetype_color — the matching hex color for the archetype
  passion_title   — a short evocative title (3-5 words) capturing their passion
  bio             — one sentence, first person, that captures who they are as a builder
  badge           — a single emoji that fits their archetype and passion

Respond with nothing except the JSON object.`;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/applications?profile_token=eq.${encodeURIComponent(token)}&select=first_name,screening_status,submitted_at,application_responses`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const rows = await response.json();

    if (!rows.length) {
      return res.status(200).json({ found: false });
    }

    const { first_name, screening_status, submitted_at, application_responses } = rows[0];
    const responses = application_responses || {};

    // Generate trading card — never block response on failure
    let card = null;
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: CARD_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Name: ${first_name}\nPassion: ${responses.passion || ''}\nWhy join: ${responses.why_join || ''}`,
          }],
        }),
      });

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json();
        const rawText = (claudeData.content?.[0]?.text || '').trim();
        const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Always derive color from map — never trust Claude's hex
        const archetypeColor = ARCHETYPE_COLORS[parsed.archetype] || '#C8F135';

        card = {
          archetype:       parsed.archetype,
          archetype_color: archetypeColor,
          passion_title:   parsed.passion_title,
          bio:             parsed.bio,
          badge:           parsed.badge,
        };
      }
    } catch (cardErr) {
      console.error('[profile] card generation failed:', cardErr);
      card = null;
    }

    return res.status(200).json({
      found: true,
      data: { first_name, screening_status, submitted_at, application_responses },
      card,
    });

  } catch (err) {
    console.error('[profile] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
