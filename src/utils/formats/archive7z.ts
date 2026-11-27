/**
 * RAR, 7z, TAR, GZ va boshqa arxivlarni 7-Zip (WebAssembly) yordamida ochish.
 * Hammasi brauzerning o'zida bajariladi — hech narsa serverga yuborilmaydi.
 * 7-Zip moduli faqat shunday arxiv yuklanganda yuklanadi (asosiy sahifa og'irlashmaydi).
 */
import wasmUrl from '7z-wasm/7zz.wasm?url';

export interface ExtractedEntry {
  path: string;
  data: Uint8Array;
  date?: Date;
}

const isNode = typeof process !== 'undefined' && !!(process as { versions?: { node?: string } }).versions?.node;

type SevenZipModule = {
  FS: {
    mkdir(p: string): void;
    mount(type: unknown, opts: unknown, p: string): void;
    writeFile(p: string, d: Uint8Array): void;
    readFile(p: string): Uint8Array;
    readdir(p: string): string[];
    stat(p: string): { mode: number; mtime: Date };
    isDir(mode: number): boolean;
    unlink(p: string): void;
  };
  WORKERFS?: unknown;
  callMain(args: string[]): number;
};

export const extractWith7z = async (file: Blob, onLog?: (s: string) => void): Promise<ExtractedEntry[]> => {
  const mod = await import('7z-wasm');
  const log: string[] = [];
  const factory = mod.default as unknown as (o: Record<string, unknown>) => Promise<SevenZipModule>;
  const sz = await factory({
    print: (s: string) => log.push(s),
    printErr: (s: string) => log.push(s),
    ...(isNode ? {} : { locateFile: () => wasmUrl }),
  });

  sz.FS.mkdir('/in');
  let inPath = '/in/archive';
  let mounted = false;
  // Worker ichida faylni xotiraga ko'chirmasdan o'qish (katta arxivlar uchun)
  if (sz.WORKERFS && typeof (globalThis as { FileReaderSync?: unknown }).FileReaderSync !== 'undefined') {
    try {
      sz.FS.mount(sz.WORKERFS, { blobs: [{ name: 'archive', data: file }] }, '/in');
      mounted = true;
    } catch {
      mounted = false;
    }
  }
  if (!mounted) {
    inPath = '/archive';
    sz.FS.writeFile(inPath, new Uint8Array(await file.arrayBuffer()));
  }

  sz.FS.mkdir('/out');
  let code = 0;
  try {
    // -p: parol so'ralsa, kutib qolmasdan xato qaytarish
    code = sz.callMain(['x', inPath, '-o/out', '-y', '-pX', '-bso0', '-bsp0', '-sccUTF-8']);
  } catch (e) {
    code = typeof (e as { status?: number }).status === 'number' ? (e as { status: number }).status : 2;
  }
  onLog?.(log.join('\n'));

  const out: ExtractedEntry[] = [];
  const walk = (dir: string, rel: string) => {
    for (const name of sz.FS.readdir(dir)) {
      if (name === '.' || name === '..') continue;
      const full = `${dir}/${name}`;
      const st = sz.FS.stat(full);
      const r = rel ? `${rel}/${name}` : name;
      if (sz.FS.isDir(st.mode)) walk(full, r);
      else {
        out.push({ path: r, data: sz.FS.readFile(full), date: st.mtime });
        sz.FS.unlink(full); // xotirani bo'shatish uchun nusxadan keyin o'chiramiz
      }
    }
  };
  walk('/out', '');

  if (code !== 0 && out.length === 0) {
    const text = log.join(' ');
    if (/password|Wrong password|encrypted/i.test(text)) throw new Error('Arxiv parol bilan himoyalangan. Parolsiz arxiv yuklang.');
    throw new Error('Arxivni oçib bölmadi. U şikastlangan yoki qöllab-quvvatlanmaydigan formatda.');
  }
  return out;
};
