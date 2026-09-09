type ParseProgress = (message: string) => void;

const MIN_EXTRACTED_TEXT_LENGTH = 80;
const PDF_RENDER_SCALE = 1.8;
const MAX_PDF_OCR_SIDE = 1800;

interface PdfViewportLike {
  width: number;
  height: number;
}

interface PdfPageLike {
  getViewport: (options: { scale: number }) => PdfViewportLike;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewportLike;
  }) => { promise: Promise<void> };
}

interface PdfDocumentLike {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
  destroy?: () => Promise<void> | void;
}

function normalizeText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeOCRText(text: string) {
  let normalized = normalizeText(text)
    .replace(/\bAl\b/g, "AI")
    .replace(/\b0CR\b/g, "OCR")
    .replace(/\bOＣR\b/g, "OCR");

  let previous = "";
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(/([\u3400-\u9fff])[ \t]+([\u3400-\u9fff])/g, "$1$2");
  }

  return normalized;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

async function createOCRWorker(onProgress: ParseProgress) {
  const tesseract = await import("tesseract.js");

  return tesseract.createWorker("chi_sim+eng", undefined, {
    logger: (message) => {
      if (message.status === "recognizing text") {
        onProgress(`OCR 识别中：${Math.round(message.progress * 100)}%`);
      }
    },
  });
}

async function recognizeImageFile(file: File, onProgress: ParseProgress) {
  onProgress("正在加载 OCR 引擎...");
  const worker = await createOCRWorker(onProgress);

  try {
    onProgress("正在识别图片简历...");
    const result = await worker.recognize(file, { rotateAuto: true });
    return normalizeOCRText(result.data.text);
  } finally {
    await worker.terminate();
  }
}

async function loadPdfJS() {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
  return pdfjs;
}

async function destroyPdfDocument(pdf: PdfDocumentLike) {
  if (typeof pdf.destroy === "function") {
    await pdf.destroy();
  }
}

async function extractPdfText(file: File, onProgress: ParseProgress) {
  const pdfjs = await loadPdfJS();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress(`正在解析 PDF 文本：第 ${pageNumber}/${pdf.numPages} 页`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push(pageText);
  }

  await destroyPdfDocument(pdf);
  return normalizeText(pages.join("\n\n"));
}

async function renderPdfPageToCanvas(page: PdfPageLike) {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    PDF_RENDER_SCALE,
    MAX_PDF_OCR_SIDE / Math.max(baseViewport.width, baseViewport.height)
  );
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("无法创建 PDF 渲染画布");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

async function recognizePdfPages(file: File, onProgress: ParseProgress) {
  const pdfjs = await loadPdfJS();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const worker = await createOCRWorker(onProgress);
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress(`PDF 无可用文本，正在 OCR 第 ${pageNumber}/${pdf.numPages} 页`);
      const page = await pdf.getPage(pageNumber);
      const canvas = await renderPdfPageToCanvas(page);
      const result = await worker.recognize(canvas, { rotateAuto: true });
      pages.push(result.data.text);
    }
  } finally {
    await Promise.all([worker.terminate(), destroyPdfDocument(pdf)]);
  }

  return normalizeOCRText(pages.join("\n\n"));
}

export async function parseResumeFile(file: File, onProgress: ParseProgress) {
  if (isPdfFile(file)) {
    onProgress("正在读取 PDF...");
    const text = await extractPdfText(file, onProgress);

    if (text.length >= MIN_EXTRACTED_TEXT_LENGTH) {
      return text;
    }

    return recognizePdfPages(file, onProgress);
  }

  if (isImageFile(file)) {
    return recognizeImageFile(file, onProgress);
  }

  throw new Error("仅支持上传 PDF、JPG、PNG、WEBP 等简历文件");
}
