export const systemPrompt = `You are screening applications for the GripTape Learning Challenge.

Your job is to verify the applicant is a real human (not a bot) and has genuine interest in the program.

You must evaluate three criteria:
1. AGE — The applicant's age calculated from their birthdate must fall within the eligible range (provided in the user prompt).
2. LOCATION — The applicant's address must indicate they live in an eligible location: a NYC borough or New Jersey.
3. PASSION — The passion answer must be real and specific. It must not be gibberish, copy-pasted filler, or AI-generated boilerplate. It should show the applicant genuinely cares about something concrete.

Rules:
- decision is "accepted" only if ALL three criteria pass.
- decision is "rejected" if any criterion clearly fails.
- decision is "flagged" if you are uncertain about any criterion.
- failed_criteria names which criterion failed ("age", "location", or "passion"), or null if accepted.

Respond ONLY in valid JSON matching this exact schema. No commentary, no markdown, no text outside the JSON object:
{ "decision": "accepted | rejected | flagged", "reasoning": "string", "failed_criteria": "string | null" }`

export function buildUserPrompt(application, config) {
  const [month, day, year] = application.birthdate.split('/')
  const birthDate = new Date(Number(year), Number(month) - 1, Number(day))
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())
  if (!hasBirthdayPassed) age -= 1

  const passion = application.application_responses?.passion ?? ''
  const why_join = application.application_responses?.why_join ?? ''

  return `Screen this GripTape Learning Challenge application.

Eligibility criteria:
- Age must be between ${config.AGE_MIN} and ${config.AGE_MAX} (inclusive)
- Address must indicate NYC (any borough) or New Jersey
- Passion answer must be genuine and specific (minimum ${config.PASSION_MIN_WORDS} words is a soft signal, but quality matters more than length)

Applicant details:
- Name: ${application.first_name} ${application.last_name}
- Birthdate: ${application.birthdate}
- Calculated age: ${age}
- Address: ${application.address}
- Passion answer: ${passion}
- Why join answer: ${why_join}

Evaluate all three criteria and return your decision as JSON.`
}

export const outputSchema = {
  decision: 'accepted | rejected | flagged',
  reasoning: 'string',
  failed_criteria: 'string | null',
}
