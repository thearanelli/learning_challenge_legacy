const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const W = 1200;
const H = 630;

const communityCard = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0B1220"/>
  <rect width="${W}" height="${H}" fill="#111827"/>

  <!-- orange left bar -->
  <rect width="8" height="${H}" fill="#EA5329"/>

  <!-- circles -->
  <circle cx="1150" cy="80" r="180" fill="none" stroke="#EA5329" stroke-width="1" opacity="0.12"/>
  <circle cx="1150" cy="80" r="260" fill="none" stroke="#EA5329" stroke-width="1" opacity="0.06"/>

  <!-- card -->
  <rect x="80" y="80" width="1040" height="470" rx="16" fill="#0B1220" stroke="#2a3448" stroke-width="1"/>

  <!-- orange chip -->
  <rect x="1040" y="108" width="52" height="38" rx="5" fill="#EA5329"/>

  <!-- eyebrow -->
  <text x="108" y="140" font-family="Arial Black, Arial, sans-serif" font-size="13" fill="#EA5329" letter-spacing="3">NYC LEARNING CHALLENGE</text>
  <text x="108" y="162" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.35)" letter-spacing="2">MEMBER CARD</text>

  <!-- headline -->
  <text x="108" y="290" font-family="Arial Black, Arial, sans-serif" font-size="58" font-weight="900" fill="#ffffff">Welcome to</text>
  <text x="108" y="360" font-family="Arial Black, Arial, sans-serif" font-size="58" font-weight="900" fill="#ffffff">the community.</text>

  <!-- footer left -->
  <text x="108" y="490" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.3)" letter-spacing="2">COHORT</text>
  <text x="108" y="514" font-family="Arial Black, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">01 · SUMMER 2026</text>

  <!-- footer right -->
  <text x="1092" y="490" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.3)" letter-spacing="2" text-anchor="end">MEMBER SINCE</text>
  <text x="1092" y="514" font-family="Arial Black, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff" text-anchor="end">2026</text>
</svg>`;

const inviteCard = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#111827"/>

  <!-- orange left bar -->
  <rect width="8" height="${H}" fill="#EA5329"/>

  <!-- circles -->
  <circle cx="1150" cy="80" r="180" fill="none" stroke="#EA5329" stroke-width="1" opacity="0.18"/>
  <circle cx="1150" cy="80" r="260" fill="none" stroke="#EA5329" stroke-width="1" opacity="0.09"/>

  <!-- card with orange border -->
  <rect x="80" y="80" width="1040" height="470" rx="16" fill="#0B1220" stroke="#EA5329" stroke-width="1"/>

  <!-- orange chip -->
  <rect x="1040" y="108" width="52" height="38" rx="5" fill="#EA5329"/>

  <!-- eyebrow -->
  <text x="108" y="140" font-family="Arial Black, Arial, sans-serif" font-size="13" fill="#EA5329" letter-spacing="3">NYC LEARNING CHALLENGE</text>
  <text x="108" y="162" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.35)" letter-spacing="2">INVITATION</text>

  <!-- headline -->
  <text x="108" y="290" font-family="Arial Black, Arial, sans-serif" font-size="58" font-weight="900" fill="#ffffff">You've been</text>
  <text x="108" y="360" font-family="Arial Black, Arial, sans-serif" font-size="58" font-weight="900" fill="#ffffff">invited.</text>
  <text x="108" y="406" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.4)">A guaranteed spot in Cohort 01.</text>

  <!-- footer left -->
  <text x="108" y="490" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.3)" letter-spacing="2">COHORT</text>
  <text x="108" y="514" font-family="Arial Black, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">01 · SUMMER 2026</text>

  <!-- footer right -->
  <text x="1092" y="490" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.3)" letter-spacing="2" text-anchor="end">BY INVITATION ONLY</text>
  <text x="1092" y="514" font-family="Arial Black, Arial, sans-serif" font-size="16" font-weight="700" fill="#EA5329" text-anchor="end">LIMITED SPOTS</text>
</svg>`;

async function generate() {
  const outDir = path.join(__dirname, '..');

  await sharp(Buffer.from(communityCard))
    .png()
    .toFile(path.join(outDir, 'og-community.png'));
  console.log('Generated og-community.png');

  await sharp(Buffer.from(inviteCard))
    .png()
    .toFile(path.join(outDir, 'og-invite.png'));
  console.log('Generated og-invite.png');
}

generate().catch(console.error);
