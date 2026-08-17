'use client';

import { useEffect, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { BusinessProps } from '../validator/business-registration-form-schema';
import { putFiles, getFiles, removeFiles, clearAllFiles } from './fileCache';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

const FORM_CACHE_KEY = 'ilokal-business-registration-cache';

/**
 * Legacy localStorage keys, kept only to be READ ONCE and then deleted.
 *
 * File bytes used to be base64'd into localStorage, which threw
 * `QuotaExceededError` for every conforming `interior_images` selection (four
 * files of up to 2 MB is ~21 MB against a ~5 MB quota — see `fileCache.ts`).
 * The bytes live in IndexedDB now. This prefix survives so an owner who is
 * mid-registration when this ships keeps whatever small files DID fit, and so
 * the dead entries stop occupying the quota for everything else that uses it.
 * Safe to delete this migration path once it has been in production a release.
 */
const LEGACY_FILE_CACHE_PREFIX = 'ilokal-file-cache-';

const LEGACY_FILE_FIELDS = [
  'shop_logo',
  'shop_banner',
  'business_license',
  'tax_certificate',
  'interior_images',
] as const;

interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

interface CachedData {
  timestamp: number;
  data: {
    business_category?: BusinessProps['business_category'];
    shop_name?: BusinessProps['shop_name'];
    description?: BusinessProps['description'];
    location?: BusinessProps['location'];
    /**
     * The menu, cached whole. It is small JSON with no file bytes, which is
     * exactly why it lives here and not in the IndexedDB store beside it —
     * that store exists because file bytes base64'd into localStorage blew the
     * quota.
     */
    offerings?: BusinessProps['offerings'];
    fileMetadata?: {
      [K in keyof Pick<
        BusinessProps,
        'shop_logo' | 'shop_banner' | 'business_license' | 'tax_certificate'
      >]?: FileMetadata;
    } & {
      interior_images?: FileMetadata[];
    };
  };
}

type SingleFileField =
  | 'shop_logo'
  | 'shop_banner'
  | 'business_license'
  | 'tax_certificate';

export function useFormCache(form: UseFormReturn<BusinessProps>) {
  const [isHydrated, setIsHydrated] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cache form values (excluding files)
  const cacheFormData = () => {
    if (typeof window === 'undefined') return;

    try {
      const values = form.getValues();
      const {
        shop_logo,
        shop_banner,
        interior_images,
        business_license,
        tax_certificate,
      } = values;

      // Store non-file data.
      //
      // `offerings` belongs here, not in the IndexedDB store beside it: that
      // store exists for FILE BYTES, which is what blew the localStorage quota
      // when they were base64'd. A menu is small JSON, and the step
      // deliberately carries no images.
      const dataToCache: Partial<BusinessProps> = {
        business_category: values.business_category,
        shop_name: values.shop_name,
        description: values.description,
        location: values.location,
        offerings: values.offerings,
      };

      // Store file metadata (names, sizes) but not the actual file content
      const fileMetadata = {
        shop_logo: undefined as FileMetadata | undefined,
        shop_banner: undefined as FileMetadata | undefined,
        business_license: undefined as FileMetadata | undefined,
        tax_certificate: undefined as FileMetadata | undefined,
        interior_images: undefined as FileMetadata[] | undefined,
      };

      if (shop_logo) {
        fileMetadata.shop_logo = {
          name: shop_logo.name,
          size: shop_logo.size,
          type: shop_logo.type,
          lastModified: shop_logo.lastModified,
        };
      }

      if (shop_banner) {
        fileMetadata.shop_banner = {
          name: shop_banner.name,
          size: shop_banner.size,
          type: shop_banner.type,
          lastModified: shop_banner.lastModified,
        };
      }

      if (business_license) {
        fileMetadata.business_license = {
          name: business_license.name,
          size: business_license.size,
          type: business_license.type,
          lastModified: business_license.lastModified,
        };
      }

      if (tax_certificate) {
        fileMetadata.tax_certificate = {
          name: tax_certificate.name,
          size: tax_certificate.size,
          type: tax_certificate.type,
          lastModified: tax_certificate.lastModified,
        };
      }

      if (interior_images && interior_images.length > 0) {
        fileMetadata.interior_images = interior_images.map((img: File) => ({
          name: img.name,
          size: img.size,
          type: img.type,
          lastModified: img.lastModified,
        }));
      }

      const cached: CachedData = {
        timestamp: Date.now(),
        data: {
          ...dataToCache,
          ...(Object.keys(fileMetadata).length > 0 ? { fileMetadata } : {}),
        },
      };

      localStorage.setItem(FORM_CACHE_KEY, JSON.stringify(cached));
    } catch (error: unknown) {
      console.error('Failed to cache form data:', formatErrorForLog(error));
    }
  };

  /**
   * Read a field's files back.
   *
   * IndexedDB first; a legacy localStorage entry is used only if IndexedDB has
   * nothing, and is deleted either way (see `LEGACY_FILE_CACHE_PREFIX`). The
   * metadata argument supplies the names and timestamps, because the store
   * holds bytes and the form cache holds the labels.
   */
  const restoreFilesFromCache = async (
    fieldName: string,
    filesMetadata: FileMetadata[],
  ): Promise<File[]> => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = await getFiles(fieldName);
      if (stored.length > 0) return stored;

      return readLegacyFiles(fieldName, filesMetadata);
    } catch (error: unknown) {
      console.warn(`[useFormCache] could not restore ${fieldName}:`, error);
      return [];
    }
  };

  /** Clear one field. Fire-and-forget so the caller's signature is unchanged. */
  const clearFileCache = (fieldName: string) => {
    if (typeof window === 'undefined') return;
    void removeFiles(fieldName);
    purgeLegacyKey(fieldName);
  };

  const cacheFile = async (fieldName: string, file: File) => {
    if (typeof window === 'undefined') return;
    await putFiles(fieldName, [file]);
  };

  const cacheFiles = async (fieldName: string, files: File[]) => {
    if (typeof window === 'undefined') return;
    await putFiles(fieldName, files);
  };

  /**
   * One-time read of the old base64 entries.
   *
   * Anything large never made it in — the write threw — so in practice this
   * recovers a logo or a banner, not a gallery. It purges as it reads, so the
   * dead bytes stop counting against the origin's localStorage quota.
   */
  const readLegacyFiles = (
    fieldName: string,
    filesMetadata: FileMetadata[],
  ): File[] => {
    const key = `${LEGACY_FILE_CACHE_PREFIX}${fieldName}`;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];

      const parsed: { dataURL?: string; dataURLs?: string[] } = JSON.parse(raw);
      const dataURLs =
        parsed.dataURLs ?? (parsed.dataURL ? [parsed.dataURL] : []);

      const files = dataURLs.flatMap((dataURL, i) => {
        const metadata = filesMetadata[i];
        if (!metadata) return [];
        return [
          new File([dataURLtoBlob(dataURL)], metadata.name, {
            type: metadata.type,
            lastModified: metadata.lastModified,
          }),
        ];
      });

      // Migrate forward so the next reload comes from IndexedDB.
      if (files.length > 0) void putFiles(fieldName, files);
      return files;
    } catch (error: unknown) {
      console.warn(
        `[useFormCache] legacy cache for ${fieldName} unusable:`,
        error,
      );
      return [];
    } finally {
      purgeLegacyKey(fieldName);
    }
  };

  const purgeLegacyKey = (fieldName: string) => {
    try {
      localStorage.removeItem(`${LEGACY_FILE_CACHE_PREFIX}${fieldName}`);
    } catch {
      // Storage unavailable; there is nothing occupying the quota either.
    }
  };

  // Helper: Convert DataURL to Blob (legacy entries only)
  const dataURLtoBlob = (dataURL: string): Blob => {
    const [header, base64] = dataURL.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  };

  // Restore cached data on mount
  useEffect(() => {
    if (typeof window === 'undefined' || isHydrated) return;

    let cancelled = false;

    const restoreCache = async () => {
      try {
        const cached = localStorage.getItem(FORM_CACHE_KEY);
        if (cached) {
          const { data, timestamp }: CachedData = JSON.parse(cached);

          // Only restore if cache is not too old (e.g., 7 days)
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
          if (Date.now() - timestamp > maxAge) {
            localStorage.removeItem(FORM_CACHE_KEY);
            return;
          }

          // Restore simple fields
          if (data.business_category) {
            form.setValue('business_category', data.business_category);
          }
          if (data.shop_name) {
            form.setValue('shop_name', data.shop_name);
          }
          if (data.description) {
            form.setValue('description', data.description);
          }
          if (data.location) {
            form.setValue('location', data.location);
          }
          if (Array.isArray(data.offerings)) {
            form.setValue('offerings', data.offerings);
          }

          // Restore files if metadata exists
          if (data.fileMetadata) {
            const { fileMetadata } = data;

            // Restore single files
            const singleFileFields: SingleFileField[] = [
              'shop_logo',
              'shop_banner',
              'business_license',
              'tax_certificate',
            ];
            const restorePromises: Promise<void>[] = [];

            for (const field of singleFileFields) {
              const metadata = fileMetadata[field as SingleFileField];
              if (metadata) {
                // Single fields are stored as a one-element list, so one code
                // path covers both shapes.
                const p = restoreFilesFromCache(field, [metadata]).then(
                  (files) => {
                    if (cancelled) return;
                    if (files[0]) {
                      form.setValue(field, files[0]);
                    }
                  },
                );
                restorePromises.push(p);
              }
            }

            // Restore multiple files (interior_images)
            if (fileMetadata.interior_images) {
              const p = restoreFilesFromCache(
                'interior_images',
                fileMetadata.interior_images,
              ).then((files) => {
                if (cancelled) return;
                if (files.length > 0) {
                  form.setValue('interior_images', files);
                }
              });
              restorePromises.push(p);
            }

            // Wait for all file restores to complete before marking hydrated
            await Promise.all(restorePromises);
          }
        }
      } catch (error: unknown) {
        console.error(
          'Failed to restore cached data:',
          formatErrorForLog(error),
        );
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
          // Trigger initial validation after hydration
          form.trigger();
        }
      }
    };

    restoreCache();

    return () => {
      cancelled = true;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [form]); // run once on mount

  // Watch for changes and cache (debounced) - only after hydration
  useEffect(() => {
    if (!isHydrated) return;

    const subscription = form.watch(() => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        cacheFormData();
      }, 1000); // Debounce for 1 second
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [form, isHydrated]);

  // Clear cache (e.g., on successful submission)
  const clearCache = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(FORM_CACHE_KEY);
      // Both stores: the bytes live in IndexedDB, and any legacy localStorage
      // entry has to go too or a completed registration keeps 5 MB of dead
      // base64 for the rest of the origin's life.
      void clearAllFiles();
      for (const field of LEGACY_FILE_FIELDS) purgeLegacyKey(field);
    } catch (error: unknown) {
      console.error('Failed to clear cache:', formatErrorForLog(error));
    }
  };

  return {
    cacheFormData,
    clearCache,
    cacheFile,
    cacheFiles,
    clearFileCache,
    isHydrated,
  };
}
