import { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "toggle-active" | "toggle-inactive";
type ButtonSize = "sm" | "md";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  as?: "button" | "a";
  href?: string;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  as = "button",
  href,
  onClick,
  title,
  disabled,
}: ButtonProps) {
  const baseStyle =
    "inline-flex items-center justify-center font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-lg focus:ring-indigo-500 border border-transparent",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-200 active:bg-slate-100",
    ghost:
      "text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:ring-slate-200 border border-transparent",
    "toggle-active":
      "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-600 border border-transparent",
    "toggle-inactive":
      "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-transparent",
  };

  const sizes = {
    sm: "px-2 py-1.5 text-[11px] uppercase tracking-wider rounded-lg",
    md: "px-4 py-2 text-sm rounded-lg",
  };

  const combinedClassName = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

  if (as === "a" && href) {
    return (
      <a href={href} className={combinedClassName} title={title}>
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={combinedClassName}
      title={title}
    >
      {children}
    </button>
  );
}
