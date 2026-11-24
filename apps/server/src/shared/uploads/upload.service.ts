/**
 * Upload service stub.
 * Full implementation in P4 (Cloudinary upload, signed URLs, file type/size checks).
 */
export async function uploadFile(
  _buffer: Buffer,
  _opts: { isPrivate?: boolean; purpose?: string; mimeType?: string },
): Promise<null> {
  console.info('[UPLOAD STUB] uploadFile called — full implementation in P4');
  return null;
}

export async function getSignedUrl(_uploadId: string): Promise<null> {
  console.info('[UPLOAD STUB] getSignedUrl called — full implementation in P4');
  return null;
}
