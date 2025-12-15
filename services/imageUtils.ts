
/**
 * Normalizes an image by resizing it to a fixed width (1024px) 
 * and converting it to a standard JPEG format with fixed quality.
 * This ensures that the same image input produces a consistent base64 string
 * for caching purposes.
 */
export const normalizeImage = async (dataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1024;
      let width = img.width;
      let height = img.height;

      // Resize logic
      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Draw image to canvas (normalizes orientation/pixels)
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export as JPEG with fixed quality 0.9
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = (err) => reject(new Error("Image load failed for normalization"));
    img.src = dataUrl;
  });
};

/**
 * Generates a SHA-256 hash of the image data string.
 * Used as a deterministic fingerprint for cache keys.
 */
export const generateImageHash = async (dataString: string): Promise<string> => {
  if (!crypto || !crypto.subtle) {
    // Fallback for environments without crypto.subtle (unlikely in modern browsers)
    // Simple DJB2 hash for fallback
    let hash = 5381;
    for (let i = 0; i < dataString.length; i++) {
      hash = (hash * 33) ^ dataString.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  const msgBuffer = new TextEncoder().encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
