import type { BackgroundMode } from "@/types/template";

interface ResumePdfOptions {
  fileName: string;
  backgroundImage: string | null;
  backgroundOpacity: number;
  backgroundMode: BackgroundMode;
  continuationTopMarginMm?: number;
  pageBackgroundColor?: string;
}

interface PdfBlockBounds {
  top: number;
  bottom: number;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("背景图加载失败"));
    image.src = src;
  });
}

function drawImageByMode(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  mode: BackgroundMode,
  width: number,
  height: number
) {
  const imageRatio = image.width / image.height;
  const pageRatio = width / height;

  if (mode === "stretch") {
    context.drawImage(image, 0, 0, width, height);
    return;
  }

  if (mode === "tile") {
    const tileWidth = Math.min(300, Math.max(150, width * 0.22));
    const tileHeight = tileWidth / imageRatio;

    for (let y = -tileHeight; y < height + tileHeight; y += tileHeight + 32) {
      for (let x = -tileWidth; x < width + tileWidth; x += tileWidth + 32) {
        context.drawImage(image, x, y, tileWidth, tileHeight);
      }
    }
    return;
  }

  const targetWidth = pageRatio > imageRatio ? height * 0.68 * imageRatio : width * 0.72;
  const targetHeight = targetWidth / imageRatio;
  const x = (width - targetWidth) / 2;
  const y = (height - targetHeight) / 2;
  context.drawImage(image, x, y, targetWidth, targetHeight);
}

async function createPdfBackground(options: ResumePdfOptions) {
  if (!options.backgroundImage || options.backgroundOpacity <= 0) return null;

  const image = await loadImage(options.backgroundImage);
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = Math.round((canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM);

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = options.backgroundOpacity / 100;
  drawImageByMode(context, image, options.backgroundMode, canvas.width, canvas.height);
  context.globalAlpha = 1;

  return canvas.toDataURL("image/jpeg", 0.92);
}

function collectPdfBlocks(element: HTMLElement, canvasHeight: number): PdfBlockBounds[] {
  const rootRect = element.getBoundingClientRect();
  const scaleY = canvasHeight / rootRect.height;

  return Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-block]"))
    .map((block) => {
      const rect = block.getBoundingClientRect();
      return {
        top: Math.max(0, (rect.top - rootRect.top) * scaleY),
        bottom: Math.min(canvasHeight, (rect.bottom - rootRect.top) * scaleY),
      };
    })
    .filter((block) => block.bottom > block.top)
    .sort((a, b) => a.top - b.top);
}

function findSafeRasterCut(
  canvas: HTMLCanvasElement,
  proposedCut: number,
  minCut: number,
  maxCut: number
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return proposedCut;

  const radius = 48;
  const top = Math.max(Math.ceil(minCut), Math.floor(proposedCut - radius));
  const bottom = Math.min(Math.floor(maxCut), Math.ceil(proposedCut + radius));
  if (bottom - top < 3) return proposedCut;

  const imageData = context.getImageData(0, Math.max(0, top - 1), canvas.width, bottom - top + 2);
  const rowWidth = canvas.width * 4;
  const transitionThreshold = Math.max(18, Math.floor(canvas.width * 0.025));
  const safeRows: number[] = [];

  for (let y = 1; y < imageData.height; y += 1) {
    let transitions = 0;
    const rowOffset = y * rowWidth;
    const previousRowOffset = (y - 1) * rowWidth;

    for (let x = 2; x < canvas.width; x += 2) {
      const pixel = rowOffset + x * 4;
      const leftPixel = pixel - 8;
      const abovePixel = previousRowOffset + x * 4;
      const horizontalDifference =
        Math.abs(imageData.data[pixel] - imageData.data[leftPixel]) +
        Math.abs(imageData.data[pixel + 1] - imageData.data[leftPixel + 1]) +
        Math.abs(imageData.data[pixel + 2] - imageData.data[leftPixel + 2]);
      const verticalDifference =
        Math.abs(imageData.data[pixel] - imageData.data[abovePixel]) +
        Math.abs(imageData.data[pixel + 1] - imageData.data[abovePixel + 1]) +
        Math.abs(imageData.data[pixel + 2] - imageData.data[abovePixel + 2]);

      if (horizontalDifference > 72 || verticalDifference > 72) {
        transitions += 1;
        if (transitions > transitionThreshold) break;
      }
    }

    if (transitions <= transitionThreshold) {
      safeRows.push(top + y - 1);
    }
  }

  let bestCut: number | null = null;
  for (let index = 1; index < safeRows.length - 1; index += 1) {
    const candidate = safeRows[index];
    if (safeRows[index - 1] !== candidate - 1 || safeRows[index + 1] !== candidate + 1) {
      continue;
    }
    if (bestCut === null || Math.abs(candidate - proposedCut) < Math.abs(bestCut - proposedCut)) {
      bestCut = candidate;
    }
  }

  return bestCut ?? proposedCut;
}

function createPageSlices(
  canvas: HTMLCanvasElement,
  pageHeight: number,
  blocks: PdfBlockBounds[],
  continuationTopMarginPx: number
) {
  const totalHeight = canvas.height;
  const slices: Array<{ start: number; height: number }> = [];
  let start = 0;

  while (start < totalHeight - 1) {
    const availableHeight = pageHeight - (slices.length > 0 ? continuationTopMarginPx : 0);
    const target = Math.min(start + availableHeight, totalHeight);

    if (target >= totalHeight) {
      slices.push({ start, height: totalHeight - start });
      break;
    }

    const crossingBlock = [...blocks].reverse().find(
      (block) =>
        block.top < target &&
        block.bottom > target &&
        block.top > start + availableHeight * 0.3
    );

    let cut = target;
    if (crossingBlock) {
      cut = crossingBlock.top;
    }

    if (cut <= start + availableHeight * 0.35 || cut > target) {
      cut = target;
    }

    cut = findSafeRasterCut(
      canvas,
      cut,
      start + availableHeight * 0.35,
      target
    );
    cut = Math.round(cut);
    slices.push({ start, height: cut - start });
    start = cut;
  }

  return slices;
}

function drawPdfPageBackground(
  pdf: import("jspdf").jsPDF,
  backgroundDataUrl: string | null,
  pageBackgroundColor: string
) {
  pdf.setFillColor(pageBackgroundColor);
  pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, "F");

  if (backgroundDataUrl) {
    pdf.addImage(backgroundDataUrl, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
  }
}

export async function exportResumeElementToPdf(element: HTMLElement, options: ResumePdfOptions) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  await document.fonts?.ready;
  await waitForPaint();

  const backgroundDataUrl = await createPdfBackground(options);
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    logging: false,
    scale: 2,
    useCORS: true,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  pdf.setDisplayMode("fullpage", "single");
  const pageHeightPx = Math.round((canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM);
  const blocks = collectPdfBlocks(element, canvas.height);
  const continuationTopMarginMm = options.continuationTopMarginMm ?? 0;
  const continuationTopMarginPx = Math.round(
    (canvas.width * continuationTopMarginMm) / A4_WIDTH_MM
  );
  const slices = createPageSlices(
    canvas,
    pageHeightPx,
    blocks,
    continuationTopMarginPx
  );
  const pageCanvas = document.createElement("canvas");
  const pageContext = pageCanvas.getContext("2d");

  if (!pageContext) {
    throw new Error("PDF 画布初始化失败");
  }

  slices.forEach((slice, index) => {
    if (index > 0) pdf.addPage();

    pageCanvas.width = canvas.width;
    pageCanvas.height = slice.height;
    pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(
      canvas,
      0,
      slice.start,
      canvas.width,
      slice.height,
      0,
      0,
      canvas.width,
      slice.height
    );

    drawPdfPageBackground(pdf, backgroundDataUrl, options.pageBackgroundColor ?? "#ffffff");

    const contentDataUrl = pageCanvas.toDataURL("image/png");
    const contentHeightMm = (slice.height * A4_WIDTH_MM) / canvas.width;
    const contentTopMm = index > 0 ? continuationTopMarginMm : 0;
    pdf.addImage(contentDataUrl, "PNG", 0, contentTopMm, A4_WIDTH_MM, contentHeightMm);
  });

  pdf.save(options.fileName);
}
