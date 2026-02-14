"use client";

import { formatDateTime } from "@/app/lib/utils";
import type { ContactMessage } from "../types";

interface ContactViewProps {
  contactMessages: ContactMessage[];
}

export function ContactView({ contactMessages }: ContactViewProps) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Customer inquiries from the contact form</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          <span className="text-xs text-gray-500">{contactMessages.length} total</span>
        </div>

        <div className="mt-4 max-h-[520px] overflow-x-auto overflow-y-auto border border-gray-100 rounded-lg">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contactMessages.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                    No contact messages yet.
                  </td>
                </tr>
              )}
              {contactMessages.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.name}</td>
                  <td className="px-4 py-3 text-gray-700">{entry.email}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[360px]">
                    <span className="line-clamp-2">{entry.message}</span>
                  </td>
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
