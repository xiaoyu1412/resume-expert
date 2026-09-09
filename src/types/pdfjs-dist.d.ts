declare module "pdfjs-dist/build/pdf.mjs" {
  interface PDFTextItem {
    str: string;
  }

  interface PDFViewport {
    width: number;
    height: number;
  }

  interface PDFPageProxy {
    getViewport: (options: { scale: number }) => PDFViewport;
    getTextContent: () => Promise<{ items: Array<PDFTextItem | Record<string, unknown>> }>;
    render: (options: {
      canvasContext: CanvasRenderingContext2D;
      viewport: PDFViewport;
    }) => { promise: Promise<void> };
  }

  interface PDFDocumentProxy {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PDFPageProxy>;
    destroy?: () => Promise<void> | void;
  }

  export function getDocument(options: {
    data: Uint8Array;
    disableWorker?: boolean;
    useSystemFonts?: boolean;
  }): { promise: Promise<PDFDocumentProxy> };

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
}
