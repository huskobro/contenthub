# ContentHub Sistem Referans Belgesi

**Versiyon:** 1.0 — 2026-04-06
**Kapsam:** Standard Video Modülü + News Bulletin Modülü — Uçtan Uca Mimari

---

## İçindekiler

1. [Genel Mimari](#1-genel-mimari)
2. [LLM Provider Zinciri](#2-llm-provider-zinciri)
3. [TTS Provider](#3-tts-provider)
4. [Görsel Provider Zinciri](#4-görsel-provider-zinciri)
5. [Standard Video Modülü](#5-standard-video-modülü)
6. [News Bulletin Modülü](#6-news-bulletin-modülü)
7. [Haber Kaynakları ve Tarama](#7-haber-kaynakları-ve-tarama)
8. [Settings Registry](#8-settings-registry)
9. [Job Engine ve Step Runner](#9-job-engine-ve-step-runner)
10. [Artifact Yapıları](#10-artifact-yapıları)
11. [Hata Senaryoları](#11-hata-senaryoları)

---

## 1. Genel Mimari

ContentHub localhost-first, modüler bir içerik üretim ve yayın platformudur.

```
┌─────────────────────────────────────────────────────┐
│                   Admin Panel (React)               │
│   Wizard │ Detail Pages │ Tables │ Job Monitor      │
└─────────────────────┬───────────────────────────────┘
                      │ REST + SSE
┌─────────────────────▼───────────────────────────────┐
│                FastAPI Backend                      │
│  Router → Service → Repository → SQLite (WAL)       │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Standard     │  │ News         │                 │
│  │ Video Module │  │ Bulletin     │                 │
│  │ (7-step)     │  │ Module       │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         └────────┬─────────┘                        │
│              Job Engine                             │
│         ┌────────▼──────────┐                       │
│         │  Step Executors   │                       │
│         │  Script / TTS     │                       │
│         │  Subtitle / Comp  │                       │
│         │  Render / Publish │                       │
│         └────────┬──────────┘                       │
└──────────────────┼──────────────────────────────────┘
                   │
      ┌────────────┼──────────────┐
      │            │              │
  KieAI/LLM    EdgeTTS       Remotion CLI
  (Gemini)    (Microsoft)    (video render)
```

### Katman Kuralları

- **Router**: Yalnızca HTTP — iş mantığı yok
- **Service**: İş mantığı — diğer service'leri çağırabilir, router'ı çağıramaz
- **Repository/Model**: SQLAlchemy ORM — sadece persistence
- **Executor**: Pipeline adımı — provider'ları çağırır, artifact yazar
- **Provider**: Dış servis adaptörü — httpx ile dış API çağrısı yapar

---

## 2. LLM Provider Zinciri

### Dosyalar
- `backend/app/providers/llm/kie_ai_provider.py`
- `backend/app/providers/llm/openai_compat_provider.py`
- `backend/app/providers/llm/_openai_compat_base.py`
- `backend/app/providers/resolution.py`
- `backend/app/providers/registry.py`

### Provider Hiyerarşisi

```
Primary: KieAiProvider
  └─ Model: gemini-2.5-flash
  └─ Base URL: https://kie.ai/api/v1
  └─ Timeout: 60 saniye
  └─ Temperature: 0.7

Fallback: OpenAICompatProvider
  └─ Model: gpt-4o-mini (varsayılan, override edilebilir)
  └─ Base URL: api.openai.com/v1
```

### resolve_and_invoke() Algoritması

```python
async def resolve_and_invoke(registry, capability, input_data):
    chain = registry.get_chain(ProviderCapability.LLM)

    for i, provider in enumerate(chain):
        try:
            output = await provider.invoke(input_data)
            output.trace["resolution_role"] = "primary" if i == 0 else "fallback"
            return output

        except NonRetryableProviderError:
            # Yapılandırma hatası, input hatası → fallback YOK
            raise

        except (ProviderInvokeError, httpx.TimeoutException, httpx.ConnectError):
            # Geçici hata → bir sonraki provider'a geç
            logger.warning(...)
```

### Hata Türleri

| Hata | Fallback? | Açıklama |
|------|-----------|----------|
| `NonRetryableProviderError` | Hayır | API key yok, input geçersiz |
| `ProviderInvokeError` | Evet | API 5xx, zaman aşımı |
| `httpx.TimeoutException` | Evet | 60s aşıldı |
| `httpx.ConnectError` | Evet | Ağ bağlantısı yok |

### API Key Ayarları

| Ayar Anahtarı | Tür | Açıklama |
|---------------|-----|----------|
| `credential.kie_ai_api_key` | secret | KieAI/Gemini erişimi |
| `credential.openai_api_key` | secret | Fallback OpenAI |

> **Not:** API key tanımlanmamışsa script ve metadata adımları `NonRetryableProviderError` fırlatır — fallback da aynı hatayı alır. Üretim başlamaz.

---

## 3. TTS Provider

### Dosyalar
- `backend/app/providers/tts/edge_tts_provider.py`
- `backend/app/providers/tts/voice_map.py`

### EdgeTTSProvider

Microsoft Edge TTS — API key gerektirmez, ücretsiz.

```python
EdgeTTSProvider.invoke({
    "text": "Seslendirulecek metin",
    "voice": "tr-TR-AhmetNeural",   # voice_map'ten
    "output_path": "/path/to/scene_1.mp3"
})
# → ProviderOutput(result={"output_path": ..., "duration_seconds": ...})
```

### Ses Kodu Eşlemesi (voice_map.py)

| Dil | Ses Kodu | Cinsiyet |
|-----|----------|----------|
| `tr` | `tr-TR-AhmetNeural` | Erkek |
| `en` | `en-US-ChristopherNeural` | Erkek |

### Süre Tahmini

EdgeTTS gerçek ses süresi döndürmez. Tahmin formülü:

```python
duration_seconds = round(len(metin) / 15.0, 2)  # ~15 karakter/saniye
```

---

## 4. Görsel Provider Zinciri

### Dosyalar
- `backend/app/providers/visuals/pexels_provider.py`
- `backend/app/providers/visuals/pixabay_provider.py`

### Fallback Zinciri

```
Primary: PexelsProvider   → https://api.pexels.com/v1/search
Fallback: PixabayProvider → https://pixabay.com/api/
```

Her sahne için:
1. Pexels'te ara → başarılıysa `scene_N.jpg` kaydet
2. Pexels başarısızsa Pixabay'da ara
3. İkisi de başarısızsa: `"source": "not_found"` ile manifest yaz (adım başarısız sayılmaz)

### API Key Ayarları

| Ayar | Tür |
|------|-----|
| `credential.pexels_api_key` | secret |
| `credential.pixabay_api_key` | secret |

---

## 5. Standard Video Modülü

### 5.1 Pipeline Adımları

```
1. Script     → LLM → script.json
2. Metadata   → LLM → metadata.json
3. TTS        → EdgeTTS → audio_manifest.json + scene_N.mp3
4. Visuals    → Pexels/Pixabay → visuals_manifest.json + scene_N.jpg
5. Subtitle   → Whisper (varsa) veya cursor → subtitles.srt + word_timing.json
6. Composition → birleştir → composition_props.json
7. Render     → Remotion CLI → output.mp4
[Publish]     → YouTube (ayrı trigger)
```

> Publish otomatik tetiklenmez. `operator_confirm` idempotency tipindedir — PublishRecord ayrıca oluşturulmalıdır.

### 5.2 Input Şeması

```json
{
  "topic": "Yapay Zeka Nedir?",
  "language": "tr",
  "duration_seconds": 60,
  "subtitle_style_preset": "clean_white",
  "template_id": null,
  "style_blueprint_id": null,
  "workspace_root": "/path/to/workspace"
}
```

### 5.3 ScriptStepExecutor

**Dosya:** `executors/script.py`
**Idempotency:** `re_executable` — Her çalıştırmada yeniden üretir

**Akış:**
1. Job input parse → `StepExecutionContext` oluştur
2. Template context kontrol (M11 — tone, language_rules)
3. `build_script_prompt()` → LLM mesajları hazırla
4. `resolve_and_invoke(LLM)` → Gemini'ye gönder
5. JSON parse + markdown strip (`_strip_markdown_json`)
6. `script.json` artifact yaz

**LLM Prompt Yapısı:**

```
SYSTEM:
"Sen bir video script yazarısın. Türkçe dilinde, 60 saniyelik kısa bir
video için sahne sahne senaryo üreteceksin.
[ton + dil kuralları]

ÇIKTI FORMATI: Yalnızca geçerli JSON döndür:
{
  "title": "...",
  "scenes": [
    {"scene_number": 1, "narration": "...", "visual_cue": "...", "duration_seconds": 10}
  ],
  "total_duration_seconds": 60,
  "language": "tr"
}"

USER:
"Konu: Yapay Zeka Nedir?
Hedef süre: 60 saniye
Dil: Türkçe
Bu konu için video senaryosu üret."
```

**Output:**
```json
{
  "artifact_path": "artifacts/script.json",
  "language": "tr",
  "scene_count": 6,
  "provider": { "provider_id": "kie_ai", "model": "gemini-2.5-flash", "latency_ms": 1240 }
}
```

### 5.4 MetadataStepExecutor

**Dosya:** `executors/metadata.py`
**Idempotency:** `re_executable`

**Akış:**
1. `script.json` oku
2. Template context kontrol (seo_keywords)
3. `build_metadata_prompt()` → LLM mesajları hazırla
4. `resolve_and_invoke(LLM)`
5. `metadata.json` yaz

**LLM Prompt:**

```
SYSTEM:
"Sen bir YouTube içerik uzmanısın. Verilen script'ten platform için
optimize edilmiş metadata üreteceksin.
[dil, tag stili, hashtag stili]

ÇIKTI FORMATI:
{"title":"...","description":"...","tags":[...],"hashtags":[...],"language":"tr"}"

USER:
"Script başlığı: Yapay Zeka Nedir?
Script özeti (ilk sahnelerden): ...
Dil: Türkçe"
```

### 5.5 TTSStepExecutor

**Dosya:** `executors/tts.py`
**Idempotency:** `artifact_check` — `audio_manifest.json` varsa atla

**Akış:**
```
script.json → her sahne için:
  → EdgeTTS.invoke({text, voice, output_path})
  → scene_N.mp3 kaydet
  → duration_seconds hesapla (len/15.0)
→ audio_manifest.json yaz
```

**Voice Override (M14):**
Template `style_blueprint.motion_rules.voice_style` tanımlamışsa o ses kodu kullanılır.

### 5.6 VisualsStepExecutor

**Dosya:** `executors/visuals.py`
**Idempotency:** `artifact_check` — `visuals_manifest.json` varsa atla

**Arama Sorgusu:**
```python
# Template style_blueprint.visual_rules.image_style varsa prefix ekle
search_query = f"{image_style_prefix} {visual_cue}"  # "cinematic mountain view"
# yoksa sadece visual_cue kullanılır
```

**Sahne Başına Yedek:**
- Pexels başarısız → Pixabay dene
- İkisi de başarısız → `source: "not_found"` — adım başarısız sayılmaz

### 5.7 SubtitleStepExecutor

**Dosya:** `executors/subtitle.py`
**Idempotency:** `artifact_check` — `subtitle_metadata.json` varsa atla

**Timing Modları:**

| Mod | Koşul | Açıklama |
|-----|-------|----------|
| `whisper_word` | Whisper provider kayıtlı + kelime timestamp'i var | En hassas |
| `whisper_segment` | Whisper var ama kelime timestamp'i yok | Segment bazlı |
| `cursor` | Whisper yok (varsayılan) | audio_manifest sürelerinden tahmin |

**Cursor Modu SRT Üretimi:**
```
cursor = 0.0
her sahne için:
  start = cursor
  end = cursor + duration_seconds
  SRT bloğu yaz: "00:00:08,500 --> 00:00:18,500\nnarration metni"
  cursor += duration_seconds
```

**Whisper Modu (varsa):**
- Her sahne ses dosyası Whisper'a gönderilir
- Kelime bazlı `{word, start, end, probability}` listesi alınır
- `word_timing.json` artifact yazılır

**Output Artifacts:**
- `subtitles.srt`
- `word_timing.json` (Whisper varsa)
- `subtitle_metadata.json`

### 5.8 CompositionStepExecutor

**Dosya:** `executors/composition.py`
**Idempotency:** `artifact_check` — `composition_props.json` varsa atla

**Birleştirme:**
```
script.json + audio_manifest.json + visuals_manifest.json
+ subtitle_metadata.json + metadata.json
→ composition_props.json
```

**Güvenli Composition Mapping:**
```python
composition_id = get_composition_id("standard_video")  # → "StandardVideo"
# Sabit mapping — dinamik/AI üretimi yasak (CLAUDE.md C-07)
```

**Subtitle Stil (Boundary Fallback):**
```python
preset = get_preset_for_composition(preset_id)
# None/bilinmeyen → "clean_white" (DEFAULT_PRESET_ID)
# → ValueError fırlatmaz, güvenli fallback
```

**5 Subtitle Preset:**

| Preset ID | Font | Aktif Renk | Arka Plan |
|-----------|------|------------|-----------|
| `clean_white` | 36px 600 #FFF | #FFD700 | rgba(0,0,0,0.35) |
| `bold_yellow` | 40px 700 #FFE000 | #FF6B00 | rgba(0,0,0,0.5) |
| `minimal_dark` | 32px 400 #FFF | #00D4FF | none |
| `gradient_glow` | 38px 700 #FFF | #FF00FF | rgba(0,0,0,0.4) |
| `outline_only` | 34px 600 #FFF | #FFD700 | none |

### 5.9 RenderStepExecutor

**Dosya:** `executors/render.py`
**Idempotency:** `artifact_check` — `output.mp4` varsa atla

**Akış:**
1. `composition_props.json` oku
2. `word_timing_path` → JSON'dan `wordTimings[]` yükle (inline)
3. `render_props.json` yaz (composition_props → Remotion formatı)
4. Remotion CLI çalıştır:

```bash
npx remotion render src/Root.tsx StandardVideo /artifacts/output.mp4 \
  --props render_props.json --log info
```

**Duration Fallback (M23-C):**
```python
if not total_duration_seconds or total_duration_seconds <= 0:
    # Sessiz varsayılan YOK — uyarı logla + 60s fallback + degradation_warnings'e ekle
    render_props["total_duration_seconds"] = 60.0
    duration_fallback_used = True
```

**Multi-Output (M34 — News Bulletin için):**
```python
if len(render_outputs) > 1:
    return await self._execute_multi_output(...)
    # Her output_key için ayrı render_props_{key}.json + ayrı video dosyası
```

**Timeout:** 600 saniye (10 dakika)

**Shell Injection Koruması:**
```python
args = ["npx", "remotion", "render", ..., composition_id, output_path, ...]
# args liste → shell=False → injection yok
proc = await asyncio.create_subprocess_exec(*args, cwd=renderer_dir)
```

### 5.10 Durum Geçişleri (Standard Video)

```
(input alındı)
     ↓
   draft
     ↓ pipeline başlatılınca
 in_progress
     ↓ her step tamamlandıkça
 completed / failed
```

---

## 6. News Bulletin Modülü

### 6.1 Pipeline Adımları

```
1. Script     → LLM → bulletin_script.json    (spiker narration)
2. Metadata   → LLM → metadata.json
3. TTS        → EdgeTTS → audio_manifest.json  (paylaşılan executor)
4. Subtitle   → cursor/Whisper → subtitles.srt  (paylaşılan executor)
5. Composition → bulletin_composition_props.json
6. Render     → Remotion CLI → video(lar)      (paylaşılan executor)
[Publish]     → YouTube (ayrı trigger)
```

> Standard Video ile aynı TTS, Subtitle, Render, Publish executor'larını kullanır. Script ve Composition bulletin'e özgüdür.

### 6.2 Durum Makinesi (State Machine)

```
draft
  │  (haber seç → NewsBulletinSelectedItem yaz)
  ↓
  ── [confirm_selection()] ──────────────────────────────────────────
selection_confirmed
  │  (NewsItem.status HALA "new" — henüz değişmez)
  │  Warning: UsedNewsRegistry'de zaten kayıtlı item'lar uyarı verir
  ↓
  ── [consume_news()] ──────────────────────────────────────────────
in_progress
  │  NewsItem.status = "used"  ← YALNIZCA consume_news() bunu yazar
  │  UsedNewsRegistry kaydı oluşturulur
  ↓
  ── [start_production()] ──────────────────────────────────────────
rendering
  │  Job oluşturulur + dispatch edilir
  │  bulletin.job_id set edilir
  ↓
done / failed
  │  _watch_bulletin_job() background task → bulletin.status günceller
```

**KRITIK SEMANTİK GARANTI:**
> `NewsItem.status = "used"` YALNIZCA `consume_news()` fonksiyonu tarafından atanır.
> Scan engine, editorial gate ve start_production() bu değeri doğrudan yazmaz.

### 6.3 Bülten Oluşturma Alanları

| Alan | Tür | Pipeline'da mı? | Açıklama |
|------|-----|-----------------|----------|
| `topic` | string | Evet | Bülten konusu |
| `language` | string | Evet | Dil kodu (tr/en) |
| `tone` | string | Evet | formal/casual/energetic |
| `target_duration_seconds` | int | Evet | Hedef video süresi |
| `render_mode` | string | Evet | combined/per_category/per_item |
| `composition_direction` | string | Evet | Kompozisyon yönü |
| `thumbnail_direction` | string | Evet | Thumbnail yönü |
| `template_id` | string | Evet | Template bağlantısı |
| `style_blueprint_id` | string | Evet | Stil blueprint |
| `subtitle_style` | string | Evet | Altyazı stili |
| `lower_third_style` | string | Evet | Alt üçgen stili |
| `trust_enforcement_level` | string | Evet | none/warn/block |
| `title` | string | Hayır (cosmetic) | Metadata adımı üretir |
| `brief` | string | Hayır (cosmetic) | Pipeline tüketmez |
| `bulletin_style` | string | Hayır (legacy) | Kullanılmıyor |

### 6.4 BulletinScriptExecutor

**Dosya:** `news_bulletin/executors/script.py`
**Idempotency:** `re_executable`

**Settings Snapshot'tan Okunan Ayarlar:**
- `news_bulletin.prompt.narration_system` (zorunlu — boşsa hata)
- `news_bulletin.prompt.narration_style_rules`
- `news_bulletin.prompt.anti_clickbait_rules`
- `news_bulletin.config.narration_word_limit_per_item` (varsayılan: 80)
- `news_bulletin.config.default_tone` (varsayılan: formal)
- `news_bulletin.config.default_language` (varsayılan: tr)

**LLM Prompt Yapısı:**

```
SYSTEM:
"[news_bulletin.prompt.narration_system — admin tarafından yönetilir]
[news_bulletin.prompt.narration_style_rules]
[news_bulletin.prompt.anti_clickbait_rules]

ÇIKTI FORMATI: Yalnızca geçerli JSON döndür:
{
  "items": [
    {"item_number":1, "headline":"...", "narration":"...", "duration_seconds":15}
  ],
  "transitions": ["..."],
  "total_duration_seconds": 120,
  "language": "tr"
}"

USER:
"Aşağıdaki haberleri spiker tarzında narration metinlerine dönüştür.
Dil: Türkçe
Ton: formal
Hedef toplam süre: 120 saniye
Haber başına max kelime: 80

Haberler:
Haber 1: [headline]
  Özet: [summary]

Haber 2: [headline]
  [DÜZENLENMIŞ NARRATION — AYNEN KORU: edited_narration içeriği]"
```

> `edited_narration` olan haberler için LLM talimatı: "bu metni olduğu gibi koru, sadece geçiş cümleleri ekle."

**Output — `bulletin_script.json`:**
```json
{
  "items": [
    {
      "item_number": 1,
      "headline": "Merkez Bankası Faiz Kararını Açıkladı",
      "narration": "Spiker tarzı narration metni...",
      "duration_seconds": 15,
      "category": "finans"
    }
  ],
  "transitions": ["Şimdi ekonomi haberlerine geçiyoruz..."],
  "total_duration_seconds": 120,
  "language": "tr",
  "bulletin_id": "uuid..."
}
```

### 6.5 BulletinMetadataExecutor

**Dosya:** `news_bulletin/executors/metadata.py`
**Idempotency:** `re_executable`

**M31 Geliştirmeleri:**
- Baskın kategori belirlenir (`get_dominant_category()`)
- Tone bilgisi metadata üretiminde kullanılır
- SEO optimizasyonu iyileştirildi

**Kullandığı Ayar:** `news_bulletin.prompt.metadata_title_rules`

### 6.6 BulletinCompositionExecutor

**Dosya:** `news_bulletin/executors/composition.py`
**Idempotency:** `artifact_check`

**ÖNEMLI:** Bu executor render YAPMAZ — sadece props hazırlar.

**render_mode Davranışları:**

| Mod | Çıktı | render_outputs[] |
|-----|-------|-----------------|
| `combined` | Tüm haberler tek video | 1 eleman |
| `per_category` | Her kategori için ayrı video | N eleman (kategori sayısı) |
| `per_item` | Her haber için ayrı video | N eleman (haber sayısı) |

**Güvenli Composition Mapping:**
```python
get_composition_id("news_bulletin")  # → "NewsBulletin"
```

**Lower Third Stilleri:**

| Stil | Görünüm |
|------|---------|
| `broadcast` | Klasik TV alt başlık |
| `minimal` | Minimalist, ince çizgi |
| `modern` | Modern, gradient |

### 6.7 Trust Enforcement

**Dosya:** `news_bulletin/service.py → check_trust_enforcement()`

| Seviye | Davranış |
|--------|----------|
| `none` | Kontrol yok |
| `warn` | Düşük güvenilirlikli kaynak var → uyarı ver, üretim devam eder |
| `block` | Düşük güvenilirlikli kaynak var → üretimi engelle (422 hata) |

**Algoritma:**
```
selected_items → her item'ın source_id'si
→ NewsSource.trust_level kontrol
→ trust_level == "low" → low_trust_items listesine ekle
→ block modunda: pass = False, start_production() reddeder
```

### 6.8 Kategori → Stil Otomatik Eşlemesi

**Fonksiyon:** `get_category_style_suggestion(category)`

| Kategori | Altyazı Stili | Lower Third | Kompozisyon |
|----------|--------------|-------------|-------------|
| `general` | clean_white | broadcast | classic |
| `tech` | gradient_glow | modern | dynamic |
| `finance` | minimal_dark | broadcast | side_by_side |
| `crypto` | gradient_glow | modern | dynamic |
| `sports` | bold_yellow | modern | fullscreen |
| `entertainment` | bold_yellow | minimal | dynamic |
| (bilinmeyen) | → general | → general | → general |

### 6.9 Editorial Gate

**Dosya:** `news_bulletin/editorial_gate.py`

**`confirm_selection(bulletin_id)`**
- `bulletin.status == "draft"` zorunlu
- En az 1 NewsBulletinSelectedItem zorunlu
- `bulletin.status = "selection_confirmed"` yazar
- NewsItem.status DEĞİŞMEZ
- Zaten UsedNewsRegistry'de kayıtlı item'lar: uyarı döner ama bloklamaz

**`consume_news(bulletin_id)`**
- `bulletin.status == "selection_confirmed"` zorunlu
- Her seçili haber için:
  - `UsedNewsRegistry` kaydı yazar (usage_type: "published")
  - `news_item.status = "used"` atar
- `bulletin.status = "in_progress"` yazar

**`start_production(bulletin_id)`**
- `bulletin.status == "in_progress"` zorunlu
- En az 1 selected item zorunlu
- Trust enforcement check (block modunda engel)
- Settings snapshot oluşturur (tüm `news_bulletin.*` ayarları)
- Selected items snapshot oluşturur (headline, summary, edited_narration)
- Job oluşturur → dispatch eder
- `bulletin.status = "rendering"` yazar
- Background watcher başlatır

### 6.10 API Endpoint Listesi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/modules/news-bulletin` | Bülten listesi |
| POST | `/api/v1/modules/news-bulletin` | Yeni bülten |
| GET | `/api/v1/modules/news-bulletin/{id}` | Bülten detayı |
| PATCH | `/api/v1/modules/news-bulletin/{id}` | Bülten güncelle |
| POST | `/api/v1/modules/news-bulletin/{id}/clone` | Bülten kopyala |
| GET | `/api/v1/modules/news-bulletin/{id}/script` | Script getir |
| POST | `/api/v1/modules/news-bulletin/{id}/script` | Script oluştur |
| PATCH | `/api/v1/modules/news-bulletin/{id}/script` | Script güncelle |
| GET | `/api/v1/modules/news-bulletin/{id}/metadata` | Metadata getir |
| GET | `/api/v1/modules/news-bulletin/{id}/selected-news` | Seçili haberler |
| POST | `/api/v1/modules/news-bulletin/{id}/selected-news` | Haber ekle |
| PATCH | `/api/v1/modules/news-bulletin/{id}/selected-news/{sel_id}` | Haber güncelle |
| DELETE | `/api/v1/modules/news-bulletin/{id}/selected-news/{sel_id}` | Haber çıkar |
| POST | `/api/v1/modules/news-bulletin/{id}/confirm-selection` | Seçimi onayla |
| POST | `/api/v1/modules/news-bulletin/{id}/consume-news` | Haberleri tüket |
| GET | `/api/v1/modules/news-bulletin/{id}/selectable-news` | Seçilebilir haberler |
| **POST** | **`/api/v1/modules/news-bulletin/{id}/start-production`** | **Üretimi başlat** |
| GET | `/api/v1/modules/news-bulletin/{id}/trust-check` | Trust kontrolü |
| GET | `/api/v1/modules/news-bulletin/{id}/category-style-suggestion` | Stil önerisi |

---

## 7. Haber Kaynakları ve Tarama

### 7.1 NewsSource

| Alan | Değerler | Açıklama |
|------|----------|----------|
| `source_type` | rss / manual_url / api | Kaynak türü |
| `scan_mode` | manual / auto / curated | Tarama modu |
| `status` | active / paused / archived | Kaynak durumu |
| `trust_level` | low / medium / high | Güvenilirlik (trust enforcement) |
| `feed_url` | string | RSS feed URL |
| `language` | string | Kaynak dili |
| `category` | string | Kaynak kategorisi |

**scan_mode Açıklaması:**
- `manual`: Kullanıcı "Şimdi Tara" butonuna basınca çalışır
- `auto`: Scheduler her 5 dakikada bir otomatik tarar
- `curated`: Tarama başlatılır, sonuçlar seçerek onaylanır
- **Not:** Mod ne olursa olsun, "Şimdi Tara" butonu her zaman çalışır

**Şu an yalnızca `source_type=rss` için execute destekli.**
`manual_url` ve `api` için backend hata döner.

### 7.2 Auto-Scan Scheduler

- Her 5 dakikada çalışır
- `scan_mode='auto'` + `status='active'` kaynakları tarar
- Mevcut `queued/running` scan varsa atlar
- Cooldown: Son tamamlanan scan'den bu yana yeterli süre geçmemişse atlar
- Batch limit: Her çevrimde max 5 kaynak

### 7.3 Tarama Akışı (execute_rss_scan)

```
1. RSS feed'i feedparser ile çek
2. Her entry için:
   a. Hard Dedupe: URL tam eşleşmesi → varsa atla (allow_followup ile ATLATILAMAZ)
   b. Soft Dedupe: Başlık Jaccard benzerliği ≥ 0.65 → varsa atla
      (allow_followup=True ile atlatılabilir)
3. Geçen entry'leri NewsItem olarak kaydet (status='new')
4. ScanExecuteResponse döndür:
   {fetched_count, new_count, skipped_dedupe, skipped_hard, skipped_soft}
```

### 7.4 Dedupe Detayları

**Hard Dedupe:**
```python
key = url.strip().lower()
# Aynı URL zaten varsa → is_suppressed=True, reason="hard_url_match"
```

**Soft Dedupe (Jaccard):**
```python
THRESHOLD = 0.65
tokens_a = set(title_a.lower().split())
tokens_b = set(title_b.lower().split())
score = len(tokens_a & tokens_b) / len(tokens_a | tokens_b)
# score >= 0.65 → benzer kabul edilir → suppressed (allow_followup=False ise)
```

**follow-up Exception:**
```python
POST /source-scans/{id}/execute
{"allow_followup": true}
# → Soft dedupe atlanır, aynı konuyu takip eden haberler yazılır
# → Hard dedupe hala çalışır
```

### 7.5 NewsItem Yaşam Döngüsü

```
scan → new
              ↓ (bulletin wizard'da görünür)
           selected (sadece NewsBulletinSelectedItem olarak)
              ↓ consume_news()
             used  ← SADECE consume_news() yazar

           veya: reviewed (editör inceledi)
           veya: ignored  (atlandı)
```

### 7.6 Yeni Kaynak Eklenince Otomatik Tarama

Frontend `SourceCreatePage.tsx`:
```typescript
onSuccess: async (created) => {
    if (created.source_type === "rss") {
        const scan = await createSourceScan({source_id: created.id, scan_mode: "manual"});
        await executeSourceScan(scan.id, false);
        toast.success(`İlk tarama tamamlandı: ${result.new_count} haber kaydedildi`);
    }
}
```

---

## 8. Settings Registry

### 8.1 Ayar Öncelik Zinciri

```
1. DB admin_value_json      (admin panelinden girilen değer)
2. DB default_value_json    (kayıt sırasında tanımlanan varsayılan)
3. .env / ortam değişkeni   (deployment konfigürasyonu)
4. KNOWN_SETTINGS builtin_default (kod içindeki son çare)
```

### 8.2 News Bulletin Ayarları

| Anahtar | Tür | Varsayılan | Açıklama |
|---------|-----|-----------|----------|
| `news_bulletin.prompt.narration_system` | prompt | TV spiker talimatı | Script LLM system prompt |
| `news_bulletin.prompt.narration_style_rules` | prompt | Formal, kısa cümle | Script stil kuralları |
| `news_bulletin.prompt.anti_clickbait_rules` | prompt | Clickbait yasağı | Script yasak kalıplar |
| `news_bulletin.prompt.metadata_title_rules` | prompt | YouTube SEO kuralları | Metadata LLM prompt |
| `news_bulletin.config.default_language` | string | tr | Varsayılan dil |
| `news_bulletin.config.default_tone` | string | formal | Varsayılan ton |
| `news_bulletin.config.default_duration_seconds` | integer | 120 | Varsayılan süre |
| `news_bulletin.config.max_items_per_bulletin` | integer | 10 | Max haber sayısı |
| `news_bulletin.config.narration_word_limit_per_item` | integer | 80 | Haber başına max kelime |
| `news_bulletin.config.default_subtitle_style` | string | clean_white | Varsayılan altyazı |
| `news_bulletin.config.default_lower_third_style` | string | broadcast | Varsayılan lower third |
| `news_bulletin.config.trust_enforcement_level` | string | warn | none/warn/block |

### 8.3 Credential Ayarları

| Anahtar | Tür | Kullanım |
|---------|-----|----------|
| `credential.kie_ai_api_key` | secret | KieAI → Gemini 2.5 Flash |
| `credential.openai_api_key` | secret | Fallback OpenAI |
| `credential.pexels_api_key` | secret | Görsel arama (primary) |
| `credential.pixabay_api_key` | secret | Görsel arama (fallback) |

### 8.4 Settings Snapshot (Job Başlarken)

Job başlatıldığında tüm ayarlar anlık olarak kopyalanır:

```python
# start_production() içinde
settings_snapshot = await settings_service.get_all_for_module("news_bulletin")
input_data["_settings_snapshot"] = settings_snapshot
```

**Bu neden önemli:** Job çalışırken admin bir prompt ayarını değiştirse bile, o job snapshot'taki değeri kullanır. Çalışan job etkilenmez.

---

## 9. Job Engine ve Step Runner

### 9.1 Job Durumları

```
queued → running → completed
                 → failed
                 → cancelled
```

### 9.2 Idempotency Tipleri

| Tip | Davranış | Hangi Adımlar |
|-----|----------|--------------|
| `re_executable` | Her zaman yeniden çalıştır | Script, Metadata |
| `artifact_check` | Artifact JSON varsa adımı atla | TTS, Visuals, Subtitle, Composition, Render |
| `operator_confirm` | PublishRecord trigger zorunlu | Publish |

### 9.3 Provider Trace

Her executor step'i bir provider trace kaydeder:

```json
{
  "provider_id": "kie_ai",
  "model": "gemini-2.5-flash",
  "resolution_role": "primary",
  "latency_ms": 1240,
  "fallback_from": null
}
```

Fallback devreye girince:
```json
{
  "provider_id": "openai_compat",
  "resolution_role": "fallback",
  "fallback_from": "kie_ai",
  "latency_ms": 890
}
```

---

## 10. Artifact Yapıları

### 10.1 script.json (Standard Video)

```json
{
  "title": "Yapay Zeka Nedir?",
  "scenes": [
    {
      "scene_number": 1,
      "narration": "Yapay zeka, insan zekasını taklit eden...",
      "visual_cue": "futuristic robot thinking",
      "duration_seconds": 10
    }
  ],
  "total_duration_seconds": 60,
  "language": "tr"
}
```

### 10.2 bulletin_script.json (News Bulletin)

```json
{
  "items": [
    {
      "item_number": 1,
      "headline": "Merkez Bankası Faiz Kararını Açıkladı",
      "narration": "Merkez Bankası bugün yapılan toplantıda faiz...",
      "duration_seconds": 18,
      "category": "finans"
    }
  ],
  "transitions": ["Şimdi ekonomi haberlerine geçiyoruz..."],
  "total_duration_seconds": 120,
  "language": "tr",
  "bulletin_id": "uuid..."
}
```

### 10.3 audio_manifest.json

```json
{
  "scenes": [
    {
      "scene_number": 1,
      "audio_path": "artifacts/audio/scene_1.mp3",
      "narration": "Spiker metni...",
      "duration_seconds": 10.4
    }
  ],
  "total_duration_seconds": 62.1,
  "voice": "tr-TR-AhmetNeural",
  "language": "tr"
}
```

### 10.4 word_timing.json (Whisper varsa)

```json
{
  "version": "1",
  "timing_mode": "whisper_word",
  "language": "tr",
  "words": [
    {"scene": 1, "word": "Yapay", "start": 0.0, "end": 0.3, "probability": 0.98},
    {"scene": 1, "word": "zeka", "start": 0.35, "end": 0.7, "probability": 0.97}
  ],
  "word_count": 142
}
```

### 10.5 composition_props.json

```json
{
  "job_id": "uuid...",
  "module_id": "standard_video",
  "language": "tr",
  "composition_id": "StandardVideo",
  "props": {
    "title": "Yapay Zeka Nedir?",
    "scenes": [...],
    "subtitles_srt": "artifacts/subtitles.srt",
    "word_timing_path": "artifacts/word_timing.json",
    "timing_mode": "whisper_word",
    "subtitle_style": {
      "preset_id": "clean_white",
      "font_size": 36,
      "font_weight": "600",
      "text_color": "#FFFFFF",
      "active_color": "#FFD700",
      "background": "rgba(0,0,0,0.35)",
      "outline_width": 2,
      "outline_color": "#000000",
      "line_height": 1.4
    },
    "total_duration_seconds": 62.1,
    "language": "tr",
    "metadata": {
      "title": "...",
      "description": "...",
      "tags": [...],
      "hashtags": [...]
    }
  },
  "render_status": "props_ready",
  "created_at": "2026-04-06T12:00:00Z"
}
```

### 10.6 News Bulletin — render_outputs[] (multi-render)

```json
{
  "render_outputs": [
    {
      "output_key": "combined",
      "output_label": "Tüm Bülten",
      "composition_id": "NewsBulletin",
      "suggested_filename": "bulletin_combined.mp4",
      "props": {
        "bulletinTitle": "Günlük Bülten",
        "items": [...],
        "renderMode": "combined",
        "subtitleStyle": {...},
        "lowerThirdStyle": "broadcast",
        "totalDurationSeconds": 120
      }
    }
  ]
}
```

---

## 11. Hata Senaryoları

### 11.1 LLM Hataları

| Senaryo | Hata | Davranış |
|---------|------|----------|
| API key tanımlanmamış | NonRetryableProviderError | Fallback yok, adım başarısız |
| Primary API timeout | ProviderInvokeError | Fallback'e geç |
| Yanıt geçersiz JSON | StepExecutionError | Step başarısız, job failed |
| `narration_system` boş | StepExecutionError | Step başarısız |

### 11.2 Trust Enforcement

| Senaryo | Seviye | Sonuç |
|---------|--------|-------|
| Tüm kaynaklar high/medium | any | pass=True |
| Düşük güvenilirlikli kaynak | none | pass=True, uyarı yok |
| Düşük güvenilirlikli kaynak | warn | pass=True, uyarı dön |
| Düşük güvenilirlikli kaynak | block | pass=False, 422 hata |

### 11.3 Render Hataları

| Senaryo | Davranış |
|---------|----------|
| `word_timing_path` yok | `timing_mode=cursor`, `degradation_warnings` |
| `total_duration_seconds` geçersiz | 60s fallback, `duration_fallback_used=True` |
| Remotion CLI timeout (>600s) | Step başarısız, stderr log |
| Remotion returncode != 0 | Step başarısız, stderr log |

### 11.4 Bulletin Durum Hataları

| İşlem | Gerekli Durum | Hata |
|-------|--------------|------|
| confirm_selection | draft | ValueError |
| consume_news | selection_confirmed | ValueError |
| start_production | in_progress | ValueError |
| start_production | in_progress, min 1 item | ValueError |

---

## Appendix: Dosya Referans Haritası

```
backend/app/
├── modules/
│   ├── standard_video/
│   │   ├── definition.py          # Pipeline tanımı, adım sırası
│   │   ├── schemas.py             # Pydantic şemaları
│   │   ├── service.py             # CRUD + iş mantığı
│   │   ├── router.py              # HTTP endpoints
│   │   ├── composition_map.py     # Güvenli composition mapping
│   │   └── executors/
│   │       ├── script.py          # LLM → script.json
│   │       ├── metadata.py        # LLM → metadata.json
│   │       ├── tts.py             # EdgeTTS → audio_manifest.json
│   │       ├── visuals.py         # Pexels/Pixabay → visuals_manifest.json
│   │       ├── subtitle.py        # SRT + word_timing.json
│   │       ├── composition.py     # → composition_props.json
│   │       ├── render.py          # Remotion CLI → output.mp4
│   │       └── render_still.py    # Remotion CLI → preview_frame.jpg
│   ├── news_bulletin/
│   │   ├── definition.py          # Pipeline tanımı
│   │   ├── schemas.py             # Şemalar (trust enforcement dahil)
│   │   ├── service.py             # start_production, trust check, style suggestion
│   │   ├── router.py              # HTTP endpoints
│   │   ├── editorial_gate.py      # confirm_selection, consume_news
│   │   └── executors/
│   │       ├── script.py          # LLM → bulletin_script.json
│   │       ├── metadata.py        # LLM → metadata.json
│   │       └── composition.py     # → bulletin_composition_props.json
│   └── prompt_builder.py          # LLM mesaj oluşturma
├── providers/
│   ├── registry.py                # Provider kayıt ve zincir yönetimi
│   ├── resolution.py              # resolve_and_invoke() + fallback
│   ├── llm/
│   │   ├── kie_ai_provider.py     # Primary LLM (Gemini 2.5 Flash)
│   │   ├── openai_compat_provider.py  # Fallback LLM
│   │   └── _openai_compat_base.py # Paylaşılan HTTP istemci
│   ├── tts/
│   │   ├── edge_tts_provider.py   # Microsoft EdgeTTS
│   │   ├── system_tts_provider.py # NOOP (test)
│   │   └── voice_map.py           # Dil → ses kodu eşlemesi
│   └── visuals/
│       ├── pexels_provider.py     # Primary görsel
│       └── pixabay_provider.py    # Fallback görsel
├── source_scans/
│   ├── scan_engine.py             # RSS fetch + dedupe
│   ├── dedupe_service.py          # Soft dedupe (Jaccard)
│   └── scheduler.py              # Auto-scan zamanlayıcı
├── settings/
│   └── settings_resolver.py      # Ayar öncelik zinciri + KNOWN_SETTINGS
└── db/
    └── models.py                  # SQLAlchemy ORM modelleri
```
