import { useEffect, useState } from "react";
import api from "../../lib/api"; // Assuming this is your configured API client

// --- INTERFACE DEFINITIONS ---

interface Subject {
  id: string;
  name: string;
  parentId?: string | null;
  children?: Subject[]; // Expected structure if API returns nested data
}

interface TutorSubject {
  id: string;
  subjectId: string;
  subject: Subject;
}

interface SubjectsProps {
  onSaveSuccess: () => void; // Function to call on successful save/update
}

// --- REMOVED MOCK DATA ---
// The MOCK_SUBJECT_DATA array has been removed.

// --- COMPONENT START ---

const Subjects = ({ onSaveSuccess }: SubjectsProps) => {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Subject[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tutorSubjects, setTutorSubjects] = useState<TutorSubject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchSubjects();
    fetchTutorSubjects();
  }, []);

  // --- DATA FETCHING (UPDATED TO USE REAL API CALLS) ---

  const fetchSubjects = async () => {
    setErrorMessage("");
    try {
      // --- REAL API CALL: Fetch all subjects and categories ---
      const response = await api.get("/subjects");
      const all = response.data.subjects || [];
      setAllSubjects(all);

      // Filter to get only categories (subjects with no parent)
      const cats = all.filter((s: Subject) => !s.parentId);
      setCategories(cats);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setErrorMessage(
        "Failed to load subjects from the server. Please check your backend is running."
      );
    }
  };

  const fetchTutorSubjects = async () => {
    try {
      // REAL API CALL: Fetch the tutor's current subjects
      const response = await api.get("/auth/me");
      const subjects = response.data.tutor?.subjects || [];
      setTutorSubjects(subjects);
      // Initialize selectedSubjects with current subjects
      setSelectedSubjects(subjects.map((ts: TutorSubject) => ts.subjectId));
    } catch (error) {
      console.error("Error fetching tutor subjects:", error);
    }
  };

  // --- UTILITY FUNCTIONS ---

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const getSubcategories = (categoryId: string) => {
    // Filter the flat list by parentId
    return allSubjects.filter((s) => s.parentId === categoryId);
  };

  // --- SAVE HANDLER (The core logic) ---

  const handleSave = async () => {
    try {
      setLoading(true);
      setFeedback("");
      setErrorMessage("");

      // Find subjects to add and remove
      const currentIds = tutorSubjects.map((ts) => ts.subjectId);
      const toAdd = selectedSubjects.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter(
        (id) => !selectedSubjects.includes(id)
      );

      let statusMessage = "Subjects updated successfully!";

      if (toAdd.length > 0 || toRemove.length > 0) {
        // 1. Add new subjects
        if (toAdd.length > 0) {
          const response = await api.post("/tutor/profile/subjects", {
            subjectIds: toAdd,
          });
          if (response.data.profileCompletion === 100) {
            statusMessage = "Subjects added • Profile now complete!";
          }
        }

        // 2. Remove unchecked subjects
        for (const subjectId of toRemove) {
          // IMPORTANT: Use the TutorSubject ID (ts.id) for DELETE endpoint
          const tutorSubjectToRemove = tutorSubjects.find(
            (ts) => ts.subjectId === subjectId
          );
          if (tutorSubjectToRemove) {
            await api.delete(
              `/tutor/profile/subjects/${tutorSubjectToRemove.id}`
            );
          }
        }
      } else {
        statusMessage = "No changes detected.";
      }

      // 3. Set feedback and update local state
      setFeedback(statusMessage);
      await fetchTutorSubjects(); // Refresh the list of saved subjects
      window.dispatchEvent(new Event("tutor-profile-updated"));

      // 4. Show feedback message
      setTimeout(() => setFeedback(""), 3000);
    } catch (error) {
      console.error("Error updating subjects:", error);
      setErrorMessage(
        "Error updating subjects. Please check your selections and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER LOGIC ---

  const subcategories = selectedCategory
    ? getSubcategories(selectedCategory)
    : [];

  return (
    <div>
      <h2 className="section-title">📚 Subjects I Can Teach</h2>

      <p className="text-gray-600 mb-6">
        Please select a **category** first, then choose the **specific
        subjects** you can teach.
      </p>

      {/* --- Feedback/Error Messages --- */}
      {feedback && (
        <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">
          {feedback}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">
          {errorMessage}
        </div>
      )}

      {/* --- Main Subject Selection Area --- */}

      {categories.length === 0 && !errorMessage ? (
        <div className="text-gray-600 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium mb-2">Loading subjects...</p>
        </div>
      ) : (
        <>
          {!selectedCategory ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Step 1: Select a Category
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className="px-4 py-3 rounded-lg border-2 border-gray-300 hover:border-primary-400 text-sm transition-colors"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  ← Back to Categories
                </button>
                <h3 className="text-lg font-semibold">
                  Step 2: Select Subjects in{" "}
                  {categories.find((c) => c.id === selectedCategory)?.name}
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {subcategories.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => toggleSubject(subject.id)}
                    className={`px-4 py-3 rounded-lg border-2 text-sm transition-colors ${
                      selectedSubjects.includes(subject.id)
                        ? "border-primary-600 bg-primary-50 text-primary-700 font-medium"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
              {subcategories.length === 0 && (
                <div className="text-gray-600 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium mb-2">
                    No subjects listed under this category yet.
                  </p>
                </div>
              )}
            </div>
          )}

          <hr className="my-6" />

          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary w-full md:w-auto"
          >
            {loading ? "Saving Changes..." : "Save Selected Subjects"}
          </button>
        </>
      )}

      {/* --- Current Subjects Display --- */}
      <hr className="my-8" />

      {tutorSubjects.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">
            ✅ Your Current Teaching Subjects
          </h3>
          <div className="flex flex-wrap gap-2">
            {tutorSubjects.map((ts) => (
              <span
                key={ts.id}
                className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm shadow-md"
              >
                {ts.subject.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Removed the 'Note: The subjects list is currently mocked' notice */}
    </div>
  );
};

export default Subjects;
