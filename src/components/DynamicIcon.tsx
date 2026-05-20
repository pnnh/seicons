"use client";

import { useEffect, useState } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import type { IconType } from "react-icons";
import { loadIcon } from "@/lib/icon-loaders";

type Props = {
  lib: string;
  pkg: string;
  name: string;
  size?: number;
  className?: string;
};

export default function DynamicIcon({
  lib,
  pkg,
  name,
  size = 24,
  className,
}: Props) {
  const [Icon, setIcon] = useState<IconType | SvgIconComponent | null>(null);
  const isMui = lib === "mui";

  useEffect(() => {
    let cancelled = false;
    setIcon(null);

    loadIcon(lib, pkg, name).then((component) => {
      if (!cancelled && component) setIcon(() => component);
    });

    return () => {
      cancelled = true;
    };
  }, [lib, pkg, name]);

  if (!Icon) {
    return (
      <span
        className={`inline-block rounded bg-gray-200 animate-pulse ${className ?? ""}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  if (isMui) {
    const MuiIcon = Icon as SvgIconComponent;
    return (
      <MuiIcon
        className={className}
        sx={{ fontSize: size, width: size, height: size }}
        inheritViewBox
        aria-hidden
      />
    );
  }

  const RiIcon = Icon as IconType;
  return <RiIcon size={size} className={className} aria-hidden />;
}
