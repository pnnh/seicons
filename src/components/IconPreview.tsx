"use client";

import { forwardRef } from "react";
import DynamicIcon from "@/components/DynamicIcon";

type Props = {
  pkg: string;
  name: string;
  size: number;
  className?: string;
};

const IconPreview = forwardRef<HTMLSpanElement, Props>(function IconPreview(
  { pkg, name, size, className },
  ref,
) {
  return (
    <span
      ref={ref}
      className={`inline-flex items-center justify-center text-gray-900 ${className ?? ""}`}
    >
      <DynamicIcon pkg={pkg} name={name} size={size} />
    </span>
  );
});

export default IconPreview;
