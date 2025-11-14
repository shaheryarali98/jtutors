// InvoicesBills.tsx
'use client';

import  { useState } from 'react';
import { Filter } from 'lucide-react';

type Status = 'all' | 'pending' | 'approved' | 'declined';

export default function InvoicesBills() {
  const [status, setStatus] = useState<Status>('all');

  // Mock data – replace with your API later
  const invoices: any[] = [];

  const filtered = invoices.filter((i) => status === 'all' || i.status === status);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Invoices & bills</h2>

        <div className="mt-3 sm:mt-0 flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>

          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
            >
              <option value="all">All invoices</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>

            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-gray-200 mb-8" />

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Uh ho! No invoice available to show
          </h3>
          <p className="text-gray-600">
            We’re sorry but there is no invoices available to show today
          </p>
        </div>
      ) : (
        /* When you have data, replace the block above with a table */
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">Invoice rows will appear here…</p>
        </div>
      )}
    </div>
  );
}