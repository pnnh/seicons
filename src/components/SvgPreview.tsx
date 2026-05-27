"use client";

type Props = {
  svgUrl: string;
  size: number;
  className?: string;
};

export default function SvgPreview({ svgUrl, size, className }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <img
        src={svgUrl}
        width={size}
        height={size}
        alt=""
        aria-hidden
        className="block"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
