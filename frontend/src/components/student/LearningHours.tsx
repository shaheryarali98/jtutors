import  { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Filter } from 'lucide-react';

interface HourLog {
  id: string;
  status: 'pending' | 'approved' | 'declined';
  hours: number;
  date: string;
  description: string;
}

export default function LearningHours() {
  const [sortBy, setSortBy] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');

  // Mock data – replace with API later
  const logs: HourLog[] = [];

  // Filter logs based on sort
  const filteredLogs = logs.filter(log => {
    if (sortBy === 'all') return true;
    return log.status === sortBy;
  });

  // Calculate stats
  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const approvedHours = logs.filter(l => l.status === 'approved').reduce((sum, l) => sum + l.hours, 0);
  const pendingHours = logs.filter(l => l.status === 'pending').reduce((sum, l) => sum + l.hours, 0);
  const declinedHours = logs.filter(l => l.status === 'declined').reduce((sum, l) => sum + l.hours, 0);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Learning hours log</h2>
        <div className="mt-3 sm:mt-0 flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Hours */}
              <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total hours</p>
          <p className="text-2xl font-bold text-gray-900">{totalHours} hrs</p>
        </div>

        {/* Approved Hours */}
        <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Approved hours</p>
          <p className="text-2xl font-bold text-gray-900">{approvedHours} hrs</p>
        </div>

        {/* Pending/Declined Hours */}
        <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Pending/decline hours</p>
          <p className="text-2xl font-bold text-gray-900">{pendingHours + declinedHours} hrs</p>
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-32 h-32 mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-16 w-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Uh ho!</h3>
          <p className="text-gray-600">We're sorry but there is no volunteer hours log</p>
        </div>
      ) : (
        /* Optional: Render actual log table here */
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">Log entries will appear here...</p>
        </div>
      )}
    </div>
  );
}