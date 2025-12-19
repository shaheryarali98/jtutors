import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { LANGUAGE_OPTIONS } from "../../constants/options";
import { usePlatformSettings } from "../../store/settingsStore";
import { resolveImageUrl } from "../../lib/media";

interface PersonalInformationProps {
  onSaveSuccess: () => void;
}

interface PersonalInfoForm {
  firstName: string;
  lastName: string;
  gender: string;
  gradesCanTeach: string[];
  hourlyFee: number;
  tagline: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  languagesSpoken: string[];
}

const grades = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "College",
  "Graduate School",
  "Adult Education",
];

const HAPPY_AVATAR_PLACEHOLDER_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23FFD700"/><circle cx="35" cy="40" r="5" fill="%23000000"/><circle cx="65" cy="40" r="5" fill="%23000000"/><path d="M 30 65 Q 50 85 70 65" stroke="%23000000" stroke-width="4" fill="none"/></svg>';

const PersonalInformation = ({ onSaveSuccess }: PersonalInformationProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PersonalInfoForm>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [imageMessage, setImageMessage] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [customLanguageInput, setCustomLanguageInput] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const { settings, fetchSettings } = usePlatformSettings();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/me");
        const tutor = response.data.tutor;
        if (tutor) {
          setValue("firstName", tutor.firstName || "");
          setValue("lastName", tutor.lastName || "");
          setValue("gender", tutor.gender || "");
          setValue("hourlyFee", tutor.hourlyFee || 20);
          setValue("tagline", tutor.tagline || "");
          setValue("country", tutor.country || "");
          setValue("state", tutor.state || "");
          setValue("city", tutor.city || "");
          setValue("zipcode", tutor.zipcode || "");
          setSelectedGrades(tutor.gradesCanTeach || []);
          setLanguages(
            tutor.languagesSpoken?.length ? tutor.languagesSpoken : []
          );
          if (tutor.profileImage) {
            setProfileImage(tutor.profileImage);
          }
          if (tutor.profileCompletionPercentage) {
            setProfileCompletion(tutor.profileCompletionPercentage);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, [setValue]);

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      setImageMessage("Uploading image...");

      const formData = new FormData();
      formData.append("image", file);

      console.log("Starting upload for file:", file.name, file.type, file.size);

      const response = await api.post("/uploads/profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // The API returns a relative URL like: /uploads/profile-images/filename.jpg
      const newImageUrl = response.data.url;
      console.log("Upload successful. Image URL:", newImageUrl);

      // Set the image URL with cache busting to force reload
      const timestamp = Date.now();
      const imageUrlWithCache = `${newImageUrl}?v=${timestamp}`;

      setProfileImage(imageUrlWithCache);

      setImageMessage("Profile photo uploaded successfully!");

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Dispatch event for other components
      window.dispatchEvent(new Event("tutor-profile-updated"));
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      setImageMessage(
        error.response?.data?.message ||
          "Failed to upload image. Please try again."
      );
      setTimeout(() => setImageMessage(""), 3000);
    } finally {
      setUploadingImage(false);
    }
  };

  // Simple function to get the image URL
  const getImageUrl = () => {
    if (!profileImage) {
      return HAPPY_AVATAR_PLACEHOLDER_URL;
    }

    // If it's already a data URL or full URL, return it
    if (profileImage.startsWith("data:") || profileImage.startsWith("http")) {
      return profileImage;
    }

    // Use resolveImageUrl to get the proper API URL (works in both dev and production)
    const absoluteUrl = resolveImageUrl(profileImage);
    console.log("Generated image URL:", absoluteUrl);
    return absoluteUrl;
  };

  const onSubmit = async (data: PersonalInfoForm) => {
    try {
      setLoading(true);
      setSuccess(false);

      // Remove cache busting parameter before saving
      const imageToSave = profileImage.split("?")[0];

      const response = await api.put("/tutor/profile/personal", {
        ...data,
        gradesCanTeach: selectedGrades,
        languagesSpoken: languages,
        profileImage: imageToSave,
      });

      onSaveSuccess();
      setProfileCompletion(response.data.profileCompletion);

      if (response.data.profileCompletion === 100) {
        setTimeout(() => navigate("/tutor/dashboard"), 1400);
      }

      setSuccess(true);
      window.dispatchEvent(new Event("tutor-profile-updated"));
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating personal info:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const toggleLanguage = (language: string) => {
    setLanguages((prev) =>
      prev.includes(language)
        ? prev.filter((lang) => lang !== language)
        : [...prev, language]
    );
  };

  const customLanguages = languages.filter(
    (lang) => !LANGUAGE_OPTIONS.includes(lang)
  );

  const handleAddCustomLanguage = () => {
    const trimmed = customLanguageInput.trim();
    if (!trimmed) return;
    if (!languages.includes(trimmed)) {
      setLanguages((prev) => [...prev, trimmed]);
    }
    setCustomLanguageInput("");
  };

  const removeCustomLanguage = (language: string) => {
    setLanguages((prev) => prev.filter((item) => item !== language));
  };

  return (
    <div>
      <h2 className="section-title">Personal Information</h2>

      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">
          Personal information updated successfully!
        </div>
      )}

      {imageMessage && (
        <div className="bg-blue-50 text-blue-600 p-3 rounded-lg mb-4">
          {imageMessage}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 p-5 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full border-4 border-white shadow bg-primary-50 overflow-hidden flex items-center justify-center text-3xl text-primary-500">
            <img
              src={getImageUrl()}
              alt="Tutor profile"
              className="h-full w-full object-cover"
              onError={(e) => {
                console.error("Image failed to load, using placeholder");
                e.currentTarget.src = HAPPY_AVATAR_PLACEHOLDER_URL;
              }}
              onLoad={() => {
                console.log("Image loaded successfully");
              }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Profile Photo
            </h3>
            <p className="text-sm text-slate-600">
              A friendly headshot builds trust with students.
            </p>
            {profileImage && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    // Force refresh by updating cache buster
                    const baseUrl = profileImage.split("?")[0];
                    const timestamp = Date.now();
                    setProfileImage(`${baseUrl}?v=${timestamp}`);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Refresh Image
                </button>
                <a
                  href={getImageUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-slate-500 hover:text-blue-600 mt-1"
                >
                  Open image in new tab
                </a>
              </div>
            )}
          </div>
        </div>

        <label className="btn btn-outline cursor-pointer">
          {uploadingImage
            ? "Uploading..."
            : profileImage
            ? "Change Photo"
            : "Upload Photo"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            disabled={uploadingImage}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Quick validation
                const allowedTypes = [
                  "image/png",
                  "image/jpeg",
                  "image/jpg",
                  "image/webp",
                ];
                if (!allowedTypes.includes(file.type)) {
                  setImageMessage("Please select a PNG, JPG, or WEBP image");
                  setTimeout(() => setImageMessage(""), 3000);
                  return;
                }

                if (file.size > 5 * 1024 * 1024) {
                  setImageMessage("Image must be less than 5MB");
                  setTimeout(() => setImageMessage(""), 3000);
                  return;
                }

                handleImageUpload(file);
              }
            }}
          />
        </label>
      </div>

      {/* Rest of your form remains exactly the same */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">First Name *</label>
            <input
              type="text"
              className="input"
              {...register("firstName", { required: "First name is required" })}
            />
            {errors.firstName && (
              <p className="error-text">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="label">Last Name *</label>
            <input
              type="text"
              className="input"
              {...register("lastName", { required: "Last name is required" })}
            />
            {errors.lastName && (
              <p className="error-text">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {settings?.genderFieldEnabled !== false && (
          <div>
            <label className="label">Gender</label>
            <select className="input" {...register("gender")}>
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
        )}

        {settings?.gradeFieldEnabled !== false && (
          <div>
            <label className="label">Grades You Can Teach *</label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {grades.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => toggleGrade(grade)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                    selectedGrades.includes(grade)
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Hourly Fee (USD) * ($20 - $500)</label>
          <input
            type="number"
            min="20"
            max="500"
            className="input"
            {...register("hourlyFee", {
              required: "Hourly fee is required",
              min: { value: 20, message: "Minimum fee is $20" },
              max: { value: 500, message: "Maximum fee is $500" },
            })}
          />
          {errors.hourlyFee && (
            <p className="error-text">{errors.hourlyFee.message}</p>
          )}
        </div>

        <div>
          <label className="label">Tagline / Short Bio</label>
          <textarea
            className="input"
            rows={3}
            placeholder="A brief description about yourself and your teaching style..."
            {...register("tagline")}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Country *</label>
            <input
              type="text"
              className="input"
              {...register("country", { required: "Country is required" })}
            />
            {errors.country && (
              <p className="error-text">{errors.country.message}</p>
            )}
          </div>

          {settings?.stateFieldEnabled !== false && (
            <div>
              <label className="label">State / Province</label>
              <input type="text" className="input" {...register("state")} />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">City *</label>
            <input
              type="text"
              className="input"
              {...register("city", { required: "City is required" })}
            />
            {errors.city && <p className="error-text">{errors.city.message}</p>}
          </div>

          <div>
            <label className="label">Zipcode</label>
            <input type="text" className="input" {...register("zipcode")} />
          </div>
        </div>

        <div>
          <label className="label">Languages Spoken</label>
          <p className="text-sm text-slate-500 mb-3">
            Select every language you can confidently teach in.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {LANGUAGE_OPTIONS.map((language) => {
              const isSelected = languages.includes(language);
              return (
                <button
                  key={language}
                  type="button"
                  onClick={() => toggleLanguage(language)}
                  className={`px-3 py-2 rounded-lg border-2 text-left text-sm transition ${
                    isSelected
                      ? "border-primary-600 bg-primary-50 text-primary-700 font-medium"
                      : "border-slate-200 hover:border-primary-300"
                  }`}
                >
                  {language}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Need to add another language?
            </p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Add another language"
                value={customLanguageInput}
                onChange={(e) => setCustomLanguageInput(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleAddCustomLanguage}
              >
                Add language
              </button>
            </div>

            {customLanguages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {customLanguages.map((language) => (
                  <span
                    key={language}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {language}
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-red-500"
                      onClick={() => removeCustomLanguage(language)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full md:w-auto"
        >
          {loading ? "Saving..." : "Save Personal Information"}
        </button>
      </form>

      {profileCompletion === 100 && (
        <div className="mt-6 bg-primary-50 border border-primary-100 rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary-700">
              Profile 100% complete!
            </h3>
            <p className="text-sm text-primary-600">
              Fantastic work. You'll be redirected to your tutor dashboard. You
              can always revisit to update details.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/tutor/dashboard")}
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalInformation;
