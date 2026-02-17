import React, { useState } from 'react';
import { type Doctor, bookAppointment, getInvoice } from '../../services/api';

interface BookingModalProps {
  doctor: Doctor;
  userId: string;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ doctor, userId, onClose }) => {
  const [step, setStep] = useState<'slot' | 'payment' | 'success'>('slot');
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<any>(null);

  const slots = [
    "2026-02-15T10:00:00Z",
    "2026-02-15T14:30:00Z",
    "2026-02-16T09:00:00Z",
    "2026-02-16T11:00:00Z",
    "2026-02-17T16:00:00Z",
  ];

  const handleBook = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    try {
      const res = await bookAppointment({
        user_id: userId,
        doctor_id: doctor.id,
        appointment_time: selectedSlot
      });
      setAppointmentId(res.id);
      setStep('payment');
    } catch (error) {
      alert('Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    // Simulate payment delay
    setTimeout(async () => {
      try {
        if (appointmentId) {
          const inv = await getInvoice(appointmentId);
          setInvoice(inv);
          setStep('success');
        }
      } catch (error) {
        alert('Payment processing failed');
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {step === 'slot' && 'Choose a Time Slot'}
            {step === 'payment' && 'Secure Payment'}
            {step === 'success' && 'Appointment Confirmed!'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'slot' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                  {doctor.name[4]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{doctor.name}</p>
                  <p className="text-sm text-gray-500">{doctor.specialty}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {slots.map((slot) => {
                  const date = new Date(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 text-sm rounded-lg border transition-all ${
                        selectedSlot === slot
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-gray-200 hover:border-blue-300 text-gray-600'
                      }`}
                    >
                      {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} <br/>
                      {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!selectedSlot || loading}
                onClick={handleBook}
                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-lg"
              >
                {loading ? 'Processing...' : 'Confirm Slot'}
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Consultation Fee</span>
                  <span className="font-bold">${doctor.consultation_fee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Service Tax</span>
                  <span className="font-semibold text-gray-700">$0.00 (Promo)</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-blue-600">${doctor.consultation_fee}</span>
                </div>
              </div>

              <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900">Secure Hackathon Checkout</p>
                  <p className="text-xs text-blue-700">All data is encrypted. Payment is demo-only.</p>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handlePayment}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                {loading ? 'Processing Payment...' : 'Pay with Demo Credits'}
              </button>
            </div>
          )}

          {step === 'success' && invoice && (
            <div className="text-center space-y-6">
              <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900">Booking Successful!</h3>
                <p className="text-gray-600 mt-2">Your appointment with <strong>{doctor.name}</strong> is set.</p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-start space-x-3 text-left">
                <div className="text-yellow-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-yellow-800 italic underline">Agentic AI Action triggered:</p>
                  <p className="text-xs text-yellow-700">Your Unified Multi-Modal report has been shared with {doctor.name}'s medical portal for pre-review.</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border text-left font-mono text-xs">
                <p className="text-gray-500 mb-2">DESK INVOICE: {invoice.invoice_number}</p>
                <p>Date: {new Date(invoice.date).toLocaleString()}</p>
                <p>Status: PAID</p>
                <p>Note: Please present this ID at the consultation desk.</p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-md"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
