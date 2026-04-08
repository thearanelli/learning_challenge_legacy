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

const CARD_SYSTEM_PROMPT = `You generate builder profiles for GripTape Learning Challenge participants — a program that funds and mentors NYC teenagers to work on their passions.

Return ONLY valid JSON. No preamble, no explanation, no markdown fences.
Exactly these keys:

archetype — pick the single best fit from: The Builder, The Narrator, The Sonic, The Visionary, The Maker, The Activist, The Connector, The Pioneer

passion_title — 3-5 evocative words that name what they do. Not a sentence. A title. E.g. "Beat Architect" or "Bronx Visual Storyteller"

badge — a single emoji that fits their archetype and passion

archetype_description — 4-5 sentences written in a warm but authoritative voice. Structure exactly as follows:
  Sentence 1: Define what this archetype IS in general. Bold declarative that opens with the archetype name. E.g. "Sonics don't wait for a studio." Keep it under 10 words. No abbreviations, no numbers with periods, no em dashes that could confuse sentence detection.
  Sentences 2-3: Reflect their specific story back using details from their application — do NOT quote directly. Interpret and elevate. Make them feel deeply seen.
  Sentence 4: Start with "GripTape backs [archetype plural] because..." — explain why this archetype belongs in the program. Position GripTape as the backer, not the evaluator.
  Sentence 5: What's next — hint at what GripTape provides. Equipment, mentorship, audience, resources — whatever fits their passion.

Tone: warm, specific, earned. Never generic. Never evaluative. This person should feel chosen, not assessed.

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
          max_tokens: 800,
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
          archetype:             parsed.archetype,
          archetype_color:       archetypeColor,
          passion_title:         parsed.passion_title,
          archetype_description: parsed.archetype_description,
          badge:                 parsed.badge,
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
