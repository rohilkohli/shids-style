"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Ruler, Info } from "lucide-react";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
}

type SizeUnit = "cm" | "inches";

const SIZE_CHARTS = {
  clothing: {
    title: "Clothing Size Guide",
    headers: ["Size", "US", "UK", "EU", "Bust", "Waist", "Hips"],
    rows: [
      ["XS", "0-2", "4-6", "32-34", "31-32″", "23-24″", "33-34″"],
      ["S", "4-6", "8-10", "36-38", "33-34″", "25-26″", "35-36″"],
      ["M", "8-10", "12-14", "40-42", "35-36″", "27-28″", "37-38″"],
      ["L", "12-14", "16-18", "44-46", "37-39″", "29-31″", "39-41″"],
      ["XL", "16-18", "20-22", "48-50", "40-42″", "32-34″", "42-44″"],
      ["XXL", "20-22", "24-26", "52-54", "43-45″", "35-37″", "45-47″"],
    ],
    measurementTips: [
      { label: "Bust", description: "Measure around the fullest part of your bust" },
      { label: "Waist", description: "Measure around the narrowest part of your waist" },
      { label: "Hips", description: "Measure around the fullest part of your hips" },
    ],
  },
};

type ChartKey = keyof typeof SIZE_CHARTS;

export function SizeGuideModal({ isOpen, onClose, category }: SizeGuideModalProps) {
  const initialTab = (category && (category in SIZE_CHARTS)) ? (category as ChartKey) : "clothing";
  const [activeTab, setActiveTab] = useState<ChartKey>(initialTab as ChartKey);
  const [unit, setUnit] = useState<SizeUnit>("inches");

  if (!isOpen || typeof window === "undefined") return null;

  const currentChart = SIZE_CHARTS[activeTab];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Ruler className="h-5 w-5 text-gray-600" />
            </div>
            <h2 id="size-guide-title" className="text-lg font-semibold text-gray-900">
              Size Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close size guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {Object.entries(SIZE_CHARTS).map(([key, chart]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as ChartKey)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === key
                ? "text-black"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {chart.title.replace(" Size Guide", "")}
              {activeTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          {/* Unit toggle (for clothing) */}
          {activeTab === "clothing" && (
            <div className="flex items-center justify-end gap-2 mb-4">
              <span className="text-sm text-gray-500">Unit:</span>
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
                <button
                  onClick={() => setUnit("inches")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${unit === "inches"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Inches
                </button>
                <button
                  onClick={() => setUnit("cm")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${unit === "cm"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  CM
                </button>
              </div>
            </div>
          )}

          {/* Size table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {currentChart.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-left font-medium text-gray-900 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentChart.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50">
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className={`px-4 py-3 whitespace-nowrap ${cellIdx === 0 ? "font-medium text-gray-900" : "text-gray-600"
                          }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to measure */}
          {currentChart.measurementTips.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                How to Measure
              </h3>
              <div className="space-y-3">
                {currentChart.measurementTips.map((tip, idx) => (
                  <div key={idx} className="flex gap-3 rounded-lg bg-gray-50 p-3">
                    <span className="font-medium text-gray-700 min-w-[80px]">
                      {tip.label}:
                    </span>
                    <span className="text-gray-600">{tip.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fit tips */}
          <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">Fit Tips</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• If you&apos;re between sizes, we recommend sizing up for a more relaxed fit.</li>
              <li>• Check individual product pages for specific fit notes.</li>
              <li>• Need help? Our customer service team is happy to assist with sizing questions.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
