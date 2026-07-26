"use client";

import { Fragment, type ReactNode } from "react";
import { STICKER_INDEX, stickerTokenRegex } from "@/lib/stickers";

interface StickerTextProps {
  text: string;
  /** Sticker glyph size in px. */
  size?: number;
}

// Renders comment text with `[s:id]` tokens replaced by their sticker glyph.
// Unknown tokens fall through as literal text — so nothing arbitrary is injected.
export function StickerText({ text, size = 22 }: StickerTextProps) {
  const nodes: ReactNode[] = [];
  const re = stickerTokenRegex();
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const entry = STICKER_INDEX[m[1]];
    if (entry) {
      const isLeg = entry.pack.rarity === "legendary";
      nodes.push(
        <span
          key={key++}
          role="img"
          aria-label={entry.sticker.name}
          title={`${entry.sticker.name} · ${entry.pack.name}`}
          className={`inline-block align-middle mx-0.5 ${isLeg ? "rarity-legendary-border rounded-md" : ""}`}
          style={{
            fontSize: size,
            lineHeight: 1,
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,.55))",
          }}
        >
          {entry.sticker.emoji}
        </span>
      );
    } else {
      // Unknown token — keep as literal text.
      nodes.push(<Fragment key={key++}>{m[0]}</Fragment>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);

  return <>{nodes}</>;
}
