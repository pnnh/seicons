"use client";

import { forwardRef } from "react";
import DynamicIcon from "@/components/DynamicIcon";
import type { IconEntry } from "@/lib/icons";

type Props = {
  icon: Pick<IconEntry, "l" | "p" | "n">;
  size: number;
  className?: string;
};

const IconPreview = forwardRef<HTMLSpanElement, Props>(function IconPreview(
  { icon, size, className },
  ref,
) {
  return (
    <span
      ref={ref}
      className={`inline-flex items-center justify-center text-gray-900 ${className ?? ""}`}
    >
      <DynamicIcon lib={icon.l} pkg={icon.p} name={icon.n} size={size} />
    </span>
  );
});

export default IconPreview;
