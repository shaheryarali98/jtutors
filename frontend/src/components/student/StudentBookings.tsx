'use client';

import  { useState } from 'react';
import { Calendar, Download, Filter } from 'lucide-react';

export default function MyBookings() {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'ongoing' | 'completed' | 'declined'
  >('all');

  // Use string in 'YYYY-MM-DD' format for native date input
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Mock data
  const bookings: any[] = [];

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return true;
    return b.status === statusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      {/* ----- Header ----- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My bookings</h2>

        <div className="mt-3 sm:mt-0 flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ----- Filters & Export ----- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        {/* ----- Native Date Input ----- */}
        <div className="relative">
          <div className="flex items-center border border-gray-300 rounded-md pl-10 pr-4 py-2 bg-white">
            <Calendar className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset rounded-md"
              placeholder="By date"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ----- Export ----- */}
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm">
          <Download className="h-4 w-4" />
          Export (CSV file)
        </button>
      </div>

      {/* ----- Empty State ----- */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Uh ho! No bookings available to show
          </h3>
          <p className="text-gray-600">
            We're sorry but there is no bookings available to show today
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">Bookings will appear here...</p>
        </div>
      )}
    </div>
  );
}