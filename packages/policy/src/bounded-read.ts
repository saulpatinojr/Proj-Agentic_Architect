import { constants, closeSync, fstatSync, lstatSync, openSync, readSync } from 'node:fs';

/** Open once, validate the opened descriptor, then read at most limit+1 bytes. */
export function readBoundedFile(path: string, limit: number): Buffer {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1048576) throw new Error('Invalid bounded-file limit.');
  // On Windows O_NOFOLLOW is unavailable; bind the descriptor to the lstat identity.
  const before = process.platform === 'win32' ? lstatSync(path) : undefined;
  if (before && (!before.isFile() || before.isSymbolicLink())) throw new Error('Expected a regular non-symlink file.');
  // Never creates/truncates a file. An explicit restrictive mode also makes
  // the safe intent visible to analyzers that do not inspect numeric open flags.
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0), 0o600);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > limit || (before && (before.dev !== stat.dev || before.ino !== stat.ino))) {
      throw new Error('Expected a bounded regular file with unchanged identity.');
    }
    const bytes = Buffer.alloc(limit + 1);
    let count = 0;
    while (count < bytes.length) {
      const read = readSync(fd, bytes, count, bytes.length - count, count);
      if (!read) break;
      count += read;
    }
    if (count > limit) throw new Error('File exceeded its size limit.');
    return bytes.subarray(0, count);
  } finally { closeSync(fd); }
}
