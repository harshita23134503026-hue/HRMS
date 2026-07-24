import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Help = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    const subject = encodeURIComponent("Feedback from TaskFleet");
    const body = encodeURIComponent(
      `Name: ${name || "N/A"}\nEmail: ${email || "N/A"}\n\nFeedback:\n${feedback}`
    );
    const mailtoLink = `mailto:hrms@insri.in?subject=${subject}&body=${body}`;

    window.location.href = mailtoLink;

    setSubmitted(true);
    setName("");
    setEmail("");
    setFeedback("");

    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#e2e8ff]">
      <header className="w-full bg-white/70 backdrop-blur-md border-b border-[#e2e8ff] px-8 py-5 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-extrabold text-[#26203B] tracking-tight">Feedback</h1>
          <p className="text-xs text-gray-500 mt-0.5">Send your thoughts to hrms@insri.in</p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-xs text-[#20A4F3] hover:underline font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition"
        >
          Back to Home
        </button>
      </header>

      <main className="w-full max-w-3xl mx-auto px-6 md:px-10 py-12">
        <section className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          <h2 className="text-xl font-extrabold text-[#26203B] mb-2">Feedback</h2>
          <p className="text-sm text-gray-500 mb-8">
            We value your input. Submit your feedback below — it will be sent directly to <span className="font-medium text-[#26203B]">hrms@insri.in</span>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="fb-name" className="block mb-1.5 font-medium text-xs text-[#26203B]">Name</label>
                <input
                  id="fb-name"
                  type="text"
                  placeholder="Your name"
                  className="w-full h-[48px] px-4 border border-[#a192dd] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white transition"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="fb-email" className="block mb-1.5 font-medium text-xs text-[#26203B]">Email</label>
                <input
                  id="fb-email"
                  type="email"
                  placeholder="your@email.com"
                  className="w-full h-[48px] px-4 border border-[#a192dd] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="fb-body" className="block mb-1.5 font-medium text-xs text-[#26203B]">Feedback</label>
              <textarea
                id="fb-body"
                rows={6}
                placeholder="Share your thoughts, suggestions, or concerns..."
                className="w-full px-4 py-3 border border-[#a192dd] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-none transition"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full md:w-auto md:min-w-[200px] bg-[#20A4F3] text-white py-3 rounded-xl hover:bg-blue-600 transition text-sm font-bold shadow-md"
              >
                Submit Feedback
              </button>
            </div>

            {submitted && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm text-center font-medium">
                Feedback submitted! Opening email to hrms@insri.in...
              </div>
            )}
          </form>
        </section>
      </main>
    </div>
  );
};

export default Help;
