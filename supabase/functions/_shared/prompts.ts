import { config } from './config.ts';

export const screenApplicationSystemPrompt = `
You are screening applications for the GripTape Learning Challenge.
Your job is to verify the applicant is a real human (not a bot) and has
genuine interest in the program. Check three criteria:
1. Age calculated from birthdate is between ${config.AGE_MIN} and ${config.AGE_MAX} (inclusive)
2. Address is in an eligible location (NYC borough or New Jersey)
3. Passion answer is real and specific — not gibberish, not copy-pasted,
   shows the applicant actually cares about something

Respond ONLY in valid JSON. No commentary outside the JSON.
Schema: { "decision": "accepted" | "rejected" | "flagged", "reasoning": "string", "failed_criteria": "string | null" }
Rules:
- decision is "accepted" only if ALL three criteria pass
- decision is "rejected" if any criterion clearly fails
- decision is "flagged" if you are uncertain on any criterion
- failed_criteria names the criterion that failed, or null if accepted
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
Address: ${application.address}
Passion: ${responses.passion || '(empty)'}
Why join: ${responses.why_join || '(empty)'}
  `.trim();
}
