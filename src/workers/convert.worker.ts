/// <reference lib="webworker" />
import { convertFile, CancelledError, ProgressInfo } from '../utils/fileConverter';
import type { ConvertOptions } from '../core/engine';

export interface WorkerRequest {
  file: Blob;
  name: string;
  opts: ConvertOptions;
}

export type WorkerResponse =
  | { type: 'progress'; progress: ProgressInfo }
  | { type: 'done'; result: Awaited<ReturnType<typeof convertFile>> }
  | { type: 'error'; message: string; cancelled?: boolean };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let lastPost = 0;
ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { file, name, opts } = e.data;
  try {
    const result = await convertFile(file, name, opts, (progress) => {
      const now = Date.now();
      // Juda tez-tez xabar yubormaslik (UI ni band qilmaslik uchun)
      if (now - lastPost > 60 || progress.phase !== 'converting' || progress.done === progress.total) {
        lastPost = now;
        ctx.postMessage({ type: 'progress', progress } satisfies WorkerResponse);
      }
    });
    ctx.postMessage({ type: 'done', result } satisfies WorkerResponse);
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
      cancelled: err instanceof CancelledError,
    } satisfies WorkerResponse);
  }
};
