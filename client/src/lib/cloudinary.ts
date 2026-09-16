/**
 * رفع صور الأصناف على Cloudinary من المتصفح على طول (unsigned upload preset).
 *
 * مفيش سر في الكود: اسم الـcloud والـpreset الاتنين عامّين، والـpreset مسموح
 * ليه الرفع بس. سيرفر أسواق مبيشوفش الملف خالص — بيتخزن الرابط بس.
 *
 * ليه مش على سيرفرنا؟ قرص Render بيتمسح مع كل نشر، فالصور كانت هتضيع.
 */
const CLOUD = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim();
const PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '').trim();

/** الرفع متظبط؟ لو لأ بنخفي الزرار بدل ما نوقع المستخدم في خطأ */
export const uploadsConfigured = Boolean(CLOUD && PRESET);

/** حد الحساب المجاني في Cloudinary للصورة الواحدة */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** غلط متوقّع نعرضه للمستخدم زي ما هو */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

/** بيرفع الصورة ويرجّع رابطها الدائم */
export async function uploadImage(file: File): Promise<string> {
  if (!uploadsConfigured) throw new UploadError('رفع الصور مش متظبط في النسخة دي.');
  if (!file.type.startsWith('image/')) throw new UploadError('الملف ده مش صورة.');
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError('الصورة كبيرة — أقصى حجم ١٠ ميجا.');

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', PRESET);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body });
  } catch {
    throw new UploadError('مقدرناش نرفع الصورة. اتأكد من النت وجرّب تاني.');
  }

  if (!res.ok) throw new UploadError('رفع الصورة فشل. جرّب تاني.');

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new UploadError('رفع الصورة فشل. جرّب تاني.');
  return data.secure_url;
}
