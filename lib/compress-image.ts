/** Shrinks pictures in the browser before they are uploaded to Supabase. */
const MAX_SIDE: Record<string, number> = { 'ppdt-scenes': 1200, 'candidate-photos': 700, 'ssb-centres': 600 };
const QUALITY = 0.78;

export async function compressImage(file: Blob, bucket: string, name = 'picture'): Promise<File> {
  const original = new File([file], name, { type: file.type });
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, (MAX_SIDE[bucket] || 1200) / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close();

    const toBlob = (type: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, QUALITY));
    let out = await toBlob('image/webp');
    // Some browsers cannot write WebP and silently return PNG instead.
    if (!out || out.type !== 'image/webp') out = await toBlob('image/jpeg');
    if (!out || out.size >= file.size) return original;
    const base = name.replace(/\.\w+$/, '');
    return new File([out], `${base}.${out.type.split('/')[1]}`, { type: out.type });
  } catch {
    return original; // never block an upload because compression failed
  }
}
