"use client";

import { formatCurrency, formatDate } from "@/app/lib/utils";
import { useDialog } from "@/app/components/ConfirmDialog";
import type { DiscountCode } from "@/app/lib/types";

interface DiscountsViewProps {
  discountCodes: DiscountCode[];
  onCreateClick: () => void;
  onToggleActive: (id: string) => Promise<DiscountCode | null>;
  onDelete: (id: string) => Promise<void>;
  onSetFlash: (message: string | null) => void;
}

export function DiscountsView({
  discountCodes,
  onCreateClick,
  onToggleActive,
  onDelete,
  onSetFlash,
}: DiscountsViewProps) {
  const dialog = useDialog();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-sm text-gray-500 mt-1">{discountCodes.length} active codes</p>
        </div>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Code
        </button>
      </div>

      {/* Discount Codes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {discountCodes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">
                  No discount codes created yet.
                </td>
              </tr>
            )}
            {discountCodes.map((code) => (
              <tr key={code.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-full">{code.code}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{code.description || "-"}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {code.type === "percentage" ? `${code.value}%` : formatCurrency(code.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {code.maxUses ? `${code.usedCount}/${code.maxUses}` : `${code.usedCount} uses`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={async () => {
                      try {
                        await onToggleActive(code.id);
                      } catch (error) {
                        onSetFlash((error as Error).message);
                      }
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      code.isActive
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {code.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {code.expiryDate ? formatDate(code.expiryDate) : "No expiry"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={async () => {
                      const ok = await dialog.confirm({
                        title: "Delete Discount Code",
                        message: `Delete discount code "${code.code}"?`,
                        confirmLabel: "Delete",
                        variant: "danger",
                      });
                      if (ok) {
                        try {
                          await onDelete(code.id);
                          onSetFlash(`Code ${code.code} deleted`);
                          setTimeout(() => onSetFlash(null), 2000);
                        } catch (error) {
                          onSetFlash((error as Error).message);
                        }
                      }
                    }}
                    className="text-red-600 hover:text-red-900 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {discountCodes.length === 0 && (
        <div className="mt-6 text-center p-8 bg-slate-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">No discount codes yet. Create your first code!</p>
        </div>
      )}
    </>
  );
}
