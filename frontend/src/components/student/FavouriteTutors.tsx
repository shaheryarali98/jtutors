import { Heart, Users } from 'lucide-react';

export default function FavouriteTutors() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Heading */}
      <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
        <Users className="h-7 w-7 text-purple-600" />
        Favourite Tutors
      </h2>

      {/* Empty State */}
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="inline-flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-red-50 rounded-full">
          <Heart className="h-10 w-10 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          No favourite tutors yet
        </h3>
        <p className="text-gray-600 max-w-sm mx-auto">
          Start exploring tutors and add your favourites by clicking the heart icon on their profile.
        </p>
      </div>
    </div>
  );
}