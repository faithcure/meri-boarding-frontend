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
    'Keep the answer concise and practical (ideally 2-4 short sentences).',
    'Use conversation history only to resolve references like "that", "there", "same hotel".'
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

function buildHistory(history) {
  if (!Array.isArray(history) || history.length < 1) return '';
  return history
    .slice(-12)
    .map((item, idx) => {
      const role = String(item?.role || '').trim().toLowerCase() === 'assistant' ? 'Assistant' : 'User';
      const content = String(item?.content || '').replace(/\s+/g, ' ').trim().slice(0, 600);
      if (!content) return '';
      return `[H${idx + 1}] ${role}: ${content}`;
    })
    .filter(Boolean)
    .join('\n');
}

export async function generateRagAnswer({ question, answerLocale, preferredLocale, hits, history = [] }) {
  const context = buildContext(hits);
  const historyText = buildHistory(history);

  if (!config.groqApiKey) {
    return {
      answer: 'Groq anahtari tanimli degil. RAG retrieval hazir; model baglantisi icin GROQ_API_KEY eklenmeli.',
      model: 'none'
    };
  }

  const preferredModel = String(config.groqModel || '').trim() || 'llama-3.3-70b-versatile';
  const fallbackModel = 'llama-3.1-8b-instant';
  const modelOrder = preferredModel === fallbackModel ? [preferredModel] : [preferredModel, fallbackModel];
  let lastError = null;

  for (const modelName of modelOrder) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.groqApiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildSystemPrompt(answerLocale, preferredLocale) },
          {
            role: 'user',
            content: `Question:\n${question}\n\nConversation history:\n${historyText || 'none'}\n\nContext:\n${context}`
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      lastError = new Error(`Groq chat failed (${response.status}) [${modelName}]: ${body}`);
      // Retry on quota/transient issues with next model, fail fast on other classes.
      if (response.status === 429 || response.status >= 500) continue;
      throw lastError;
    }

    const data = await response.json();
    const answer = String(data?.choices?.[0]?.message?.content || '').trim();
    return {
      answer: answer || 'Yeterli baglam bulamadim.',
      model: modelName
    };
  }

  throw lastError || new Error('Groq chat failed without response');
}
