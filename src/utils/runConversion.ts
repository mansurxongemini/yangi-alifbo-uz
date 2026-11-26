import { convertFile, ConvertResult, ProgressFn, CancelledError } from './fileConverter';
import type { ConvertOptions } from '../core/engine';
import type { WorkerResponse } from '../workers/convert.worker';

export interface ConversionJob {
  promise: Promise<ConvertResult>;
  cancel: () => void;
}

/**
 * Faylni fon oqimida (Web Worker) oʻgiradi — sahifa katta arxivlarda ham qotib qolmaydi.
 * Worker ishga tushmasa (masalan, eski brauzer), asosiy oqimda bajariladi.
 */
export const startConversion = (file: File, opts: ConvertOptions, onProgress: ProgressFn): ConversionJob => {
  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL('../workers/convert.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
  }

  if (worker) {
    const w = worker;
    const signal = { aborted: false };
    let rejectFn: (e: Error) => void = () => {};
    const promise = new Promise<ConvertResult>((resolve, reject) => {
      rejectFn = reject;
      w.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        if (msg.type === 'progress') onProgress(msg.progress);
        else if (msg.type === 'done') {
          resolve(msg.result);
          w.terminate();
        } else {
          reject(msg.cancelled ? new CancelledError() : new Error(msg.message));
          w.terminate();
        }
      };
      w.onerror = (ev) => {
        ev.preventDefault();
        w.terminate();
        // Worker yuklanmadi — asosiy oqimda davom etamiz
        convertFile(file, file.name, opts, onProgress, signal).then(resolve, reject);
      };
      w.postMessage({ file, name: file.name, opts });
    });
    return {
      promise,
      cancel: () => {
        signal.aborted = true;
        w.terminate();
        rejectFn(new CancelledError());
      },
    };
  }

  const signal = { aborted: false };
  return {
    promise: convertFile(file, file.name, opts, onProgress, signal),
    cancel: () => {
      signal.aborted = true;
    },
  };
};
