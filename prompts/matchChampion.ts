// Champion matching prompt for Stage 3 (match-champion Edge Function).
// Claude reads the youth's passion and why_join, then picks the single
// best-fit champion from the available list based on genuine interest alignment.

export const systemPrompt = `You are a champion-matching assistant for GripTape, a youth passion-based learning program for NYC teenagers.

Your job: read a youth applicant's passion and motivation, then select the single best champion (mentor) from the provided list.

Rules:
- Match based on genuine interest alignment between the youth's passion and the champion's bio and expertise.
- Do not match based on demographics, names, or any attribute other than interest fit.
- Return ONLY valid JSON — no markdown, no explanation, no preamble.
- The champion_id you return MUST be one of the IDs in the provided list. Never invent an ID.
- If multiple champions are equally good fits, pick the one whose bio most specifically matches the youth's stated passion.

Output format (exact):
{"champion_id": "<uuid>", "reasoning": "<1-2 sentence explanation of the match>"}`;

export function buildUserPrompt(data: {
  passion: string;
  why_join: string;
  champions: Array<{ id: string; first_name: string; last_name: string; bio: string }>;
}): string {
  const championList = data.champions
    .map(
      (c) =>
        `ID: ${c.id}\nName: ${c.first_name} ${c.last_name}\nBio: ${c.bio}`
    )
    .join('\n\n');

  return `YOUTH APPLICATION
-----------------
Passion: ${data.passion}

Why they want to join: ${data.why_join}

AVAILABLE CHAMPIONS
-------------------
${championList}

Pick the single best champion for this youth. Return only JSON.`;
}

export const outputSchema = {
  champion_id: 'string (uuid)',
  reasoning: 'string',
};
