"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface BackButtonProps {
  href: string;
  label?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export default function BackButton({ 
  href, 
  label = "← Back", 
  disabled = false,
  disabledMessage 
}: BackButtonProps) {
  if (disabled) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        onClick={() => disabledMessage && alert(disabledMessage)}
        title={disabledMessage}
      >
        {label}
      </Button>
    );
  }

  return (
    <Link href={href}>
      <Button variant="ghost" size="sm">
        {label}
      </Button>
    </Link>
  );
}
