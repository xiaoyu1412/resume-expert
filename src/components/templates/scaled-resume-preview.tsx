"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  RESUME_PAGE_MIN_HEIGHT,
  RESUME_PAGE_WIDTH,
} from "@/components/templates/resume-template-document";

interface ScaledResumePreviewProps {
  children: ReactNode;
  maxScale: number;
}

export function ScaledResumePreview({
  children,
  maxScale,
}: ScaledResumePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(maxScale);
  const [contentHeight, setContentHeight] = useState(RESUME_PAGE_MIN_HEIGHT);

  useEffect(() => {
    const updateDimensions = () => {
      const container = containerRef.current;
      const content = contentRef.current;

      if (container) {
        setScale(Math.min(maxScale, container.clientWidth / RESUME_PAGE_WIDTH));
      }

      if (content) {
        setContentHeight(Math.max(RESUME_PAGE_MIN_HEIGHT, content.scrollHeight));
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);

    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [maxScale]);

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="mx-auto"
        style={{
          width: RESUME_PAGE_WIDTH * scale,
          height: contentHeight * scale,
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: RESUME_PAGE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
