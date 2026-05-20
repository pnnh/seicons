"use client";

import { useMemo } from "react";
import { scaleSvgMarkup } from "@/lib/icon-svg";

type Props = {
  svg: string;
  size: number;
  className?: string;
};

export default function SvgPreview({ svg, size, className }: Props) {
  const markup = useMemo(() => scaleSvgMarkup(svg, size), [svg, size]);

  return (
    <span
      className={`inline-flex items-center justify-center text-gray-900 [&_svg]:block ${className ?? ""}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: markup }}
      aria-hidden
    />
  );
}
