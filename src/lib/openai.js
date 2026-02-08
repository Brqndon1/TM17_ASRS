import OpenAI from 'openai';

// Lazily initialize OpenAI client (only when an API key is available)
let _openai = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Generate an enhanced report using GPT-4 based on survey responses
 * @param {Object} responses - Survey responses object
 * @param {Object} basicStats - Basic statistics (completionRate, totalQuestions, etc.)
 * @returns {Promise<Object>} Enhanced report with AI-generated insights
 */
export async function generateAIReport(responses, basicStats) {
  const openai = getOpenAI();
  if (!openai) {
    // No API key configured — return basic stats only
    return {
      ...basicStats,
      aiGenerated: false,
      error: 'OpenAI API key not configured',
      summary: `Survey completed with ${basicStats.completionRate}% completion rate (${basicStats.answeredQuestions}/${basicStats.totalQuestions} questions answered).`,
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    // Prepare the prompt for GPT-4
    const prompt = `Analyze the following survey responses and generate a comprehensive report with insights, trends, and recommendations.

Survey Responses:
${JSON.stringify(responses, null, 2)}

Basic Statistics:
- Completion Rate: ${basicStats.completionRate}%
- Total Questions: ${basicStats.totalQuestions}
- Answered Questions: ${basicStats.answeredQuestions}
- Response Types: ${JSON.stringify(basicStats.responseTypes)}

Please provide:
1. A detailed summary of the responses
2. Key insights and patterns identified
3. Sentiment analysis (if applicable)
4. Actionable recommendations based on the feedback
5. Any notable trends or concerns

Format your response as a JSON object with the following structure:
{
  "summary": "Detailed summary text",
  "insights": ["insight1", "insight2", ...],
  "sentiment": "positive/neutral/negative",
  "recommendations": ["recommendation1", "recommendation2", ...],
  "trends": ["trend1", "trend2", ...],
  "concerns": ["concern1", "concern2", ...] or []
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert data analyst specializing in survey analysis. Provide clear, actionable insights based on survey responses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const aiAnalysis = JSON.parse(completion.choices[0].message.content);

    return {
      ...basicStats,
      aiGenerated: true,
      aiSummary: aiAnalysis.summary,
      insights: aiAnalysis.insights || [],
      sentiment: aiAnalysis.sentiment || 'neutral',
      recommendations: aiAnalysis.recommendations || [],
      trends: aiAnalysis.trends || [],
      concerns: aiAnalysis.concerns || [],
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating AI report:', error);
    // Fallback to basic report if AI fails
    return {
      ...basicStats,
      aiGenerated: false,
      error: 'AI analysis unavailable',
      generatedAt: new Date().toISOString(),
    };
  }
}

export default getOpenAI;
