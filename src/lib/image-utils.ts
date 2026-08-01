export function resizeImageFile(file: File, maxSize = 1200, quality = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("请上传图片文件"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("图片处理失败"));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(outputType, outputType === "image/jpeg" ? quality : undefined));
      };
      image.onerror = () => reject(new Error("图片读取失败"));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}
