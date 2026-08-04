'use client';

/**
 * Blob store for the registration wizard's picked files, on IndexedDB.
 *
 * **Why not localStorage, which is what this replaced.** localStorage holds
 * STRINGS, so a file has to be base64'd (+33%) and browsers then count that
 * string as UTF-16 (×2). The quota is ~5 MB. `interior_images` requires at
 * least FOUR images of up to 2 MB each (`step3Schema`), so the smallest
 * conforming set is ~8 MB of bytes → ~10.7 MB of base64 → ~21 MB against a 5 MB
 * budget. It did not merely fail on large uploads; it could never have
 * succeeded, and every attempt threw `QuotaExceededError` inside the wizard.
 *
 * IndexedDB stores Blobs natively: no base64 inflation, no `atob` loop over
 * megabytes, and a quota measured in hundreds of MB rather than 5.
 *
 * **Best-effort by contract.** Every function resolves rather than rejects.
 * The cache exists so a reload does not lose a half-filled form; failing to
 * cache must never block the form itself. Private-mode browsers with IndexedDB
 * blocked simply get no caching.
 */

const DB_NAME = 'ilokal-registration-files';
const DB_VERSION = 1;
const STORE = 'files';

/**
 * Skip caching absurd payloads rather than filling the origin's quota. There is
 * no maximum image COUNT in the schema — only a 2 MB per-file cap — so an owner
 * picking forty photos is representable, and 25 MB comfortably covers a real
 * registration (logo + banner + 4-8 interiors + 2 documents).
 */
export const MAX_CACHE_BYTES = 25 * 1024 * 1024;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      // Some privacy modes throw on open rather than failing the request.
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // Keyed by field name — one entry per form field, holding its blobs.
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

/**
 * Runs one request and reports whether the TRANSACTION succeeded, separately
 * from what it returned.
 *
 * The distinction matters: a successful `delete` or `clear` has an `undefined`
 * result, so collapsing the two would make every write look like a failure.
 * `null` here means "the store could not be used"; `{ value }` means it worked.
 */
function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<{ value: T | null } | null> {
  return new Promise((resolve) => {
    void openDb().then((db) => {
      if (!db) {
        resolve(null);
        return;
      }

      try {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));

        // A write is only cached once the transaction COMMITS: `onsuccess`
        // fires first, and a commit-time abort (quota) after it would otherwise
        // be reported as a successful cache whose files vanish on reload. Reads
        // resolve on `onsuccess`, since there is nothing to commit.
        let value: T | null = null;
        request.onsuccess = () => {
          value = request.result ?? null;
          if (mode === 'readonly') resolve({ value });
        };
        request.onerror = () => resolve(null);
        tx.oncomplete = () => {
          db.close();
          resolve({ value });
        };
        tx.onabort = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    });
  });
}

/**
 * Store one field's files. Replaces whatever was there — the caller always
 * passes the field's complete current selection, so a merge would resurrect
 * images the owner had removed.
 */
export async function putFiles(
  fieldName: string,
  files: File[],
): Promise<boolean> {
  if (files.length === 0) {
    await removeFiles(fieldName);
    return true;
  }

  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_CACHE_BYTES) {
    // Leaving a stale entry behind would restore an older, smaller selection
    // over the one the owner can actually see.
    await removeFiles(fieldName);
    console.warn(
      `[fileCache] ${fieldName} is ${Math.round(total / 1024 / 1024)} MB — not cached. ` +
        'The form still works; the files just will not survive a reload.',
    );
    return false;
  }

  // Blobs, not the File objects themselves: structured-clone handles both, but
  // a File carries a name and lastModified that the metadata in localStorage
  // already holds, and Safari has historically been unreliable cloning File.
  const records = files.map((file) => ({
    blob: file.slice(0, file.size, file.type),
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
  }));

  const result = await run('readwrite', (store) =>
    store.put(records, fieldName),
  );
  return result !== null;
}

interface StoredFile {
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
}

/** Rehydrate one field's files. Empty array = nothing cached (never an error). */
export async function getFiles(fieldName: string): Promise<File[]> {
  const result = await run<StoredFile[]>(
    'readonly',
    (store) => store.get(fieldName) as IDBRequest<StoredFile[]>,
  );

  const records = result?.value;
  if (!Array.isArray(records)) return [];

  return records
    .filter((record) => record?.blob instanceof Blob)
    .map(
      (record) =>
        new File([record.blob], record.name, {
          type: record.type,
          lastModified: record.lastModified,
        }),
    );
}

export async function removeFiles(fieldName: string): Promise<void> {
  await run('readwrite', (store) => store.delete(fieldName));
}

export async function clearAllFiles(): Promise<void> {
  await run('readwrite', (store) => store.clear());
}
