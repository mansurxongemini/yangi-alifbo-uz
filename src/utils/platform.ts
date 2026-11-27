/**
 * Platformaga bog'liq amallar: brauzer, desktop (Electron) va Android (Capacitor).
 *
 * Asosiy farq — faylni saqlash: Android WebView `<a download>` ni qo'llab-quvvatlamaydi,
 * shuning uchun u yerda fayl telefon xotirasiga yoziladi va "Ulashish" oynasi ochiladi.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';
export const isDesktopApp = (): boolean => typeof window !== 'undefined' && 'electronAPI' in window;

/** Papka tanlash (webkitdirectory) Android'da ishlamaydi. */
export const supportsFolderPick = (): boolean => !isNative();

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',', 2)[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export interface SaveOutcome {
  /** Foydalanuvchiga ko'rsatiladigan qisqa xabar (faqat telefonda) */
  message?: string;
}

/** Faylni saqlaydi: brauzer/desktop — oddiy yuklab olish, Android — xotiraga + ulashish. */
export const saveBlob = async (blob: Blob, filename: string): Promise<SaveOutcome> => {
  if (!isNative()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return {};
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const data = await blobToBase64(blob);
  const path = `Yangi Alifbo/${filename}`;
  let uri: string;
  let where: string;
  try {
    // Hujjatlar papkasiga — fayl menejerida "Documents/Yangi Alifbo" da ko'rinadi
    uri = (await Filesystem.writeFile({ path, data, directory: Directory.Documents, recursive: true })).uri;
    where = `Documents/Yangi Alifbo/${filename}`;
  } catch {
    // Ruxsat bo'lmasa — ilova keshiga (faqat ulashish orqali olinadi)
    uri = (await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true })).uri;
    where = '';
  }
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title: filename, files: [uri], dialogTitle: 'Faylni saqlaş yoki yuboriş' });
  } catch {
    /* foydalanuvchi ulashish oynasini yopdi */
  }
  return { message: where ? `Saqlandi: ${where}` : 'Fayl ulaşiş orqali saqlandi' };
};
