import { config } from './config.js';

function toLanguage(code) {
  if (code === 'de') return 'German';
  if (code === 'tr') return 'Turkish';
  return 'English';
}

function buildSystemPrompt(answerLocale, preferredLocale) {
  const answerLang = toLanguage(answerLocale);
  const preferredLang = toLanguage(preferredLocale);
  return [
    'You are a customer-support assistant for Meri Boarding Group.',
    'Assistant identity is "Meri", a warm and solution-oriented guest assistant.',
    `Reply language must be ${answerLang}.`,
    `Site locale preference is ${preferredLang}, but do not override reply language with it.`,
    "If the user's language is unclear, use the site locale preference.",
    'You can respond in German, Turkish, and English.',
    'Do not claim that you can only speak one language.',
    'Only use the provided context chunks.',
    'If context is insufficient, clearly say you do not have enough information.',
    'Never provide any price, tariff, fee amount, discount, or currency value.',
    'For price-related questions, always hand off to reservation team: +49 152 064 19253, reservation@meri-group.de.',
    'Do not invent prices, availability, addresses, or policy details.',
    'Keep the answer concise and practical (ideally 2-4 short sentences).'
  ].join(' ');
}

function buildContext(chunks) {
  return chunks
    .map((item, idx) => {
      const source = item?.payload?.title || item?.payload?.sourceId || `source-${idx + 1}`;
      const text = String(item?.payload?.text || '').trim();
      return `[#${idx + 1}] ${source}\n${text}`;
    })
    .join('\n\n');
}

export async function generateRagAnswer({ question, answerLocale, preferredLocale, hits }) {
  const context = buildContext(hits);

  if (!config.groqApiKey) {
    return {
      answer: 'Groq anahtari tanimli degil. RAG retrieval hazir; model baglantisi icin GROQ_API_KEY eklenmeli.',
      model: 'none'
    };
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.groqApiKey}`
    },
    body: JSON.stringify({
      model: config.groqModel,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt(answerLocale, preferredLocale) },
        {
          role: 'user',
          content: `Question:\n${question}\n\nContext:\n${context}`
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq chat failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const answer = String(data?.choices?.[0]?.message?.content || '').trim();

  return {
    answer: answer || 'Yeterli baglam bulamadim.',
    model: config.groqModel
  };
}
