import { useState, useRef, useEffect } from "react";

export interface DropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  options: { label: string; value: string | number }[];
  className?: string;
}

export function Dropdown({ value, onChange, options, className = "" }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-[38px] w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 min-w-[170px]"
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 origin-top-right rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg shadow-slate-200/50 outline-none transform transition-all duration-100 ease-out">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(String(option.value));
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                option.value === value
                  ? "bg-indigo-50/50 font-semibold text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && (
                <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
