/**
 * Every image upload goes through the compressor.
 *
 * The point of a single reusable function is defeated the moment a new surface
 * takes a file straight from an `<input>` and posts it: the 2 MB cap is
 * enforced in four independent layers, so that surface silently rejects phone
 * photos again and nobody notices until an owner gives up mid-registration.
 *
 * A source sweep, because the failure is an ABSENT call — nothing a render test
 * on the surfaces that do it right would ever catch.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

/** Every surface that hands a user-picked image to the server. */
const IMAGE_SURFACES = [
  'components/custom/upload/image-upload.tsx',
  'app/business/registration/steps/Gallery.tsx',
  'app/business/[businessId]/profile/components/LogoUploader.tsx',
  // Shared once the shop gallery page became its second cross-feature importer.
  'components/custom/GalleryUploader.tsx',
  'app/business/[businessId]/profile/components/PersonalInfoForm.tsx',
  'app/business/[businessId]/branches/create/steps/step-branch-images.tsx',
  'app/business/[businessId]/branches/components/edit-branch.tsx',
  'app/admin/[adminId]/components/forms/inputs/AvatarUpload.tsx',
];

/**
 * Documents are NOT images. These upload raw bytes — a PDF re-encoded through a
 * canvas is a corrupt PDF — so they must stay off the list above.
 */
const DOCUMENT_SURFACES = [
  'app/business/[businessId]/branches/create/steps/step-branch-documents.tsx',
];

/**
 * Registration's documents step is BOTH: a photographed license is an image and
 * gets the same compression as every other image surface (a phone photo is
 * 3–6 MB against the 2 MB cap, and the step's own guidelines say "Scanned
 * copies or photos are acceptable"), while a true PDF/DOCX must still go
 * through untouched. So it lives on the image list for the call it makes, and
 * a separate guard asserts the compression is image-gated.
 */
const MIXED_DOCUMENT_IMAGE_SURFACES = [
  'app/business/registration/steps/Documents.tsx',
];

describe('image uploads compress first', () => {
  it('every image surface calls the shared compressor', () => {
    for (const file of IMAGE_SURFACES) {
      expect(
        read(file).includes('compressImage'),
        `${file} sends a picked image without compressing it`,
      ).toBe(true);
    }
  });

  it('nobody rolls their own canvas encode', () => {
    // One implementation: the EXIF-orientation trap, the animated-GIF trap and
    // the alpha trap are each solved once or not at all.
    for (const file of IMAGE_SURFACES) {
      const source = read(file);
      expect(source).not.toContain('createImageBitmap');
      expect(source).not.toContain('toBlob(');
    }
  });

  it('leaves document uploads alone', () => {
    for (const file of DOCUMENT_SURFACES) {
      expect(
        read(file).includes('compressImage'),
        `${file} uploads documents — running them through a canvas corrupts them`,
      ).toBe(false);
    }
  });

  it('registration compresses photographed documents, but only images', () => {
    for (const file of MIXED_DOCUMENT_IMAGE_SURFACES) {
      const source = read(file);
      // It calls the shared compressor (the image branch)…
      expect(source).toContain('compressImage');
      // …but gates it on the pick being an image, so a PDF/DOCX still travels
      // as raw bytes and a canvas can never corrupt it.
      expect(source).toContain("type.startsWith('image/')");
    }
  });

  it('the event form inherits it rather than duplicating it', () => {
    // It has no file input of its own; it mounts the shared field.
    const dialog = read('components/custom/events/EventFormDialog.tsx');
    expect(dialog).toContain('ImageUploadField');
    expect(dialog).not.toContain('type="file"');
  });
});
