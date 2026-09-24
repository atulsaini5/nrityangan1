import { useState, type FormEvent } from 'react';
import type { Agenda } from '../lib/agenda';

export default function AgendaCorrectionForm({ agenda }: { agenda: Agenda }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const items = agenda.sections.flatMap(section => section.items);
  const field = 'mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base font-normal text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-700';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const performance = items.find(item => item.id === data.get('performance'));
    setStatus('sending');
    setMessage('');
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error();
      const response = await fetch(`${url}/functions/v1/agenda-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          year: agenda.year,
          performance: performance ? `${performance.number ? `${performance.number}. ` : ''}${performance.title}` : 'General participant correction',
          participant: data.get('participant'), correction: data.get('correction'),
          email: data.get('email'), website: data.get('website'),
        }),
      });
      if (!response.ok) throw new Error(response.status === 429 ? 'Please wait a few minutes before sending another correction.' : '');
      setStatus('success');
      form.reset();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error && error.message.startsWith('Please wait') ? error.message : 'We could not send your request. Please try again, or email at@teamevents.ai.');
    }
  }

  return <section aria-labelledby="correction-heading" className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
    <h2 id="correction-heading" className="font-serif text-2xl text-stone-900">Request a participant correction</h2>
    <p className="mt-2 text-sm leading-relaxed text-stone-600">Missing a participant or spotted a spelling mistake? Let us know so we can review it.</p>
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-stone-700 sm:col-span-2">Performance
        <select name="performance" className={field}><option value="">General / not sure</option>{items.map(item => <option key={item.id} value={item.id}>{item.number ? `${item.number}. ` : ''}{item.title}</option>)}</select>
      </label>
      <label className="text-sm font-semibold text-stone-700">Participant name (required)
        <input name="participant" required maxLength={120} className={field} placeholder="Name as shown, or missing participant"/>
      </label>
      <label className="text-sm font-semibold text-stone-700">Your email (optional)
        <input name="email" type="email" autoComplete="email" maxLength={254} className={field}/>
      </label>
      <label className="text-sm font-semibold text-stone-700 sm:col-span-2">Requested correction (required)
        <textarea name="correction" required maxLength={1500} rows={3} className={field} placeholder="Enter the correct spelling or describe the change."/>
      </label>
      <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
      <p className="text-xs text-stone-500 sm:col-span-2">Your request is emailed privately to the studio for review. Your email will only be used to follow up about this correction.</p>
      {status === 'success' && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 sm:col-span-2">Thank you! Your correction request has been sent for review.</p>}
      {status === 'error' && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{message}</p>}
      <button disabled={status === 'sending'} className="min-h-11 rounded-full bg-[#702b3c] px-6 py-3 text-sm font-semibold text-white hover:bg-[#54202d] disabled:opacity-60 sm:justify-self-start">{status === 'sending' ? 'Sending…' : 'Send correction request'}</button>
    </form>
  </section>;
}
