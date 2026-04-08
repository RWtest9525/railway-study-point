/**
 * Image utilities for question images, option images, and category icons
 * Handles compression, upload, and validation
 */

export interface ImageUploadResult {
  url: string;
  thumbnailUrl?: string;
  size: number;
  width: number;
  height: number;
  type: string;
}

export interface ImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Image upload constraints
 */
export const IMAGE_CONSTRAINTS = {
  maxSize: 5 * 1024 * 1024, // 5MB
  maxQuestionImageSize: 2 * 1024 * 1024, // 2MB for question images
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxWidth: 1920,
  maxHeight: 1080,
  thumbnailSize: 200, // Thumbnail dimension
  quality: 0.8, // Compression quality
};

/**
 * Validate image file before upload
 */
export function validateImage(file: File, isQuestionImage: boolean = false): ImageValidationResult {
  const result: ImageValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check file type
  if (!IMAGE_CONSTRAINTS.allowedTypes.includes(file.type)) {
    result.valid = false;
    result.errors.push(`Invalid file type. Allowed: ${IMAGE_CONSTRAINTS.allowedTypes.join(', ')}`);
  }

  // Check file size
  const maxSize = isQuestionImage 
    ? IMAGE_CONSTRAINTS.maxQuestionImageSize 
    : IMAGE_CONSTRAINTS.maxSize;
  
  if (file.size > maxSize) {
    result.valid = false;
    result.errors.push(`File too large. Maximum size: ${formatFileSize(maxSize)}`);
  }

  // Warn if file is close to limit
  if (file.size > maxSize * 0.8) {
    result.warnings.push('File size is close to the limit. Consider compressing.');
  }

  return result;
}

/**
 * Format file size to human readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Compress image to reduce file size
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputFormat?: 'jpeg' | 'png' | 'webp';
  } = {}
): Promise<Blob> {
  const {
    maxWidth = IMAGE_CONSTRAINTS.maxWidth,
    maxHeight = IMAGE_CONSTRAINTS.maxHeight,
    quality = IMAGE_CONSTRAINTS.quality,
    outputFormat = 'jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          `image/${outputFormat}`,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(file: File, size: number = IMAGE_CONSTRAINTS.thumbnailSize): Promise<Blob> {
  return compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    outputFormat: 'jpeg',
  });
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert image to base64 for storage
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string): Blob {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Upload image to Firebase Storage
 * Returns the download URL
 */
export async function uploadImage(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult> {
  // Import Firebase Storage dynamically
  const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
  const { storage } = await import('./firebase');

  return new Promise(async (resolve, reject) => {
    try {
      // Compress image first
      const compressedBlob = await compressImage(file);
      
      // Create storage reference
      const storageRef = ref(storage, path);
      
      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, compressedBlob);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => reject(error),
        async () => {
          // Get download URL
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Get image dimensions
          const dimensions = await getImageDimensions(file);
          
          resolve({
            url,
            size: compressedBlob.size,
            width: dimensions.width,
            height: dimensions.height,
            type: file.type,
          });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImages(
  files: File[],
  basePath: string,
  onProgress?: (index: number, progress: number) => void
): Promise<ImageUploadResult[]> {
  const results: ImageUploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const timestamp = Date.now();
    const path = `${basePath}/${timestamp}_${i}_${files[i].name}`;
    const result = await uploadImage(files[i], path, (progress) => {
      onProgress?.(i, progress);
    });
    results.push(result);
  }
  
  return results;
}

/**
 * Delete image from storage
 */
export async function deleteImage(url: string): Promise<void> {
  const { getStorage, ref, deleteObject } = await import('firebase/storage');
  const { storage } = await import('./firebase');
  
  // Extract path from URL
  const urlParts = url.split('/o/');
  if (urlParts.length < 2) {
    throw new Error('Invalid storage URL');
  }
  
  const path = decodeURIComponent(urlParts[1].split('?')[0]);
  const imageRef = ref(storage, path);
  
  await deleteObject(imageRef);
}

/**
 * Create a preview URL for image selection
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Crop image to specific aspect ratio
 */
export async function cropImage(
  file: File,
  aspectRatio: { width: number; height: number },
  crop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas size to crop size
        canvas.width = crop.width;
        canvas.height = crop.height;

        // Draw cropped portion
        ctx.drawImage(
          img,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to crop image'));
            }
          },
          'image/jpeg',
          IMAGE_CONSTRAINTS.quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Optimize image for web (convert to WebP if supported)
 */
export async function optimizeForWeb(file: File): Promise<Blob> {
  // Check if WebP is supported
  const webpSupported = await checkWebPSupport();
  
  if (webpSupported && file.type !== 'image/webp') {
    return compressImage(file, {
      quality: 0.85,
      outputFormat: 'webp',
    });
  }
  
  return compressImage(file);
}

/**
 * Check if WebP format is supported
 */
function checkWebPSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve(false);
      return;
    }

    canvas.toBlob((blob) => {
      resolve(blob?.type === 'image/webp');
    }, 'image/webp');
  });
}

/**
 * Get file size after compression estimate
 */
export function estimateCompressedSize(file: File, quality: number = IMAGE_CONSTRAINTS.quality): number {
  // Rough estimate: original size * quality factor
  return Math.round(file.size * quality * 0.5);
}