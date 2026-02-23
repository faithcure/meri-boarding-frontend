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

  if (
    /[çğıöşü]/i.test(text) ||
    /\b(türkçe|merhaba|hangi|hizmet|konuş|musun|musunuz|mı|mi|mu|mü|neden|nasıl|nedir|saatleri|lokasyon|kaç|kac|evcil)\b/.test(lower)
  ) {
    return 'tr';
  }

  if (
    /[äöüß]/i.test(text) ||
    /\b(hallo|danke|ich|sie|wie|kann|sprechen|bitte|heute|wann|sind|haben|haustiere|standorte|uhr)\b/.test(lower)
  ) {
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

function isPriceQuery(question) {
  const q = String(question || '').toLowerCase();
  if (!q) return false;
  const patterns = [
    /\bfiyat\b/, /\bucret\b/, /\bücret\b/, /\bne kadar\b/, /\btl\b/, /\beuro\b/, /\b€\b/,
    /\bprice\b/, /\bcost\b/, /\brate\b/, /\bhow much\b/, /\bquote\b/,
    /\bpreis\b/, /\bkosten\b/, /\bwie viel\b/, /\bangebot\b/
  ];
  return patterns.some((re) => re.test(q));
}

function containsPriceLikeValue(text) {
  const value = String(text || '');
  if (!value) return false;
  if (/[€$£]/.test(value)) return true;
  return /\b\d{1,4}(?:[.,]\d{1,2})?\s?(?:eur|euro|tl|usd|gbp)\b/i.test(value);
}

function buildNoPriceMessage(locale) {
  if (locale === 'de') {
    return 'Preisinformationen geben wir im Chat nicht an. Unser Reservierungsteam hilft Ihnen direkt weiter: +49 152 064 19253 oder reservation@meri-group.de.';
  }
  if (locale === 'tr') {
    return 'Chat uzerinden fiyat bilgisi paylasmiyoruz. Rezervasyon ekibimiz size dogrudan yardimci olur: +49 152 064 19253 veya reservation@meri-group.de.';
  }
  return 'We do not provide pricing in chat. Our reservation team can assist you directly: +49 152 064 19253 or reservation@meri-group.de.';
}

function isLocationCountQuery(question) {
  const q = String(question || '').toLowerCase();
  if (!q) return false;
  const tr = /(kac|kaç).*(otel|lokasyon|konum|tesis|yer|sube|şube).*(var|mevcut)?/i.test(q);
  const de = /(wie viele).*(standort|hotel|haeuser|häuser|objekt).*(gibt|haben)/i.test(q);
  const en = /(how many).*(hotel|location|property|site).*(do you have|are there|have)/i.test(q);
  return tr || de || en;
}

function buildLocationCountMessage(locale) {
  if (locale === 'de') {
    return 'Wir haben insgesamt 3 Standorte: Stuttgart Flamingo, Stuttgart Europaplatz und Hildesheim.';
  }
  if (locale === 'tr') {
    return 'Toplam 3 lokasyonumuz var: Stuttgart Flamingo, Stuttgart Europaplatz ve Hildesheim.';
  }
  return 'We currently have 3 locations: Stuttgart Flamingo, Stuttgart Europaplatz, and Hildesheim.';
}

function isCheckinCheckoutQuery(question) {
  const q = String(question || '').toLowerCase();
  if (!q) return false;
  return (
    /\b(check[\s-]?in|check[\s-]?out)\b/.test(q) ||
    /\b(giris|çıkış|cikis).*(saat|zaman)\b/i.test(q) ||
    /\b(wann).*(check[\s-]?in|check[\s-]?out|uhr)\b/.test(q)
  );
}

function buildCheckinCheckoutMessage(locale) {
  if (locale === 'de') return 'Check-in ist ab 14:00 Uhr, Check-out bis 12:00 Uhr.';
  if (locale === 'tr') return "Check-in 14:00'ten itibaren, check-out 12:00'ye kadar.";
  return 'Check-in starts at 14:00 and check-out is until 12:00.';
}

function isPetPolicyQuery(question) {
  const q = String(question || '').toLowerCase();
  if (!q) return false;
  return /\b(evcil|pet|pets|dog|cat|haustier|haustiere)\b/.test(q);
}

function buildPetPolicyMessage(locale) {
  if (locale === 'de') {
    return 'Haustiere werden je nach Apartment und Verfuegbarkeit im Einzelfall geprueft. Bitte kontaktieren Sie vorab unser Reservierungsteam: +49 152 064 19253 oder reservation@meri-group.de.';
  }
  if (locale === 'tr') {
    return 'Evcil hayvan talepleri daire ve musaitlik durumuna gore degerlendirilir. Lutfen rezervasyon oncesi ekibimizle iletisime gecin: +49 152 064 19253 veya reservation@meri-group.de.';
  }
  return 'Pet requests are reviewed case by case depending on apartment and availability. Please contact our reservation team before booking: +49 152 064 19253 or reservation@meri-group.de.';
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

  if (isPriceQuery(question)) {
    return reply.send({
      ok: true,
      model: 'policy_no_price',
      answerLocale,
      preferredLocale: locale ? languageToText(locale) : 'none',
      answer: buildNoPriceMessage(answerLocale),
      sources: []
    });
  }

  if (isLocationCountQuery(question)) {
    return reply.send({
      ok: true,
      model: 'policy_fact_shortcut',
      answerLocale,
      preferredLocale: locale ? languageToText(locale) : 'none',
      answer: buildLocationCountMessage(answerLocale),
      sources: [
        {
          sourceId: `forai:qa:gen-locations-count:${answerLocale}`,
          title: `forai.qa.gen-locations-count (${answerLocale})`,
          locale: answerLocale,
          url: '/contact',
          score: 1
        }
      ]
    });
  }

  if (isCheckinCheckoutQuery(question)) {
    return reply.send({
      ok: true,
      model: 'policy_fact_shortcut',
      answerLocale,
      preferredLocale: locale ? languageToText(locale) : 'none',
      answer: buildCheckinCheckoutMessage(answerLocale),
      sources: []
    });
  }

  if (isPetPolicyQuery(question)) {
    return reply.send({
      ok: true,
      model: 'policy_fact_shortcut',
      answerLocale,
      preferredLocale: locale ? languageToText(locale) : 'none',
      answer: buildPetPolicyMessage(answerLocale),
      sources: []
    });
  }

  const vector = await embedText(question);
  await ensureCollection(vector.length);

  const localeScopes = [];
  if (answerLocale) localeScopes.push(answerLocale);
  if (locale && locale !== answerLocale) localeScopes.push(locale);

  const localeHits = [];
  for (const scope of localeScopes) {
    const scoped = await searchPoints(vector, { limit: topK, locale: scope });
    localeHits.push(...scoped);
    if (dedupeHits(localeHits).length >= topK) break;
  }

  const globalHits = dedupeHits(localeHits).length >= topK ? [] : await searchPoints(vector, { limit: topK });
  const hits = dedupeHits([...localeHits, ...globalHits]).slice(0, config.ragMaxContextChunks);
  const topScore = Number(hits?.[0]?.score || 0);

  if (hits.length === 0 || topScore < config.ragMinTopScore) {
    return reply.send({
      ok: true,
      model: 'low_confidence_handoff',
      answer: answerLocale === 'de'
        ? 'Ich habe dazu aktuell keine verlasslichen Informationen. Bitte kontaktieren Sie unser Team: +49 152 064 19253 oder reservation@meri-group.de.'
        : answerLocale === 'tr'
          ? 'Bu konuda su an guvenilir bir bilgi bulamadim. Lutfen ekibimizle iletisime gecin: +49 152 064 19253 veya reservation@meri-group.de.'
          : 'I do not have reliable information for this yet. Please contact our team: +49 152 064 19253 or reservation@meri-group.de.',
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

  if (containsPriceLikeValue(answer)) {
    answer = buildNoPriceMessage(answerLocale);
    model = 'policy_no_price';
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
