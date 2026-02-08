'use client';

import { useState } from 'react';

export default function SurveyForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    responses: {
      question1: '',
      question2: '',
      question3: '',
      question4: '',
      question5: '',
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name' || name === 'email') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        responses: {
          ...prev.responses,
          [name]: value,
        },
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit survey');
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        responses: {
          question1: '',
          question2: '',
          question3: '',
          question4: '',
          question5: '',
        },
      });

      // Notify parent component
      if (onSuccess) {
        onSuccess(data);
      }

      alert('Survey submitted successfully!');
    } catch (err) {
      setError(err.message);
      console.error('Error submitting survey:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-black dark:text-zinc-50">
        Survey Form
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-2 text-black dark:text-zinc-50"
          >
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2 text-black dark:text-zinc-50"
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="question1"
            className="block text-sm font-medium mb-2 text-black dark:text-zinc-50"
          >
            Question 1: How satisfied are you with our service? (1-10)
          </label>
          <input
            type="number"
            id="question1"
            name="question1"
            min="1"
            max="10"
            value={formData.responses.question1}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="question2"
            className="block text-sm font-medium mb-2 text-black dark:text-zinc-50"
          >
            Question 2: What is your favorite feature?
          </label>
          <textarea
            id="question2"
            name="question2"
            value={formData.responses.question2}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="question3"
            className="block text-sm font-medium mb-2 text-black dark:text-zinc-50"
          >
            Question 3: Would you recommend us to others? (Yes/No/Maybe)
          </label>
          <select
            id="question3"
            name="question3"
            value={formData.responses.question3}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an option</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Maybe">Maybe</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="question4"
            className="block text-sm font-medium mb-2 text-black dark:text-zinc-50"
          >
            Question 4: How did you hear about us?
          </label>
          <input
            type="text"
            id="question4"
            name="question4"
            value={formData.responses.question4}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="question5"
            className="block text-sm font-medium mb-2 text-black dark:text-zinc-50"
          >
            Question 5: Additional comments
          </label>
          <textarea
            id="question5"
            name="question5"
            value={formData.responses.question5}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Survey'}
        </button>
      </form>
    </div>
  );
}
