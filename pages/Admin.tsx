import React, { useEffect, useState } from 'react';
import { CheckCircle2, ImageUp, Loader2, LockKeyhole, RefreshCw } from 'lucide-react';

type TrialRequest = {
  id: string; created_at: string; contact_name: string; student_name: string;
  email: string; phone: string; student_age: number | null; class_interest: string;
  location_interest: string; notes: string | null; followup_completed: boolean;
  followup_completed_at: string | null; notification_sent: boolean;
};

const endpoint = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1/admin-portal`;

const Admin: React.FC = () => {
  const [accessCode, setAccessCode] = useState(() => sessionStorage.getItem('tumam_admin_key') ?? '');
  const [unlocked, setUnlocked] = useState(false);
  const [requests, setRequests] = useState<TrialRequest[]>([]);
  const [albums, setAlbums] = useState<string[]>([]);
  const [album, setAlbum] = useState('');
  const [newAlbum, setNewAlbum] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const callAdmin = async (body: Record<string, unknown>) => {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': accessCode },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Admin request failed');
    return result;
  };

  const load = async () => {
    setBusy(true); setMessage('');
    try {
      const [requestResult, albumResult] = await Promise.all([
        callAdmin({ action: 'list_requests' }), callAdmin({ action: 'list_albums' }),
      ]);
      setRequests(requestResult.requests ?? []);
      setAlbums(albumResult.albums ?? []);
      setAlbum((current) => current || albumResult.albums?.[0] || '');
      sessionStorage.setItem('tumam_admin_key', accessCode);
      setUnlocked(true);
    } catch (error) {
      setUnlocked(false); setMessage(error instanceof Error ? error.message : 'Unable to unlock admin page');
    } finally { setBusy(false); }
  };

  useEffect(() => { if (accessCode) load(); }, []);

  const toggleFollowup = async (request: TrialRequest) => {
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, followup_completed: !item.followup_completed } : item));
    try {
      await callAdmin({ action: 'set_followup', id: request.id, completed: !request.followup_completed });
    } catch (error) {
      setRequests((current) => current.map((item) => item.id === request.id ? request : item));
      setMessage(error instanceof Error ? error.message : 'Unable to update follow-up');
    }
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetAlbum = newAlbum.trim() || album;
    if (!targetAlbum || !files.length) return;
    setBusy(true); setMessage('');
    try {
      for (const file of files) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        await callAdmin({ action: 'upload_image', album: targetAlbum, file_name: file.name, content_type: file.type, base64 });
      }
      setMessage(`${files.length} image${files.length === 1 ? '' : 's'} uploaded to ${targetAlbum}.`);
      setFiles([]); setNewAlbum('');
      const result = await callAdmin({ action: 'list_albums' });
      setAlbums(result.albums ?? []); setAlbum(targetAlbum);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed'); }
    finally { setBusy(false); }
  };

  if (!unlocked) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={(event) => { event.preventDefault(); load(); }} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <LockKeyhole className="mb-4 text-rose-600" size={32} />
        <h1 className="font-serif text-2xl font-bold text-slate-900">Admin access</h1>
        <p className="mt-2 text-sm text-slate-500">Enter the shared access code.</p>
        <input autoFocus type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} className="mt-6 w-full rounded-xl border px-4 py-3" required />
        {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
        <button disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
          {busy && <Loader2 className="animate-spin" size={18} />} Open admin
        </button>
      </form>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="font-serif text-3xl font-bold text-slate-900">Nrityangan Admin</h1><p className="text-slate-500">Trial requests and gallery uploads</p></div>
          <button onClick={load} disabled={busy} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm"><RefreshCw size={17} /> Refresh</button>
        </div>
        {message && <p className="mb-6 rounded-xl bg-white p-4 text-sm text-slate-700 shadow-sm">{message}</p>}

        <section className="mb-10 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-900">Trial class requests</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-3">Follow-up</th><th className="p-3">Received</th><th className="p-3">Contact</th><th className="p-3">Student</th><th className="p-3">Class / Location</th><th className="p-3">Notes</th></tr></thead>
              <tbody>{requests.map((request) => <tr key={request.id} className={request.followup_completed ? 'border-b bg-emerald-50/60' : 'border-b'}>
                <td className="p-3"><button onClick={() => toggleFollowup(request)} className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium ${request.followup_completed ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}`}>{request.followup_completed && <CheckCircle2 size={16} />}{request.followup_completed ? 'Completed' : 'Mark complete'}</button></td>
                <td className="p-3 whitespace-nowrap">{new Date(request.created_at).toLocaleString()}</td>
                <td className="p-3"><strong>{request.contact_name}</strong><br/><a className="text-rose-600" href={`mailto:${request.email}`}>{request.email}</a><br/><a className="text-rose-600" href={`tel:${request.phone}`}>{request.phone}</a></td>
                <td className="p-3"><strong>{request.student_name}</strong>{request.student_age && <><br/>Age {request.student_age}</>}</td>
                <td className="p-3">{request.class_interest}<br/><span className="text-slate-500">{request.location_interest}</span></td>
                <td className="max-w-xs p-3 text-slate-600">{request.notes || 'â€”'}</td>
              </tr>)}</tbody>
            </table>
            {!requests.length && <p className="p-8 text-center text-slate-500">No trial requests yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><ImageUp className="text-rose-600"/><h2 className="text-xl font-bold text-slate-900">Upload gallery images</h2></div>
          <form onSubmit={upload} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Existing album<select value={album} onChange={(event) => setAlbum(event.target.value)} disabled={!!newAlbum} className="mt-2 w-full rounded-xl border bg-white px-4 py-3"><option value="">Select album</option>{albums.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Or create a new album<input value={newAlbum} onChange={(event) => setNewAlbum(event.target.value)} placeholder="Example: 2026-Summer-Recital" className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">Images (8 MB maximum each)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="mt-2 block w-full rounded-xl border p-3" required /></label>
            <button disabled={busy || (!album && !newAlbum.trim())} className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2">{busy && <Loader2 className="animate-spin" size={18}/>} Upload {files.length || ''} image{files.length === 1 ? '' : 's'}</button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default Admin;

