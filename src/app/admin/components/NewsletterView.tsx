"use client";

import { formatDateTime } from "@/app/lib/utils";
import type { NewsletterEntry } from "../types";

interface NewsletterViewProps {
  newsletterEmails: NewsletterEntry[];
}

export function NewsletterView({ newsletterEmails }: NewsletterViewProps) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Newsletter Emails</h1>
        <p className="text-sm text-gray-500 mt-1">View all newsletter signups</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Newsletter Emails</h2>
          <span className="text-xs text-gray-500">{newsletterEmails.length} total</span>
        </div>

        <div className="mt-4 max-h-[520px] overflow-x-auto overflow-y-auto border border-gray-100 rounded-lg">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {newsletterEmails.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-center text-sm text-gray-500">
                    No emails collected yet.
                  </td>
                </tr>
              )}
              {newsletterEmails.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.email}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(entry.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
