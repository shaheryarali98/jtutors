'use client';

import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-wysiwyg';
import { Country, State, City } from 'country-state-city';
import { X } from 'lucide-react';

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

// Individual grade options from 1 to 12
const gradesOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Grade ${i + 1}`,
}));

const locationOptions = [
  { value: 'my-place', label: 'My Place' },
  { value: 'teacher-home', label: "Teacher's Home" },
  { value: 'online', label: 'Online' },
];

const languageOptions = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ca', name: 'Catalan' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'et', name: 'Estonian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'ko', name: 'Korean' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'ne', name: 'Nepali' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'es', name: 'Spanish' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
];

export default function TutorProfileForm() {
  const [form, setForm] = useState({
    firstName: 'Sami',
    lastName: '',
    gender: '',
    grades: [],
    country: '',
    state: '',
    city: '',
    address: '',
    zipcode: '',
    languages: [],
    locationPref: [],
  });

  const [bio, setBio] = useState('');
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');

  // Load all countries on mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
  }, []);

  // Update states when country changes
  useEffect(() => {
    if (form.country) {
      const stateList = State.getStatesOfCountry(form.country);
      setStates(stateList);
      setCities([]);
      setForm((prev) => ({ ...prev, state: '', city: '' }));
    } else {
      setStates([]);
      setCities([]);
    }
  }, [form.country]);

  // Update cities when state changes
  useEffect(() => {
    if (form.state && form.country) {
      const cityList = City.getCitiesOfState(form.country, form.state);
      setCities(cityList);
      setForm((prev) => ({ ...prev, city: '' }));
    } else {
      setCities([]);
    }
  }, [form.state]);

  const handleChange = (name: string, value: any) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGradeToggle = (gradeValue: string) => {
    const newGrades = form.grades.includes(gradeValue)
      ? form.grades.filter((g) => g !== gradeValue)
      : [...form.grades, gradeValue];
    handleChange('grades', newGrades);
  };

  const handleLanguageAdd = () => {
    if (selectedLanguage && !form.languages.includes(selectedLanguage)) {
      handleChange('languages', [...form.languages, selectedLanguage]);
      setSelectedLanguage('');
    }
  };

  const handleLanguageRemove = (langCode: string) => {
    handleChange('languages', form.languages.filter((l) => l !== langCode));
  };

  const handleLocationToggle = (locationValue: string) => {
    const newLocations = form.locationPref.includes(locationValue)
      ? form.locationPref.filter((l) => l !== locationValue)
      : [...form.locationPref, locationValue];
    handleChange('locationPref', newLocations);
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
  };

  const handleSubmit = () => {
    console.log('Submitted:', { ...form, bio });
    alert('Profile saved successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg">
      <h2 className="text-xl font-bold mb-6">My Profile</h2>

      <div className="space-y-6">
        {/* Name Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First name
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="Sami"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last name
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="Ullah"
            />
          </div>
        </div>

        {/* Gender & Grades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              value={form.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Select Gender</option>
              {genderOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grades You Want To Learn (Select Multiple)
            </label>
            <div className="border border-gray-300 rounded-md p-3 bg-white max-h-40 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {gradesOptions.map((grade) => (
                  <label
                    key={grade.value}
                    className="flex items-center cursor-pointer hover:bg-purple-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={form.grades.includes(grade.value)}
                      onChange={() => handleGradeToggle(grade.value)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{grade.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Country, State, City */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Country <span className="text-red-500">*</span>
            </label>
            <select
              value={form.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.isoCode} value={country.isoCode}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select State
            </label>
            <select
              value={form.state}
              onChange={(e) => handleChange('state', e.target.value)}
              disabled={!form.country}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select State</option>
              {states.map((state) => (
                <option key={state.isoCode} value={state.isoCode}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select City
            </label>
            <select
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              disabled={!form.state}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select City</option>
              {cities.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Address & Zipcode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter your address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="Enter your address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter Zipcode
            </label>
            <input
              type="text"
              value={form.zipcode}
              onChange={(e) => handleChange('zipcode', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="Enter Zipcode"
            />
          </div>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Languages you know <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Select Language</option>
              {languageOptions
                .filter((lang) => !form.languages.includes(lang.code))
                .map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
            </select>
            <button
              onClick={handleLanguageAdd}
              disabled={!selectedLanguage}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          
          {/* Selected Languages */}
          {form.languages.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.languages.map((langCode) => {
                const lang = languageOptions.find((l) => l.code === langCode);
                return (
                  <div
                    key={langCode}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    <span>{lang?.name}</span>
                    <button
                      onClick={() => handleLanguageRemove(langCode)}
                      className="hover:bg-purple-200 rounded-full p-0.5 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Learning Location Preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Learning location preference (Select Multiple)
          </label>
          <div className="border border-gray-300 rounded-md p-3 bg-white">
            <div className="flex gap-4 flex-wrap">
              {locationOptions.map((opt) => (
                <label key={opt.value} className="flex items-center cursor-pointer hover:bg-purple-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={form.locationPref.includes(opt.value)}
                    onChange={() => handleLocationToggle(opt.value)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Brief Introduction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            A brief introduction
          </label>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <Editor
              value={bio}
              onChange={handleEditorChange}
              placeholder="Your brief introduction and philosophy about teaching and highlight what makes you special..."
              containerProps={{
                style: {
                  minHeight: '180px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                },
              }}
            />
          </div>
        </div>

        {/* Custom Editor Styling */}
        <style jsx>{`
          :global(.rsw-toolbar) {
            background: #f9fafb !important;
            border-bottom: 1px solid #e5e7eb !important;
            padding: 8px !important;
            border-radius: 8px 8px 0 0 !important;
          }
          :global(.rsw-ce) {
            min-height: 180px !important;
            padding: 12px !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            color: #374151 !important;
          }
          :global(.rsw-btn) {
            color: #6b7280 !important;
            padding: 4px 8px !important;
          }
          :global(.rsw-btn[data-active='true']) {
            background: #e5e7eb !important;
            color: #111827 !important;
          }
        `}</style>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors flex gap-2 items-center"
          >
            <span>Save and Next</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}