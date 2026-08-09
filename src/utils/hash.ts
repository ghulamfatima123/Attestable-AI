export async function computeSHA256(data: unknown): Promise<string> {
  const json = JSON.stringify(data, null, 2);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}