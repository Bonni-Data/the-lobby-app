// Minimal TUS 1.0 client for resumable uploads to Bunny Stream (no dependencies).
// Create the upload, then send the file in chunks; on a failed chunk, ask the server
// for the current offset and resume from there.

export type TusOptions = {
  endpoint: string;
  headers: Record<string, string>;
  metadata: Record<string, string>;
  chunkSize?: number;
  onProgress?: (sent: number, total: number) => void;
};

type Res = { status: number; header: (name: string) => string | null };

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

function send(method: string, url: string, headers: Record<string, string>, body?: Blob, onSent?: (n: number) => void): Promise<Res> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open(method, url, true);
    Object.entries(headers).forEach(([k, v]) => x.setRequestHeader(k, v));
    if (onSent) x.upload.onprogress = (e) => onSent(e.loaded);
    x.onload = () => resolve({ status: x.status, header: (h) => x.getResponseHeader(h) });
    x.onerror = () => reject(new Error('network'));
    x.onabort = () => reject(new Error('aborted'));
    x.send(body ?? null);
  });
}

export async function tusUpload(file: Blob, o: TusOptions): Promise<void> {
  const base = { 'Tus-Resumable': '1.0.0', ...o.headers };
  const meta = Object.entries(o.metadata).map(([k, v]) => `${k} ${b64(v)}`).join(',');
  const created = await send('POST', o.endpoint, { ...base, 'Upload-Length': String(file.size), 'Upload-Metadata': meta });
  if (created.status !== 201) throw new Error(`tus_create_${created.status}`);
  const location = created.header('Location');
  if (!location) throw new Error('tus_no_location');
  const url = new URL(location, o.endpoint).toString();

  const chunk = o.chunkSize ?? 16 * 1024 * 1024;
  let offset = 0;
  let failures = 0;
  o.onProgress?.(0, file.size);
  while (offset < file.size) {
    const end = Math.min(offset + chunk, file.size);
    try {
      const start = offset;
      const res = await send(
        'PATCH',
        url,
        { ...base, 'Content-Type': 'application/offset+octet-stream', 'Upload-Offset': String(start) },
        file.slice(start, end),
        (n) => o.onProgress?.(Math.min(start + n, file.size), file.size),
      );
      if (res.status !== 204 && res.status !== 200) throw new Error(`tus_patch_${res.status}`);
      const next = Number(res.header('Upload-Offset'));
      offset = Number.isFinite(next) && next > start ? next : end;
      failures = 0;
      o.onProgress?.(offset, file.size);
    } catch (e) {
      failures += 1;
      if (failures > 5) throw e;
      await new Promise((r) => setTimeout(r, 1000 * failures * failures));
      const head = await send('HEAD', url, base).catch(() => null);
      const at = Number(head?.header('Upload-Offset'));
      if (Number.isFinite(at) && at >= 0) offset = at;
    }
  }
}
