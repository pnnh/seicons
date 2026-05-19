"use client";

import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { loadIcon } from "@/lib/icon-loaders";

type Props = {
  pkg: string;
  name: string;
  size?: number;
  className?: string;
};

export default function DynamicIcon({
  pkg,
  name,
  size = 24,
  className,
}: Props) {
  const [Icon, setIcon] = useState<IconType | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIcon(null);

    loadIcon(pkg, name).then((component) => {
      if (!cancelled && component) setIcon(() => component);
    });

    return () => {
      cancelled = true;
    };
  }, [pkg, name]);

  if (!Icon) {
    return (
      <span
        className={`inline-block rounded bg-gray-200 animate-pulse ${className ?? ""}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return <Icon size={size} className={className} aria-hidden />;
}
