"use client";
import { useState } from "react";

export default function SurveyForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([""]);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => setQuestions([...questions, ""]);
  const updateQuestion = (idx, val) => {
    const copy = [...questions];
    copy[idx] = val;
    setQuestions(copy);
  };
  const removeQuestion = (idx) => setQuestions(questions.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { title, description, questions: questions.filter((q) => q.trim()) };
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Unknown error");
      alert("Survey created successfully.");
      setTitle("");
      setDescription("");
      setQuestions([""]);
    } catch (err) {
      alert("Error creating survey: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{justifyContent: 'center', alignItems: 'center', display: 'flex'}}>
        <form onSubmit={handleSubmit} style={{ maxWidth: 900, width: '100%' }}>
        <div className="asrs-card" style={{ padding: '1rem' }}>
            <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontWeight: 600 }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: "100%", padding: 10, borderRadius: 8, border: '1px solid var(--color-bg-tertiary)' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontWeight: 600 }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: '1px solid var(--color-bg-tertiary)' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontWeight: 600 }}>Questions</label>
            {questions.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={q} onChange={(e) => updateQuestion(i, e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--color-bg-tertiary)' }} placeholder={`Question ${i + 1}`} />
                <button type="button" onClick={() => removeQuestion(i)} disabled={questions.length === 1} className="asrs-btn-secondary">Remove</button>
                </div>
            ))}
            <div style={{ marginTop: 6 }}>
                <button type="button" onClick={addQuestion} className="asrs-btn-secondary">Add question</button>
            </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="asrs-btn-primary">{saving ? "Saving..." : "Create Survey"}</button>
            </div>
        </div>
        </form>
    </div>
  );
}
