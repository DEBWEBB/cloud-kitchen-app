// src/utils/cropImage.js
export default function getCroppedImg(imageSrc, pixelCrop) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous"; // To avoid CORS issues
    image.src = imageSrc;

    image.onload = () => {
      // Validate crop data
      if (
        !pixelCrop ||
        typeof pixelCrop.x !== "number" ||
        typeof pixelCrop.y !== "number" ||
        typeof pixelCrop.width !== "number" ||
        typeof pixelCrop.height !== "number"
      ) {
        return reject(new Error("Invalid crop data"));
      }

      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          return reject(new Error("Canvas is empty"));
        }
        resolve(blob);
      }, "image/jpeg");
    };

    image.onerror = () => {
      reject(new Error("Failed to load image"));
    };
  });
}
