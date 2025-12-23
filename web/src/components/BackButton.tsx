"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export default function BackButton({ 
  href, 
  label = "← Back", 
  className = "",
  disabled = false,
  disabledMessage = "Cannot exit during game"
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (disabled) {
      alert(disabledMessage);
      return;
    }
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`bg-gray-800 px-4 py-2 text-white border border-white/30 ${
        disabled 
          ? "opacity-50 cursor-not-allowed" 
          : "hover:bg-gray-700"
      } ${className}`}
      title={disabled ? disabledMessage : ""}
    >
      {label}
    </button>
  );
}

