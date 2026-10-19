// Google Drive via service account — WebCrypto RS256 JWT, no dependencies.
// Also holds the shared "get me this signed PDF" fallback chain used by
// process-grant-signed and grant-review.

let cachedToken: { token: string; exp: number } | null = null;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp - 60000) return cachedToken.token;
  const email = Deno.env.get('GOOGLE_SA_EMAIL')!;
  const rawKey = Deno.env.get('GOOGLE_SA_PRIVATE_KEY')!.replace(/\\n/g, '\n');
  const pem = rawKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const iat = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(enc.encode(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  })));
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${header}.${claims}`)),
  );
  const jwt = `${header}.${claims}.${b64url(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

export function driveFileName(firstName: string, lastName: string, doc: 'W9' | 'Agreement'): string {
  const clean = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${clean(firstName)}_${clean(lastName)}_${doc}.pdf`;
}

export function driveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

// Create, or overwrite-in-place when fileId is provided. If the stored file
// was manually deleted (404 on update), falls through to create. Returns file id.
export async function uploadPdf(opts: { fileId?: string | null; name: string; bytes: Uint8Array }): Promise<string> {
  const token = await getAccessToken();
  const folderId = Deno.env.get('GDRIVE_GRANT_FOLDER_ID')!;
  if (opts.fileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${opts.fileId}?uploadType=media&supportsAllDrives=true`,
      { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/pdf' }, body: opts.bytes },
    );
    if (res.ok) return (await res.json()).id;
    if (res.status !== 404) throw new Error(`Drive update failed: ${res.status} ${await res.text()}`);
  }
  const metadata = JSON.stringify({ name: opts.name, parents: [folderId], mimeType: 'application/pdf' });
  const boundary = 'gtboundary' + crypto.randomUUID();
  const enc = new TextEncoder();
  const pre = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`);
  const post = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(pre.length + opts.bytes.length + post.length);
  body.set(pre, 0);
  body.set(opts.bytes, pre.length);
  body.set(post, pre.length + opts.bytes.length);
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
    { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body },
  );
  if (!res.ok) throw new Error(`Drive create failed: ${res.status} ${await res.text()}`);
  return (await res.json()).id;
}

export async function downloadPdf(fileId: string): Promise<Uint8Array | null> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { 'Authorization': `Bearer ${token}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Drive download failed: ${res.status} ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function findFileIdByName(name: string): Promise<string | null> {
  const token = await getAccessToken();
  const folderId = Deno.env.get('GDRIVE_GRANT_FOLDER_ID')!;
  const q = encodeURIComponent(`name = '${name}' and '${folderId}' in parents and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { 'Authorization': `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Drive search failed: ${res.status} ${await res.text()}`);
  const files = (await res.json()).files ?? [];
  return files[0]?.id ?? null;
}

// Fallback chain for a signed doc: stored Drive id -> folder search by exact
// filename (covers a manual delete+reupload) -> BoldSign download.
// driveFileId in the result is the Drive id actually used (null if BoldSign).
export async function fetchGrantPdf(opts: {
  driveFileId?: string | null;
  fileName: string;
  boldsignDocumentId?: string | null;
}): Promise<{ bytes: Uint8Array; driveFileId: string | null } | null> {
  try {
    if (opts.driveFileId) {
      const bytes = await downloadPdf(opts.driveFileId);
      if (bytes) return { bytes, driveFileId: opts.driveFileId };
    }
    const foundId = await findFileIdByName(opts.fileName);
    if (foundId) {
      const bytes = await downloadPdf(foundId);
      if (bytes) return { bytes, driveFileId: foundId };
    }
  } catch (err) {
    console.error('[gdrive] Drive fetch failed, falling back to BoldSign:', err);
  }
  if (opts.boldsignDocumentId) {
    const res = await fetch(
      `https://api.boldsign.com/v1/document/download?documentId=${opts.boldsignDocumentId}`,
      { headers: { 'X-API-KEY': Deno.env.get('BOLDSIGN_API_KEY')! } },
    );
    if (res.ok) return { bytes: new Uint8Array(await res.arrayBuffer()), driveFileId: null };
  }
  return null;
}
