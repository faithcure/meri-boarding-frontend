import Fastify from 'fastify';
import { config } from './config.js';
import { embedText } from './embedding.js';
import { ensureCollection, qdrantHealth, searchPoints } from './qdrant.js';
import { generateRagAnswer } from './groq.js';

const server = Fastify({ logger: true });

function languageToText(code) {
  if (code === 'de') return 'German';
  if (code === 'tr') return 'Turkish';
  return 'English';
}

function detectQuestionLanguage(question) {
  const text = String(question || '');
  const lower = text.toLowerCase();

  if (/[çğıöşü]/i.test(text) || /\b(türkçe|merhaba|hangi|hizmet|konuş|musun|mı|mi|neden|nasıl)\b/.test(lower)) {
    return 'tr';
  }

  if (/[äöüß]/i.test(text) || /\b(hallo|danke|ich|sie|wie|kann|sprechen|bitte|heute)\b/.test(lower)) {
    return 'de';
  }

  if (/\b(hello|can|you|speak|english|what|how|services|reservation|thanks)\b/.test(lower)) {
    return 'en';
  }

  return '';
}

function resolveAnswerLocale(question, requestedLocale) {
  const detected = detectQuestionLanguage(question);
  if (detected) return detected;
  if (requestedLocale === 'de' || requestedLocale === 'tr' || requestedLocale === 'en') return requestedLocale;
  return 'en';
}

function dedupeHits(hits) {
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    const id = String(hit?.id ?? '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(hit);
  }
  return out;
}

function buildSources(hits) {
  const bySource = new Map();
  for (const hit of hits) {
    const payload = hit?.payload || {};
    const sourceId = String(payload.sourceId || payload.title || hit.id || 'source').trim();
    if (!sourceId) continue;
    if (!bySource.has(sourceId)) {
      bySource.set(sourceId, {
        sourceId,
        title: String(payload.title || sourceId),
        locale: String(payload.locale || ''),
        url: String(payload.url || ''),
        score: Number(hit?.score || 0)
      });
    }
  }
  return [...bySource.values()];
}

server.get('/health', async () => {
  let qdrantOk = false;
  try {
    qdrantOk = await qdrantHealth();
  } catch (err) {
    qdrantOk = false;
  }

  return {
    ok: true,
    service: 'meri-rag-service',
    qdrant: qdrantOk,
    embeddingProvider: config.embeddingProvider,
    model: config.groqModel
  };
});

server.post('/query', async (request, reply) => {
  const body = request.body || {};
  const question = String(body.question || '').trim();
  const locale = String(body.locale || '').trim().toLowerCase();
  const answerLocale = resolveAnswerLocale(question, locale);
  const topK = Math.max(1, Math.min(12, Number(body.topK || config.ragTopK)));

  if (!question || question.length < 3) {
    return reply.code(400).send({ error: 'Question must be at least 3 characters.' });
  }

  const vector = await embedText(question);
  await ensureCollection(vector.length);

  const scopedHits = await searchPoints(vector, { limit: topK, locale });
  const globalHits = scopedHits.length >= topK ? [] : await searchPoints(vector, { limit: topK });

  const hits = dedupeHits([...scopedHits, ...globalHits]).slice(0, config.ragMaxContextChunks);

  if (hits.length === 0) {
    return reply.send({
      ok: true,
      answer: answerLocale === 'de'
        ? 'Ich habe dazu aktuell keine passenden Inhalte gefunden.'
        : answerLocale === 'tr'
          ? 'Bu soruyla ilgili uygun bir icerik bulamadim.'
          : 'I could not find relevant content for this question.',
      answerLocale,
      sources: []
    });
  }

  let answer;
  let model;

  try {
    const generated = await generateRagAnswer({
      question,
      answerLocale,
      preferredLocale: locale,
      hits
    });
    answer = generated.answer;
    model = generated.model;
  } catch (err) {
    request.log.error(err);
    answer = answerLocale === 'de'
      ? 'Die Antworterzeugung ist fehlgeschlagen. Bitte erneut versuchen.'
      : answerLocale === 'tr'
        ? 'Yanit uretilirken hata olustu. Lutfen tekrar deneyin.'
        : 'Answer generation failed. Please try again.';
    model = 'error';
  }

  return reply.send({
    ok: true,
    model,
    answerLocale,
    preferredLocale: locale ? languageToText(locale) : 'none',
    answer,
    sources: buildSources(hits)
  });
});

server.listen({ port: config.port, host: config.host }).then(() => {
  server.log.info(`meri-rag-service listening on ${config.host}:${config.port}`);
}).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
