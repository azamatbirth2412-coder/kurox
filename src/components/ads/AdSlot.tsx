"use client";
import { Component, type ReactNode } from "react";
import { useSession } from "next-auth/react";

interface AdSlotProps {
  slot: string;
  code?: string;
  minHeight?: number;
}

class AdErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

function AdSlotInner({ slot, code, minHeight = 90 }: AdSlotProps) {
  const { data: session } = useSession();

  // Premium users don't see ads
  if ((session?.user as any)?.isPremium) return null;
  if (!code) return null;

  return (
    <div
      aria-label="Реклама"
      className="w-full flex justify-center my-4"
      style={{ minHeight }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: code }}
        className="max-w-full"
      />
    </div>
  );
}

export function AdSlot(props: AdSlotProps) {
  return (
    <AdErrorBoundary>
      <AdSlotInner {...props} />
    </AdErrorBoundary>
  );
}
