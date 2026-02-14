"use client";

import { useState, useRef, useEffect } from "react";

type ColorPickerProps = {
    color: string;
    onChange: (hex: string) => void;
    className?: string;
};

export function ColorPicker({ color, onChange, className = "" }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="h-8 w-8 rounded-full border border-gray-200 shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    style={{ backgroundColor: color }}
                    aria-label="Pick color"
                />
                <input
                    type="text"
                    value={color}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-xs uppercase text-gray-700 focus:border-indigo-500 focus:outline-none"
                    placeholder="#000000"
                />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 p-2 bg-white rounded-lg shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-100">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-32 cursor-pointer"
                    />
                    <div className="grid grid-cols-5 gap-1 mt-2">
                        {[
                            "#000000", "#FFFFFF", "#EF4444", "#F97316", "#F59E0B",
                            "#84CC16", "#10B981", "#06B6D4", "#3B82F6", "#6366F1",
                            "#8B5CF6", "#D946EF", "#F43F5E", "#881337", "#1E293B"
                        ].map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                    onChange(preset);
                                    setIsOpen(false);
                                }}
                                className="h-5 w-5 rounded-md border border-gray-200 hover:scale-110 transition"
                                style={{ backgroundColor: preset }}
                                title={preset}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
