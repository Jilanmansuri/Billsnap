import sharp from 'sharp';

/**
 * Preprocesses a raw bill image buffer to maximize OCR and Vision AI accuracy on handwritten text.
 *
 * Steps performed:
 * 1. Auto-orient based on EXIF tags (fixes upside-down / sideways mobile captures)
 * 2. High-dynamic-range contrast stretching (makes faint pencil/ballpoint strokes darker)
 * 3. Color optimization (reduces paper background noise)
 * 4. High-resolution bounding-box resize (preserves fine digit strokes without exceeding API limits)
 * 5. Gentle unsharp masking (sharpens text edges)
 */
export async function preprocessBillImage(rawBuffer, originalMimeType = 'image/jpeg') {
  try {
    console.log(`🖼️ [imagePreprocessor] Preprocessing bill image (${(rawBuffer.length / 1024).toFixed(1)} KB)...`);

    const image = sharp(rawBuffer);
    const metadata = await image.metadata();

    console.log(`ℹ️ [imagePreprocessor] Original image dimensions: ${metadata.width}x${metadata.height}, format: ${metadata.format}, orientation: ${metadata.orientation || 'normal'}`);

    const processedBuffer = await sharp(rawBuffer)
      // 1. Auto-orient image based on EXIF tag
      .rotate()
      // 2. High-resolution fit inside 2048x2048 bounding box without distorting aspect ratio
      .resize({
        width: 2048,
        height: 2048,
        fit: 'inside',
        withoutEnlargement: true,
      })
      // 3. Contrast stretching: maximizes distinction between ink and paper
      .normalize()
      // 4. Subtle gamma & color tone leveling: clarifies faint pen strokes
      .modulate({
        brightness: 1.04,
        saturation: 0.85,
      })
      // 5. Gentle sharpening to emphasize handwriting curves and decimals
      .sharpen({
        sigma: 1.2,
        m1: 0.5,
        m2: 2.0,
      })
      // 6. Output as high-quality JPEG
      .jpeg({
        quality: 90,
        chromaSubsampling: '4:4:4',
      })
      .toBuffer();

    console.log(`✨ [imagePreprocessor] Image preprocessed successfully: ${(processedBuffer.length / 1024).toFixed(1)} KB`);

    return {
      processedBuffer,
      mimeType: 'image/jpeg',
      originalBuffer: rawBuffer,
      originalMimeType,
      isPreprocessed: true,
    };
  } catch (error) {
    console.warn(`⚠️ [imagePreprocessor] Preprocessing encountered an issue: ${error.message}. Proceeding with original buffer.`);
    return {
      processedBuffer: rawBuffer,
      mimeType: originalMimeType,
      originalBuffer: rawBuffer,
      originalMimeType,
      isPreprocessed: false,
    };
  }
}
