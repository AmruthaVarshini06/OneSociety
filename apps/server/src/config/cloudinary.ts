import { v2 as cloudinaryV2 } from 'cloudinary';

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinaryV2 as cloudinary };

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  publicId?: string;
  overwrite?: boolean;
  tags?: string[];
  transformation?: Record<string, unknown>[];
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {},
): Promise<{ url: string; publicId: string; resourceType: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryV2.uploader.upload_stream(
      {
        folder: options.folder ?? 'onesociety',
        resource_type: options.resourceType ?? 'auto',
        public_id: options.publicId,
        overwrite: options.overwrite ?? false,
        tags: options.tags,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      },
    );
    uploadStream.end(buffer);
  });
}

export function getSignedUrl(
  publicId: string,
  expiresInSeconds: number,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinaryV2.url(publicId, {
    sign_url: true,
    expires_at: expiresAt,
    secure: true,
  });
}
