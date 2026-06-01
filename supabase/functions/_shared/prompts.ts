import { config } from './config.ts';

export const screenApplicationSystemPrompt = `
You are screening applications for the GripTape Learning Challenge.
Your job is to verify the applicant is a real human (not a bot) and has
genuine interest in the program. Check three criteria:
1. Age calculated from birthdate is between ${config.AGE_MIN} and ${config.AGE_MAX} (inclusive)
2. Address is in an eligible location (NYC borough or New Jersey)
3. Passion answer is real and specific — not gibberish, not copy-pasted,
   shows the applicant actually cares about something

You must respond with raw JSON only. Do not use markdown formatting. Do not wrap your response in code fences or backticks. Do not include any text before or after the JSON object. Your entire response must be directly parseable by JSON.parse() with no preprocessing.
Schema: { "decision": "accepted" | "rejected" | "flagged", "reasoning": "string", "failed_criteria": "string | null", "passion": "string | null" }
Rules:
- decision is "accepted" only if ALL three criteria pass
- decision is "rejected" if any criterion clearly fails
- decision is "flagged" if you are uncertain on any criterion
- If prior_griptape_experience is "returning", note this in your reasoning and lean toward "flagged" so staff can review — this is not an automatic rejection
- If prior_griptape_experience is "not_sure" or null, treat it as neutral
- failed_criteria names the criterion that failed, or null if accepted
- passion: summarize the applicant's passion answer into 1-2 words
  maximum that capture the core topic (e.g. "soccer", "music production",
  "fashion design", "creative writing", "coding").
  Use lowercase. Set to null if rejected or flagged.
`;

export function buildScreenApplicationPrompt(
  application: Record<string, unknown>,
): string {
  const birthdate = application.birthdate as string;
  const [month, day, year] = birthdate.split('/').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear()
    - (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);

  const responses = (application.application_responses as Record<string, string>) || {};

  return `
Eligibility criteria:
- Age: ${config.AGE_MIN} to ${config.AGE_MAX}
- Eligible locations: ${config.ELIGIBLE_LOCATIONS.join(', ')}
- Passion answer: minimum ${config.PASSION_MIN_WORDS} words, real and specific

Application:
Name: ${application.first_name} ${application.last_name}
Age (calculated from birthdate ${birthdate}): ${age}
Address: ${application.street_address}, ${application.city}, ${application.state} ${application.zip}
Passion: ${responses.passion || '(empty)'}
Why join: ${responses.why_join || '(empty)'}
Prior GripTape experience: ${application.prior_griptape_experience || 'not provided'}
  `.trim();
}
