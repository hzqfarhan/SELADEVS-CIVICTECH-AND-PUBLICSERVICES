/** Bound downloads while streaming, before allocating the full upstream response. */
export async function readResponseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) { await response.body?.cancel(); throw new Error(`Upstream response exceeds ${maxBytes} byte limit.`); }
  if (!response.body) throw new Error('Upstream response has no body.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error(`Upstream response exceeds ${maxBytes} byte limit.`); }
      chunks.push(value);
    }
    return Buffer.concat(chunks, size);
  } finally { reader.releaseLock(); }
}
