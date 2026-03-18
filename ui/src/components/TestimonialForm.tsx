import { useState } from 'react';
import { Star, Send, CheckCircle } from 'lucide-react';

export default function TestimonialForm() {
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    userRole: '',
    userCompany: '',
    rating: 5,
    quote: '',
    feedback: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3100/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit testimonial');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h3 className="mb-2 text-2xl font-bold text-emerald-400">Thank You!</h3>
        <p className="text-zinc-300">
          Your testimonial has been submitted and is pending review. We'll feature it on our site soon!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
      <div>
        <h3 className="mb-2 text-2xl font-bold text-zinc-100">Share Your Experience</h3>
        <p className="text-sm text-zinc-400">
          Help others discover Hivemind by sharing your success story
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.userName}
            onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.userEmail}
            onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Role</label>
          <input
            type="text"
            value={formData.userRole}
            onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            placeholder="Founder, Developer, etc."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Company</label>
          <input
            type="text"
            value={formData.userCompany}
            onChange={(e) => setFormData({ ...formData, userCompany: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            placeholder="Your Company Name"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">
          Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => setFormData({ ...formData, rating })}
              className="transition hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  rating <= formData.rating
                    ? 'fill-amber-500 text-amber-500'
                    : 'text-zinc-700'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">
          Your Testimonial <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={formData.quote}
          onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
          placeholder="Tell us about your experience with Hivemind. What did you build? What results did you achieve?"
        />
        <p className="mt-1 text-xs text-zinc-500">
          This will be displayed publicly on our website
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">
          Additional Feedback (Optional)
        </label>
        <textarea
          value={formData.feedback}
          onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
          placeholder="Any suggestions, feature requests, or private feedback for the team?"
        />
        <p className="mt-1 text-xs text-zinc-500">
          This will not be published — it's for internal use only
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-5 w-5" />
            Submit Testimonial
          </>
        )}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Your testimonial will be reviewed before being published
      </p>
    </form>
  );
}
