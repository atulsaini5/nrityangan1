import React, { useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { CLASS_CATEGORIES, LOCATIONS } from '../constants';

interface TrialClassFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  mode?: 'modal' | 'inline';
}

interface TrialFormData {
  contactName: string;
  studentName: string;
  email: string;
  phone: string;
  studentAge: string;
  classInterest: string;
  locationInterest: string;
  notes: string;
}

const initialFormData: TrialFormData = {
  contactName: '',
  studentName: '',
  email: '',
  phone: '',
  studentAge: '',
  classInterest: '',
  locationInterest: '',
  notes: '',
};

const TrialClassForm: React.FC<TrialClassFormProps> = ({ isOpen = true, onClose = () => undefined, mode = 'modal' }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const isModal = mode === 'modal';

  const handleClose = () => {
    if (status !== 'submitting') {
      onClose();
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (!supabaseUrl || !supabaseAnonKey) {
      setStatus('error');
      setErrorMessage('Trial booking is temporarily unavailable. Please call us at (425) 785-5217.');
      return;
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/trial-class-request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          contact_name: formData.contactName.trim(),
          student_name: formData.studentName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          student_age: formData.studentAge ? Number(formData.studentAge) : null,
          class_interest: formData.classInterest,
          location_interest: formData.locationInterest,
          notes: formData.notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || 'Unable to submit your request.');
      }

      setStatus('success');
      setFormData(initialFormData);

      // Use a dedicated confirmation page so Google Ads records only
      // successfully submitted trial requests, never ordinary form visits.
      window.location.assign('/trial-class/thank-you');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit your request.');
    }
  };

  return (
    <div
      className={isModal ? 'fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm' : 'w-full'}
      role={isModal ? 'dialog' : undefined}
      aria-modal={isModal ? true : undefined}
      aria-labelledby="trial-form-title"
      onMouseDown={(event) => {
        if (isModal && event.target === event.currentTarget) handleClose();
      }}
    >
      <div className={isModal ? 'relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl' : 'relative w-full overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200'}>
        {isModal && <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm hover:text-rose-600"
          aria-label="Close trial class form"
        >
          <X size={22} />
        </button>}

        <div className="bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-8 text-white sm:px-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-100">Your first step</p>
          <h2 id="trial-form-title" className="font-serif text-3xl font-bold">Book a Trial Class</h2>
          <p className="mt-2 text-rose-50">Tell us what you are interested in and we will contact you to confirm a class.</p>
        </div>

        {status === 'success' ? (
          <div className="px-6 py-14 text-center sm:px-10">
            <CheckCircle2 className="mx-auto mb-5 text-emerald-500" size={56} />
            <h3 className="font-serif text-2xl font-bold text-slate-900">Request received!</h3>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Thank you. Our team has been notified and will follow up with trial class details.
            </p>
            {isModal && <button type="button" onClick={handleClose} className="mt-8 rounded-full bg-rose-600 px-8 py-3 font-medium text-white hover:bg-rose-700">
              Done
            </button>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-5 px-6 py-8 sm:grid-cols-2 sm:px-10">
            <label className="text-sm font-medium text-slate-700">
              Your name <span className="text-rose-600">*</span>
              <input required name="contactName" value={formData.contactName} onChange={handleChange} autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Student name <span className="text-rose-600">*</span>
              <input required name="studentName" value={formData.studentName} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Email <span className="text-rose-600">*</span>
              <input required type="email" name="email" value={formData.email} onChange={handleChange} autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Phone <span className="text-rose-600">*</span>
              <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} autoComplete="tel" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Student age
              <input type="number" min="3" max="120" name="studentAge" value={formData.studentAge} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Class of interest <span className="text-rose-600">*</span>
              <select required name="classInterest" value={formData.classInterest} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100">
                <option value="">Select a class</option>
                {CLASS_CATEGORIES.map((classCategory) => <option key={classCategory.id} value={classCategory.title}>{classCategory.title}</option>)}
                <option value="Not sure">Not sure yet</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Preferred location <span className="text-rose-600">*</span>
              <select required name="locationInterest" value={formData.locationInterest} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100">
                <option value="">Select a location</option>
                {LOCATIONS.map((location) => <option key={location.id} value={location.name}>{location.name} — {location.address}</option>)}
                <option value="No preference">No preference</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Anything else we should know?
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} maxLength={1000} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
            </label>

            {status === 'error' && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2" role="alert">{errorMessage}</p>}

            <button type="submit" disabled={status === 'submitting'} className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-8 py-3 font-semibold text-white shadow-lg hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
              {status === 'submitting' && <Loader2 className="animate-spin" size={18} />}
              {status === 'submitting' ? 'Sending request...' : 'Request My Trial Class'}
            </button>
            <p className="text-center text-xs text-slate-500 sm:col-span-2">We will only use your information to arrange your trial class.</p>
          </form>
        )}
      </div>
    </div>
  );
};

export default TrialClassForm;
