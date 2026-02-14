"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { FieldError } from "react-hook-form";

// ============================================================================
// Form Field Wrapper
// ============================================================================

interface FormFieldProps {
  label: string;
  error?: FieldError;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({ label, error, required, children, hint }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error.message}</p>
      )}
    </div>
  );
}

// ============================================================================
// Text Input
// ============================================================================

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: FieldError;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          ${error 
            ? "border-red-300 bg-red-50 focus:ring-red-500" 
            : "border-gray-200 bg-gray-50 hover:bg-white focus:bg-white"
          }
          ${className}
        `}
        {...props}
      />
    );
  }
);
TextInput.displayName = "TextInput";

// ============================================================================
// Number Input
// ============================================================================

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: FieldError;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="number"
        className={`
          w-full rounded-lg border px-3 py-2 text-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          ${error 
            ? "border-red-300 bg-red-50 focus:ring-red-500" 
            : "border-gray-200 bg-gray-50 hover:bg-white focus:bg-white"
          }
          ${className}
        `}
        {...props}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";

// ============================================================================
// Textarea
// ============================================================================

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: FieldError;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          ${error 
            ? "border-red-300 bg-red-50 focus:ring-red-500" 
            : "border-gray-200 bg-gray-50 hover:bg-white focus:bg-white"
          }
          ${className}
        `}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// ============================================================================
// Select
// ============================================================================

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: FieldError;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ error, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          ${error 
            ? "border-red-300 bg-red-50 focus:ring-red-500" 
            : "border-gray-200 bg-gray-50 hover:bg-white focus:bg-white"
          }
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
    );
  }
);
SelectInput.displayName = "SelectInput";

// ============================================================================
// Form Submit Button
// ============================================================================

interface SubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "danger" | "secondary";
  className?: string;
}

export function SubmitButton({ 
  loading, 
  disabled, 
  children, 
  variant = "primary",
  className = "" 
}: SubmitButtonProps) {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
  };

  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 
        text-sm font-semibold transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle 
            className="opacity-25" 
            cx="12" cy="12" r="10" 
            stroke="currentColor" 
            strokeWidth="4"
            fill="none"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
