'use client';

import { useEffect, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { BusinessProps } from '../validator/business-registration-form-schema';

const FORM_CACHE_KEY = 'ilokal-business-registration-cache';
const FILE_CACHE_PREFIX = 'ilokal-file-cache-';

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

      // Store non-file data
      const dataToCache: Partial<BusinessProps> = {
        business_category: values.business_category,
        shop_name: values.shop_name,
        description: values.description,
        location: values.location,
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
      console.error('Failed to cache form data:', error);
    }
  };

  // Restore file from cache
  const restoreFileFromCache = async (
    fieldName: string,
    metadata: FileMetadata,
  ): Promise<File | null> => {
    if (typeof window === 'undefined') return null;

    try {
      const cacheKey = `${FILE_CACHE_PREFIX}${fieldName}`;
      const cachedFile = localStorage.getItem(cacheKey);

      if (cachedFile) {
        const { dataURL } = JSON.parse(cachedFile);
        const blob = await dataURLtoBlob(dataURL);
        return new File([blob], metadata.name, {
          type: metadata.type,
          lastModified: metadata.lastModified,
        });
      }
    } catch (error: unknown) {
      console.error(`Failed to restore file ${fieldName}:`, error);
    }
    return null;
  };

  // Restore multiple files
  const restoreFilesFromCache = async (
    fieldName: string,
    filesMetadata: FileMetadata[],
  ): Promise<File[]> => {
    if (typeof window === 'undefined') return [];

    try {
      const cacheKey = `${FILE_CACHE_PREFIX}${fieldName}`;
      const cachedFiles = localStorage.getItem(cacheKey);

      if (cachedFiles) {
        const { dataURLs }: { dataURLs: string[] } = JSON.parse(cachedFiles);

        const files = await Promise.all(
          dataURLs.map(async (dataURL, i) => {
            const blob = await dataURLtoBlob(dataURL);
            return new File([blob], filesMetadata[i].name, {
              type: filesMetadata[i].type,
              lastModified: filesMetadata[i].lastModified,
            });
          }),
        );

        return files;
      }
    } catch (error: unknown) {
      console.error(`Failed to restore files ${fieldName}:`, error);
    }
    return [];
  };

  // Clear file cache
  const clearFileCache = (fieldName: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${FILE_CACHE_PREFIX}${fieldName}`);
    } catch (error: unknown) {
      console.error(`Failed to clear file cache for ${fieldName}:`, error);
    }
  };

  // Cache individual file as DataURL
  const cacheFile = async (fieldName: string, file: File) => {
    if (typeof window === 'undefined') return;

    try {
      const dataURL = await fileToDataURL(file);
      localStorage.setItem(
        `${FILE_CACHE_PREFIX}${fieldName}`,
        JSON.stringify({ dataURL }),
      );
    } catch (error: unknown) {
      console.error(`Failed to cache file ${fieldName}:`, error);
    }
  };

  // Cache multiple files
  const cacheFiles = async (fieldName: string, files: File[]) => {
    if (typeof window === 'undefined') return;

    try {
      const dataURLs = await Promise.all(
        files.map((file) => fileToDataURL(file)),
      );
      localStorage.setItem(
        `${FILE_CACHE_PREFIX}${fieldName}`,
        JSON.stringify({ dataURLs }),
      );
    } catch (error: unknown) {
      console.error(`Failed to cache files ${fieldName}:`, error);
    }
  };

  // Helper: Convert File to DataURL
  const fileToDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Helper: Convert DataURL to Blob
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
                const p = restoreFileFromCache(field, metadata).then((file) => {
                  if (cancelled) return;
                  if (file) {
                    form.setValue(field, file);
                  }
                });
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
        console.error('Failed to restore cached data:', error);
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
      localStorage.removeItem(`${FILE_CACHE_PREFIX}shop_logo`);
      localStorage.removeItem(`${FILE_CACHE_PREFIX}shop_banner`);
      localStorage.removeItem(`${FILE_CACHE_PREFIX}business_license`);
      localStorage.removeItem(`${FILE_CACHE_PREFIX}tax_certificate`);
      localStorage.removeItem(`${FILE_CACHE_PREFIX}interior_images`);
    } catch (error: unknown) {
      console.error('Failed to clear cache:', error);
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
