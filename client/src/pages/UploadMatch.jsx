import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createMatch } from '../api.js';

export default function UploadMatch() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    title: '',
    opponent: '',
    match_date: '',
    weight_class: '',
    result: 'Win',
    style: 'folkstyle',
    video_url: '',
  });

  function onChange(e) {
    const { name, value, files } = e.target;
    void files;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.title.trim()) {
      setError('Match title is required.');
      return;
    }
    if (!form.style) {
      setError('Wrestling style is required.');
      return;
    }
    if (!form.video_url.trim()) {
      setError('Paste a YouTube or direct video URL.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createMatch({
        title: form.title.trim(),
        opponent: form.opponent,
        match_date: form.match_date,
        weight_class: form.weight_class,
        result: form.result,
        style: form.style,
        video_url: form.video_url.trim(),
      });
      setSuccess('Match saved successfully. Taking you to the breakdown…');
      setTimeout(() => {
        navigate(`/matches/${created.id}`);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1>Upload match</h1>
          <p className="muted">Add film by pasting a YouTube or direct video URL.</p>
        </div>
        <Link to="/dashboard" className="btn btn-ghost">
          Back to dashboard
        </Link>
      </div>

      <form className="card form-card" onSubmit={onSubmit}>
        {error ? <p className="error-banner">{error}</p> : null}
        {success ? <p className="success-banner">{success}</p> : null}

        <label className="field">
          <span>Match title *</span>
          <input name="title" value={form.title} onChange={onChange} required placeholder="e.g. Regionals — Semis" />
        </label>

        <label className="field">
          <span>Opponent name</span>
          <input name="opponent" value={form.opponent} onChange={onChange} placeholder="Opponent" />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" name="match_date" value={form.match_date} onChange={onChange} />
          </label>
          <label className="field">
            <span>Weight class</span>
            <input name="weight_class" value={form.weight_class} onChange={onChange} placeholder="157 lbs" />
          </label>
          <label className="field">
            <span>Result</span>
            <select name="result" value={form.result} onChange={onChange}>
              <option>Win</option>
              <option>Loss</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Wrestling Style *</span>
          <select name="style" value={form.style} onChange={onChange} disabled={submitting} required>
            <option value="folkstyle">Folkstyle</option>
            <option value="freestyle">Freestyle</option>
            <option value="greco">Greco-Roman</option>
          </select>
        </label>

        <label className="field">
          <span>Video or YouTube URL *</span>
          <input
            name="video_url"
            value={form.video_url}
            onChange={onChange}
            placeholder="https://www.youtube.com/watch?v=… or https://…/clip.mp4"
            disabled={submitting}
            required
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save match'}
          </button>
        </div>
      </form>
    </div>
  );
}
