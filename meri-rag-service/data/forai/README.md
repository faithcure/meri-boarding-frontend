# forai data

Bu klasor, DOCX tabanli chatbot bilgi/tone iceriginin RAG'e uygun yapilandirilmis JSON versiyonunu tutar.

## Dosyalar

- `knowledge.tr.v1.json`: Soru-cevap odakli bilgi tabani (TR)
- `tone-policy.v1.json`: Ton, kisilik ve hard policy kurallari

## Yapi notu

`knowledge.*.json` dosyasi `items[]` listesi ile calisir. Her item icin en az su alanlar olmalidir:

- `id`
- `question`
- `answer`

Opsiyonel ama onerilen alanlar:

- `category`
- `title`
- `tags`

## Reindex

JSON dosyalarini guncelledikten sonra:

```bash
docker compose exec -T rag-service npm run index
```

RAG bu verileri `forai:qa:*` veya `forai:policy:*` sourceId ile Qdrant'a yazar.
