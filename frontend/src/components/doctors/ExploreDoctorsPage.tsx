import React, { useState, useEffect } from 'react';
import { getDoctors, type Doctor } from '../../services/api';
import BookingModal from './BookingModal.tsx';

const ExploreDoctorsPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await getDoctors();
        setDoctors(data);
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const filteredDoctors = doctors.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBook = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsBookingOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Explore Specialists</h1>
          <p className="mt-2 text-gray-600">Find and book the right clinician for your cognitive profile</p>
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Search by name or specialty..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl">
                  {doc.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex items-center space-x-1 bg-yellow-50 px-2.5 py-1 rounded-full">
                  <span className="text-yellow-600 text-sm font-semibold">{doc.rating}</span>
                  <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900">{doc.name}</h3>
              <p className="text-blue-600 text-sm font-semibold mb-3">{doc.specialty}</p>

              <div className="flex items-center text-sm text-gray-500 space-x-4 mb-4">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {doc.experience_years}y Exp.
                </span>
                <span className="flex items-center font-bold text-gray-900">
                  ${doc.consultation_fee}
                </span>
              </div>

              <p className="text-sm text-gray-600 line-clamp-3 mb-6 flex-grow">
                {doc.bio}
              </p>

              <button
                onClick={() => handleBook(doc)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      )}

      {isBookingOpen && selectedDoctor && (
        <BookingModal
          doctor={selectedDoctor}
          userId={userId}
          onClose={() => setIsBookingOpen(false)}
        />
      )}
    </div>
  );
};

export default ExploreDoctorsPage;
