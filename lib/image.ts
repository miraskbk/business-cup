/** Longest side of a stored evidence photo, in pixels. */
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.85;

/**
 * Turns any image the browser can read into a JPEG no larger than 2000px on
 * its longest side. Phone photos are often 5-12 MB; this keeps uploads fast
 * and under the bucket's size limit, and makes the stored file a real .jpg.
 *
 * Browser only. Throws if the file is not an image the browser can decode.
 */
export async function toEvidenceJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // Respect the camera's rotation flag so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That file isn't an image this browser can read.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn't prepare the photo for upload.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Couldn't prepare the photo for upload.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
