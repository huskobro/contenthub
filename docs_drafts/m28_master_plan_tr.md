# M28 — News Bulletin Pipeline Implementasyon Plani

## 1. Executive Summary

M28, News Bulletin modulunu ContentHub'in mevcut job engine, provider registry, settings, visibility ve publish altyapisi uzerine insa eder. YTRobot-v3'ten **akis mantigi** alinir, **altyapi alinmaz**.

Hedef: M28 sonunda bir admin, API uzerinden bulletin olusturabilmeli, haberleri secebilmeli, editorial gate'i gecebilmeli, pipeline'i tetikleyebilmeli ve combined render'a kadar job lifecycle'i izleyebilmeli.

Wizard M28 scope'unda **degildir** — M29'da gelecek.

---

## 2. M28 Scope

| Alan | Dahil |
|---|---|
| News Bulletin module definition | ✅ |
| Pipeline step'leri (script, metadata, tts, subtitle, composition, render, publish — 7 step) | ✅ |
| Alembic migration (edited_narration alani) | ✅ |
| Bulletin-specific executor'lar | ✅ |
| Dispatcher/job lifecycle entegrasyonu | ✅ |
| Prompt/settings snapshot (job baslangicinda) | ✅ |
| Settings seed (prompt key'ler + module defaults) | ✅ |
| TTS/Whisper prerequisite + degrade plani | ✅ |
| Remotion NewsBulletin composition (combined, v1) | ✅ |
| Combined render (tek video, tum haberler) | ✅ |
| Used news / dedupe entegrasyonu (editorial gate mevcut) | ✅ |
| Audit log entegrasyonu | ✅ |
| Backend testleri | ✅ |
| Composition drift testi | ✅ |

---

## 3. Scope Disi Alanlar

| Alan | Neden | Hedef Milestone |
|---|---|---|
| Bulletin Wizard UI | Backend stabil olmadan wizard test edilemez | M29 |
| Per-category render mode | Combined once stabil olmali | M29 |
| Per-item render mode | Combined + per-category sonrasi | M30 |
| Category → style auto mapping | Style blueprint entegrasyonu M29 | M29 |
| Trust level enforcement | Editorial gate + style mapping sonrasi | M30 |
| SEO/metadata post-render handoff | Publish handoff M29 | M29 |
| Frontend bulletin wizard/detail degisiklikleri | Backend-first yaklasim | M29 |
| Lower-third, ticker, live badge props | Combined v1 icin gereksiz, v2'de | M29 |

**Wizard neden scope disi:**
Wizard, bulletin pipeline'inin uzerinde calisan bir UI katmanidir. Pipeline (entity → executor → dispatcher → render) stabil olmadan wizard test edilemez. M28'de pipeline API uzerinden test edilir. M29'da wizard bu stabil pipeline'a baglanir.

---

## 4. Prerequisite / Dependency Durumu

### 4.1 edge-tts Paketi

**Durum:** venv'e kurulmamis, TTS noop stub'a (SystemTTSProvider) dusuyor.

**Normal akis (kuruluysa):**
- `EdgeTTSProvider.invoke()` → `.mp3` dosyasi uretir
- `audio_manifest.json` gercek ses sureleriyle yazilir

**Degrade akis (kurulu degilse):**
- `SystemTTSProvider` (noop stub) devreye girer
- 0 byte ses dosyasi + tahmini sure (karakter/15) ile manifest yazilir
- Pipeline DURMAZ — composition step degrade manifest ile calisir
- `provider_trace` icinde `"provider_id": "system_tts_stub"` ve `"degraded": true` kaydi duser
- Admin panelde job detail'de "TTS degrade: stub kullanildi" uyarisi gorunur

**Aksiyon:** M28 baslangicinda `pip install edge-tts` denenir. Basarisiz olursa degrade path aktif kalir ve tum testler buna gore yazilir.

### 4.2 faster-whisper Paketi

**Durum:** venv'e kurulmamis, subtitle cursor timing'e dusuyor.

**Normal akis (kuruluysa):**
- `LocalWhisperProvider.invoke()` → kelime-duzey zamanlama
- `word_timing.json` + Whisper-tabanli SRT uretilir
- `timing_mode: "whisper_word"` olarak isaretlenir

**Degrade akis (kurulu degilse):**
- `SubtitleStepExecutor` mevcut cursor-tabanli SRT uretir
- `timing_mode: "cursor"` olarak isaretlenir
- `word_timing.json` uretilmez
- Pipeline DURMAZ — composition step cursor SRT ile calisir

**Aksiyon:** Whisper bagimliligini M28'de zorunlu kilmayiz. Cursor-tabanli subtitle ilk surum icin yeterli. Whisper kurulumu ayri teknik is olarak kalir.

---

## 5. Mevcut ContentHub Karsiliklari (Reuse Edilecekler)

| Mevcut Altyapi | Dosya | M28'de Nasil Kullanilacak |
|---|---|---|
| Job Engine | `jobs/dispatcher.py`, `jobs/pipeline.py`, `jobs/service.py` | Bulletin job'lari ayni engine uzerinden calisir |
| Step Executor Base | `jobs/executor.py`, `jobs/exceptions.py` | Bulletin executor'lari `StepExecutor`'dan turetilir |
| Module Registry | `modules/registry.py`, `modules/base.py` | `NEWS_BULLETIN_MODULE` ayni pattern ile kayit edilir |
| Provider Registry | `providers/registry.py`, `providers/resolution.py` | LLM, TTS, Whisper ayni `resolve_and_invoke` ile cagrilir |
| StepExecutionContext | `modules/step_context.py` | Bulletin input normalization icin genisletilir |
| Prompt Builder | `modules/prompt_builder.py` | Bulletin-specific prompt fonksiyonlari eklenir |
| Composition Map | `modules/standard_video/composition_map.py` | `news_bulletin` → `NewsBulletin` eklenir |
| Settings Registry | `settings/settings_resolver.py`, `settings/settings_seed.py` | Bulletin prompt + config key'leri eklenir |
| Editorial Gate | `modules/news_bulletin/editorial_gate.py` | Mevcut — degisiklik yok, job tetikleme oncesi kullanilir |
| Bulletin Entity/CRUD | `modules/news_bulletin/service.py`, `router.py`, `schemas.py` | Mevcut — status gecisleri genisletilir |
| DB Models | `db/models.py` | `NewsBulletin`, `NewsBulletinScript`, `NewsBulletinSelectedItem`, `NewsBulletinMetadata` mevcut |
| Used News Registry | `used_news/service.py` | `consume_news()` mevcut editorial gate icinde |
| Audit Log | `audit/service.py` | Job create + pipeline transitions icin mevcut pattern |
| SSE EventBus | `sse/event_bus.py` | Job progress event'leri mevcut global SSE uzerinden akar |
| Publish Executor | `publish/executor.py` | Bulletin publish step'i ayni executor'u kullanir |
| Artifact Helpers | `modules/standard_video/executors/_helpers.py` | Paylasilan helper'lar news_bulletin icin de kullanilir |
| Trace Helper | `providers/trace_helper.py` | `build_provider_trace()` tum executor'larda kullanilir |

---

## 6. Domain / Entity Plani

### 6.1 Mevcut Entity'ler (Degisiklik Yok)

| Entity | Tablo | Durum |
|---|---|---|
| `NewsBulletin` | `news_bulletins` | Mevcut — topic, title, brief, duration, language, tone, style, source_mode, status, job_id |
| `NewsBulletinScript` | `news_bulletin_scripts` | Mevcut — content, version, source_type, generation_status |
| `NewsBulletinSelectedItem` | `news_bulletin_selected_items` | Mevcut — news_bulletin_id, news_item_id, sort_order, selection_reason |
| `NewsBulletinMetadata` | `news_bulletin_metadata` | Mevcut — title, description, tags, category, generation_status |
| `NewsItem` | `news_items` | Mevcut — status lifecycle (new → used) |
| `UsedNewsRegistry` | `used_news_registry` | Mevcut — tuketim kaydi |

### 6.2 Schema Degisikligi — Alembic Migration

`NewsBulletinSelectedItem` tablosuna `edited_narration` (nullable Text) alani eklenir.

**Amac:** Operator editorial gate'de bir haberin narration metnini duzenleyebilir. Bu alan duzenlenmis metni saklar.

**Veri akisi:**
1. Haber secilir → `NewsBulletinSelectedItem` olusur (`edited_narration = NULL`)
2. Operator isterse narration duzenler → `edited_narration` guncellenir
3. `BulletinScriptExecutor` calisirken: `edited_narration` varsa onu kullanir, yoksa LLM'den uretir

**Migration:**
- Alembic revision olusturulur: `alembic revision --autogenerate -m "add edited_narration to bulletin_selected_items"`
- `db/models.py`'da `NewsBulletinSelectedItem.edited_narration = Column(Text, nullable=True)` eklenir
- Fresh-DB kosusu yapilir (MEMORY.md Alembic disiplini)

### 6.3 Bulletin Status Gecis Genisletmesi

Mevcut statusler: `draft` → `selection_confirmed` → `in_progress` → `done`

M28 eklentisi — `in_progress` icindeki alt durumlar job state ile izlenir:

```
draft → selection_confirmed → in_progress → rendering → done
                                              ↓
                                           failed
```

- `draft`: Ilk olusturma, haber secimi asamasi
- `selection_confirmed`: Editorial gate gecildi (`confirm_selection()`)
- `in_progress`: Haberler tuketildi (`consume_news()`), job olusturulabilir
- `rendering`: Job dispatched, pipeline calisiyor (job.status = running)
- `done`: Pipeline completed, output hazir
- `failed`: Pipeline failed

Bulletin.status gecisleri `service.py` icinde yonetilir; job state machine `jobs/service.py`'daki mevcut validate_job_transition ile calisir.

---

## 7. Settings / Prompt Key Plani

### 7.1 Prompt Key'ler

| Key | Type | Module Scope | Aciklama | Kullanildigi Step |
|---|---|---|---|---|
| `news_bulletin.prompt.narration_system` | prompt | news_bulletin | Sistem prompt — spiker dilinde haber anlatimi icin LLM talimatlari | script |
| `news_bulletin.prompt.narration_style_rules` | prompt | news_bulletin | Stil kurallari — formal broadcast, kisa cumle, ton | script |
| `news_bulletin.prompt.anti_clickbait_rules` | prompt | news_bulletin | Anti-clickbait kurallari — yasakli kaliplar, byline yasagi | script |
| `news_bulletin.prompt.metadata_title_rules` | prompt | news_bulletin | Metadata uretim kurallari — baslik, aciklama, etiket formati | metadata |

### 7.2 Module Config Key'ler

| Key | Type | Default | Aciklama |
|---|---|---|---|
| `news_bulletin.config.default_language` | string | `"tr"` | Varsayilan bulten dili |
| `news_bulletin.config.default_tone` | string | `"formal"` | Varsayilan anlatim tonu |
| `news_bulletin.config.default_duration_seconds` | integer | `120` | Varsayilan hedef sure |
| `news_bulletin.config.max_items_per_bulletin` | integer | `10` | Tek bultendeki max haber sayisi |
| `news_bulletin.config.narration_word_limit_per_item` | integer | `80` | Haber basina max kelime |
| `news_bulletin.config.render_mode` | string | `"combined"` | Render modu (M28: sadece combined) |
| `news_bulletin.config.render_fps` | integer | `30` | Render FPS |
| `news_bulletin.config.render_format` | string | `"landscape"` | 16:9 veya 9:16 |

### 7.3 Prompt Builtin Default Degerleri

Her prompt key'in `builtin_default` degeri seed'de yer alir. Admin override etmezse bu degerler kullanilir.

**`news_bulletin.prompt.narration_system`** (builtin_default):
```
Sen profesyonel bir TV haber spikerisin. Sana verilen haber ozetlerini kisa, net, resmi ve
konusulabilir bir dilde yeniden yaz. Her haber 40-80 kelime arasinda olmali. Turkce formal
broadcast dilini kullan. Cevrilmis metin hissi verme.
```

**`news_bulletin.prompt.narration_style_rules`** (builtin_default):
```
Kurallar:
- Kisa cumleler kullan, max 15 kelime per cumle
- Aktif cumle yapisi tercih et
- Teknik jargon kullanma
- Resmi ama soguk olmayan ton
- Her haberi bagimsiz anlat, onceki habere referans verme
- Kapanisi temiz bitir, "devam edecek" gibi ifadeler kullanma
```

**`news_bulletin.prompt.anti_clickbait_rules`** (builtin_default):
```
Yasaklar:
- Clickbait basliklar kullanma
- "Inanilmaz", "sok edici", "merak edilen" gibi abartili ifadeler yasak
- Kaynak adini, muhabir adini, byline bilgisini tekrarlama
- "According to" kaliplarini kullanma
- Soru formunda baslik kullanma
```

**`news_bulletin.prompt.metadata_title_rules`** (builtin_default):
```
Bulten icin YouTube metadata uret:
- Baslik: max 60 karakter, bilgilendirici, clickbait degil
- Aciklama: 2-3 cumle, bultendeki haberlerin ozeti
- Etiketler: 5-10 adet, Turkce, hem genel hem habere ozel
- Hashtag: 3-5 adet, #haber #gundem formatinda
```

### 7.4 Prompt Yonetim Modeli (M28)

- Her prompt key settings'te `type: "prompt"`, `module_scope: "news_bulletin"` olarak seed edilir
- `builtin_default` zengin ve calisan prompt metni icerir (yukaridaki gibi)
- Admin isterse `admin_value` ile override eder — tam degistirir
- Bos birakilan prompt key executor'da guvenli sekilde atlanir (guard metni haric)
- Toggle yerine prompt icerigi yonetimi: ornegin anti-clickbait kurallarini kapatmak = o prompt'u bosaltmak
- Preset/toggle/profil sistemi M28'de YOK — M29+ icin mimari acik

**Kodda kalan zorunlu guard metni (minimum):**
- LLM cagrisinda JSON output format talimati (teknik format kisiti, prompt degil)
- Bu guard metni executor'da `# TEKNIK GUARD — admin tarafindan degistirilemez` yorumuyla isaretlenir
- Ornek: `"Yanitini SADECE JSON formatinda ver. Baska metin ekleme."`

### 7.5 Settings Seed Entegrasyonu

Tum key'ler `KNOWN_SETTINGS` sozlugune eklenir ve `seed_known_settings()` ile DB'ye otomatik yazilir.

Her prompt key icin `validation_rules_json`:
```json
{"type": "string", "required": true, "min_length": 10}
```

Her config key icin uygun validation (integer min/max, enum, vb).

---

## 8. Router / Service / Schema Plani

### 8.1 Degistirilecek Dosyalar

| Dosya | Degisiklik |
|---|---|
| `backend/app/modules/news_bulletin/router.py` | `POST /{id}/start-production` endpoint eklenir — job olusturma + dispatch tetikleme |
| `backend/app/modules/news_bulletin/service.py` | `start_production()` fonksiyonu — bulletin → job olusturma, status gecisi, snapshot alma |
| `backend/app/modules/news_bulletin/schemas.py` | `StartProductionRequest` ve `StartProductionResponse` schema'lari |

### 8.2 Yeni Endpoint: Start Production

```
POST /api/v1/modules/news-bulletin/{bulletin_id}/start-production
```

**Preconditions:**
1. Bulletin.status == "in_progress" (consume_news gecilmis olmali)
2. En az 1 selected item olmali
3. Script artifact mevcut olmali (AI veya manual)

**Akis:**
1. Effective settings + prompt snapshot al
2. Job olustur (`module_type: "news_bulletin"`, `input_data_json` icinde bulletin_id + snapshot)
3. Bulletin.job_id = job.id yaz
4. Bulletin.status = "rendering" gecisi
5. `dispatcher.dispatch(job_id)` cagir
6. Audit log yaz
7. Job response don

---

## 9. Executor ve Pipeline Step Plani

### 9.1 Yeni Dosyalar

| Dosya | Amac |
|---|---|
| `backend/app/modules/news_bulletin/definition.py` | `NEWS_BULLETIN_MODULE` — ModuleDefinition, step listesi |
| `backend/app/modules/news_bulletin/executors/__init__.py` | Executor export'lari |
| `backend/app/modules/news_bulletin/executors/script.py` | `BulletinScriptExecutor` — selected items → broadcast narration |
| `backend/app/modules/news_bulletin/executors/metadata.py` | `BulletinMetadataExecutor` — script → baslik/aciklama/etiket |
| `backend/app/modules/news_bulletin/executors/_helpers.py` | Paylasilan yardimci fonksiyonlar (artifact IO) |

### 9.2 Module Definition

```python
NEWS_BULLETIN_MODULE = ModuleDefinition(
    module_id="news_bulletin",
    display_name="Haber Bulteni",
    steps=[
        StepDefinition(step_key="script",      step_order=1, idempotency_type="re_executable",  executor_class=BulletinScriptExecutor),
        StepDefinition(step_key="metadata",     step_order=2, idempotency_type="re_executable",  executor_class=BulletinMetadataExecutor),
        StepDefinition(step_key="tts",          step_order=3, idempotency_type="artifact_check", executor_class=TTSStepExecutor),
        StepDefinition(step_key="subtitle",     step_order=4, idempotency_type="re_executable",  executor_class=SubtitleStepExecutor),
        StepDefinition(step_key="composition",  step_order=5, idempotency_type="artifact_check", executor_class=BulletinCompositionExecutor),
        StepDefinition(step_key="render",       step_order=6, idempotency_type="artifact_check", executor_class=RenderStepExecutor),
        StepDefinition(step_key="publish",      step_order=7, idempotency_type="operator_confirm", executor_class=PublishStepExecutor),
    ],
    input_schema={...},  # bulletin_id required
    gate_defaults={"script_review": False, "metadata_review": False},
    template_compat=["news_bulletin_v1"],
)
```

### 9.3 Step Detaylari

**Step 1: script (BulletinScriptExecutor)**
- Input: `bulletin_id` → DB'den selected items + narration metinleri cekilir
- Prompt: `news_bulletin.prompt.narration_system` + `narration_style_rules` + `anti_clickbait_rules` settings'ten okunur (snapshot)
- LLM cagrisi: `resolve_and_invoke(registry, ProviderCapability.LLM, {messages})`
- Output: `bulletin_script.json` — her haber icin spiker narration'i, gec, toplam sure
- **Onemli:** Eger selected item'larin narration alani editorial gate'de zaten duzenlenmisse, LLM'e "duzenlenmis metinleri koru, sadece birlestir ve gecis cumlelerini ekle" talimati verilir

**Step 2: metadata (BulletinMetadataExecutor)**
- Input: `bulletin_script.json` artifact
- Prompt: `news_bulletin.prompt.metadata_title_rules` settings'ten okunur (snapshot)
- LLM cagrisi: baslik, aciklama, etiketler
- Output: `metadata.json` — NewsBulletinMetadata tablosuna da yazilir

**Step 3: tts (TTSStepExecutor — reuse)**
- Mevcut standard_video `TTSStepExecutor` AYNI executor kullanilir
- `StepExecutionContext.module_id = "news_bulletin"` ile calisir
- Script artifact'tan narration metinlerini okur, sahne bazinda ses uretir
- Degrade: edge-tts yoksa SystemTTSProvider devreye girer

**Step 4: subtitle (SubtitleStepExecutor — reuse)**
- Mevcut standard_video `SubtitleStepExecutor` AYNI executor kullanilir
- Audio manifest'ten SRT uretir
- Degrade: Whisper yoksa cursor-tabanli timing

**Step 5: composition (BulletinCompositionExecutor — YENI)**
- **Sadece `composition_props.json` uretir — Remotion'i cagirmaz, render tetiklemez**
- `get_composition_id("news_bulletin")` → `"NewsBulletin"` (composition_map'e eklenmis)
- Tum artifact'lari toplar: bulletin_script.json, audio_manifest.json, subtitle_metadata.json, metadata.json
- Bulletin-specific props: items listesi, bulletinTitle, totalDurationSeconds, language
- Output: `composition_props.json` (`render_status: "props_ready"`)

**Step 6: render (RenderStepExecutor — reuse)**
- Mevcut `RenderStepExecutor` kullanilir
- `composition_props.json` okur → Remotion CLI cagirir → `video.mp4` uretir
- `module_id` bazli composition_id cozumleme destegi eklenir (kucuk degisiklik)
- Degrade: Remotion CLI kurulu degilse veya Node yoksa hata ile basarisiz — pipeline durur
- Output: `artifacts/video.mp4`

**Step 7: publish (PublishStepExecutor — reuse)**
- Mevcut publish executor — `operator_confirm` semantigi

### 9.4 Executor Dependency Injection

`JobDispatcher._build_executor_from_registry()` mevcut patterni takip eder:
- `BulletinScriptExecutor(registry=provider_registry)` — LLM icin
- `BulletinMetadataExecutor(registry=provider_registry)` — LLM icin
- `TTSStepExecutor(registry=provider_registry)` — reuse
- `SubtitleStepExecutor(registry=provider_registry)` — reuse
- `BulletinCompositionExecutor()` — provider gerekmiyor
- `RenderStepExecutor()` — reuse, Remotion CLI cagirir
- `PublishStepExecutor(pipeline_db=db)` — reuse

---

## 10. Dispatcher / Job Lifecycle Entegrasyonu

### 10.1 Degistirilecek Dosyalar

| Dosya | Degisiklik |
|---|---|
| `backend/app/main.py` | `module_registry.register(NEWS_BULLETIN_MODULE)` lifespan'e eklenir |
| `backend/app/settings/settings_resolver.py` | Bulletin KNOWN_SETTINGS + KNOWN_VALIDATION_RULES eklenir |
| `backend/app/settings/settings_seed.py` | Varsa validation rules seed entegrasyonu (mevcut pattern) |

### 10.2 Dispatch Akisi

```
1. Admin: POST /modules/news-bulletin/{id}/start-production
2. service.start_production():
   a. Bulletin status kontrolu (in_progress olmali)
   b. Effective settings + prompt snapshot al
   c. jobs/service.create_job(module_type="news_bulletin", input_data_json={bulletin_id, snapshot})
   d. jobs/step_initializer.initialize_job_steps(job_id, "news_bulletin", module_registry)
   e. dispatcher.dispatch(job_id)
   f. Bulletin.job_id = job.id, Bulletin.status = "rendering"
   g. Audit log: "bulletin.production.started"
3. Dispatcher:
   a. module_registry.get("news_bulletin") → NEWS_BULLETIN_MODULE
   b. Step definitions → executor instances
   c. PipelineRunner.run(job_id) → background task
4. Pipeline:
   a. script → metadata → tts → subtitle → composition → render → publish
   b. Her step gecisinde SSE event (mevcut EventBus)
   c. Basari: job.status = completed, bulletin.status = done
   d. Hata: job.status = failed, bulletin.status = failed
```

### 10.3 Job Tamamlanma Callback

Pipeline tamamlandiginda bulletin.status gecisi gerekiyor. Bunun icin iki secenek:

**Secenek A (tercih edilen):** `start_production()` icinde dispatch sonrasi async task ile job'u dinle
**Secenek B:** Pipeline runner'a completion callback ekle

M28 icin Secenek A yeterli: `start_production()` dispatch ettikten sonra, `service.py` icinde `_watch_bulletin_job()` async task'i olusturulur. Bu task job tamamlandiginda bulletin.status'u gunceller.

---

## 11. Remotion Composition Plani

### 11.1 Degistirilecek Dosyalar

| Dosya | Degisiklik |
|---|---|
| `backend/app/modules/standard_video/composition_map.py` | `COMPOSITION_MAP["news_bulletin"] = "NewsBulletin"` eklenir |
| `renderer/src/Root.tsx` | `NewsBulletinComposition` import + Composition kaydi |

### 11.2 Yeni Dosyalar

| Dosya | Amac |
|---|---|
| `renderer/src/compositions/NewsBulletinComposition.tsx` | Bulletin combined render composition |
| `backend/app/modules/news_bulletin/executors/composition.py` | `BulletinCompositionExecutor` — bulletin-specific props builder |

### 11.3 NewsBulletinComposition Props (v1 — Combined Minimal)

```typescript
interface NewsBulletinProps {
  bulletinTitle: string;
  items: Array<{
    itemNumber: number;
    headline: string;
    narration: string;
    audioPath: string | null;
    imagePath: string | null;
    durationSeconds: number;
    category?: string;
  }>;
  subtitlesSrt: string | null;
  wordTimings: Array<WordTiming>;
  timingMode: "cursor" | "whisper_word" | "whisper_segment";
  subtitleStyle: SubtitleStyle;
  totalDurationSeconds: number;
  language: string;
  metadata: {
    title: string;
    description: string;
    tags: string[];
  };
}
```

### 11.4 Composition v1 Davranisi

- Combined mode: tum haberler tek video icinde siralama ile render edilir
- Her haber arasinda kisa gecis (fade veya cut — v1'de basit cut)
- Haber basligi ekranda gosterilir (headline overlay)
- Narration ses olarak calar, altyazi senkron gosterilir
- Gorseller arka planda gosterilir (visuals step output)
- v1'de lower-third, ticker, live badge YOK — M29'da eklenir

### 11.5 Composition Map Senkron Kurali

`composition_map.py` ve `Root.tsx` arasindaki senkron DEGISMEZ kurali korunur:
- `COMPOSITION_MAP["news_bulletin"] = "NewsBulletin"` eklendigi anda
- `Root.tsx`'te `<Composition id="NewsBulletin" ... />` da eklenmeli
- Drift testi her iki dosyayi kontrol eder

---

## 12. Combined Render Plani

### 12.1 Combined Render Akisi

```
1. BulletinScriptExecutor → bulletin_script.json
   - Her selected item icin narration uretildi
   - Items siralama (sort_order) korundu

2. BulletinMetadataExecutor → metadata.json
   - Baslik, aciklama, etiketler

3. TTSStepExecutor → audio_manifest.json
   - Her item narration icin ayri ses dosyasi
   - Toplam sure hesaplandi

4. SubtitleStepExecutor → subtitles.srt + subtitle_metadata.json
   - Tum narration icin SRT

5. BulletinCompositionExecutor → composition_props.json
   - Tum artifact'lar birlesti
   - NewsBulletin composition_id atandi
   - Props: items[], subtitle, total_duration

6. [Remotion render — render step mevcut altyapi ile]
   - composition_props.json → Remotion CLI → video.mp4

7. PublishStepExecutor → operator_confirm
```

### 12.2 Combined Render Minimum Kabul Kriterleri

- [x] 1+ haber iceren bulletin icin pipeline hatasiz tamamlaniyor
- [x] `bulletin_script.json` her selected item icin narration iceriyor
- [x] `metadata.json` baslik + aciklama + etiketler iceriyor
- [x] `audio_manifest.json` her item icin ses referansi iceriyor (gercek veya stub)
- [x] `subtitles.srt` tum narration'lar icin zamanlama iceriyor
- [x] `composition_props.json` dogru composition_id (`NewsBulletin`) iceriyor
- [x] Job status `completed` olarak bitiyor
- [x] Bulletin status `done` olarak guncelleniyor
- [x] Provider trace her step icin kayit ediliyor
- [x] SSE event'leri step gecislerinde gonderiliyor

---

## 13. Used News / Dedupe Entegrasyonu

**Mevcut altyapi yeterli — yeni kod yazilmayacak.**

Akis:
1. Operaror bulletin olusturur (draft)
2. `get_selectable_news_items()` → status="new" olan haberler listelenir
3. Operaror haberleri secer → `NewsBulletinSelectedItem` kayitlari
4. `confirm_selection()` → bulletin status = selection_confirmed, uyari: zaten kullanilmis haberler gosterilir
5. `consume_news()` → `UsedNewsRegistry` kayitlari yazilir, `NewsItem.status = "used"`
6. `start_production()` → job olusturulur, pipeline baslar

Bu zincir tamamen mevcut `editorial_gate.py` icinde implement edilmis durumda. M28'de degisiklik yok.

---

## 14. TTS / Whisper Normal Akis ve Degrade Akisi

### 14.1 TTS

| Durum | Davranis |
|---|---|
| edge-tts kurulu | EdgeTTSProvider → gercek .mp3 + gercek sure |
| edge-tts kurulu degil | SystemTTSProvider (noop) → 0-byte dosya + tahmini sure (char/15) |

Degrade durumunda:
- Pipeline durmaz
- `audio_manifest.json` tahmini surelerle yazilir
- Composition step degrade manifest ile calisir
- `provider_trace.degraded = true` kaydedilir
- Admin job detail'de gorulur

### 14.2 Whisper

| Durum | Davranis |
|---|---|
| faster-whisper kurulu | LocalWhisperProvider → word-level timing + whisper SRT |
| faster-whisper kurulu degil | Cursor-tabanli SRT → `timing_mode: "cursor"` |

Degrade durumunda:
- Pipeline durmaz
- `subtitles.srt` cursor zamanlama ile uretilir
- `word_timing.json` uretilmez
- Karaoke subtitle calisMAZ (cursor modda basit overlay)
- Admin job detail'de `timing_mode: cursor` gorulur

---

## 15. Audit / Visibility / Settings Snapshot Plani

### 15.1 Audit Log

| Event | Katman | Mevcut/Yeni |
|---|---|---|
| bulletin.created | router | Mevcut |
| bulletin.selection_confirmed | editorial_gate | Yeni — `confirm_selection()` icine eklenir |
| bulletin.news_consumed | editorial_gate | Yeni — `consume_news()` icine eklenir |
| bulletin.production.started | service | Yeni — `start_production()` icinde |
| bulletin.production.completed | service | Yeni — job completion callback |
| bulletin.production.failed | service | Yeni — job failure callback |
| job.created | jobs/router | Mevcut |
| job.step.* | jobs/pipeline | Mevcut (6 transition audit) |

### 15.2 Visibility

Bulletin router zaten `require_visible("panel:news-bulletin")` kullaniyor. Degisiklik yok.

### 15.3 Effective Settings + Prompt Snapshot

**Snapshot alinacak katman:** `service.start_production()` icinde, job olusturulmadan HEMEN ONCE.

**Snapshot icerigi:**
```python
snapshot = {
    "_settings_snapshot": {
        "news_bulletin.prompt.narration_system": effective_value,
        "news_bulletin.prompt.narration_style_rules": effective_value,
        "news_bulletin.prompt.anti_clickbait_rules": effective_value,
        "news_bulletin.prompt.metadata_title_rules": effective_value,
        "news_bulletin.config.default_language": effective_value,
        "news_bulletin.config.default_tone": effective_value,
        "news_bulletin.config.default_duration_seconds": effective_value,
        "news_bulletin.config.narration_word_limit_per_item": effective_value,
        "news_bulletin.config.render_fps": effective_value,
        "news_bulletin.config.render_format": effective_value,
    },
    "_template_snapshot": {...},  # Mevcut M27 pattern
}
```

**Saklama yeri:** `job.input_data_json` icinde, mevcut `_template_snapshot` pattern'inin yanina `_settings_snapshot` olarak eklenir.

**Executor'larda kullanim:** Executor'lar `job.input_data_json._settings_snapshot` uzerinden prompt/config degerlerine erisir. Canli settings'e DOKUNMAZ.

---

## 16. Test Plani

### 16.1 Unit Testler

| Test Dosyasi | Kapsam |
|---|---|
| `tests/modules/news_bulletin/test_definition.py` | Module definition dogru step sayisi, sirasi, executor class |
| `tests/modules/news_bulletin/test_script_executor.py` | Script executor: input parse, prompt build, artifact write, degrade |
| `tests/modules/news_bulletin/test_metadata_executor.py` | Metadata executor: script input, LLM cagri, artifact write |
| `tests/modules/news_bulletin/test_composition_executor.py` | Composition executor: artifact toplama, props build, composition_id mapping |
| `tests/modules/news_bulletin/test_start_production.py` | Service: precondition check, snapshot alma, job olusturma, status gecisi |
| `tests/settings/test_bulletin_settings_seed.py` | Prompt + config key'lerin seed edilmesi |

### 16.2 Integration Testler

| Test Dosyasi | Kapsam |
|---|---|
| `tests/modules/news_bulletin/test_pipeline_integration.py` | Tam pipeline: script → metadata → tts → subtitle → composition |
| `tests/modules/news_bulletin/test_dispatch_integration.py` | Dispatcher → module registry → pipeline runner entegrasyonu |
| `tests/modules/news_bulletin/test_editorial_to_production.py` | Editorial gate → consume → start_production → job created |

### 16.3 API Testler

| Test Dosyasi | Kapsam |
|---|---|
| `tests/modules/news_bulletin/test_router_start_production.py` | POST start-production endpoint: 200, 400 (precondition fail), 404 |
| `tests/modules/news_bulletin/test_router_audit.py` | Audit log kayitlarinin dogru dusumu |

### 16.4 Composition Drift Testi

| Test Dosyasi | Kapsam |
|---|---|
| `tests/renderer/test_composition_map_sync.py` | `composition_map.py` COMPOSITION_MAP ile `Root.tsx` Composition id'leri eslesme kontrolu |

### 16.5 Smoke Testler

| Test | Kapsam |
|---|---|
| Pipeline smoke | 3 haberli bulletin → pipeline hatasiz tamamlaniyor |
| Degrade smoke | edge-tts + whisper YOK → pipeline yine tamamlaniyor (stub + cursor) |
| Snapshot smoke | Settings degistirildikten SONRA koshan job ESKi snapshot degerlerini kullaniyor |

---

## 17. Tam Dosya Listesi

### 17.1 Yeni Dosyalar

| # | Dosya | Amac |
|---|---|---|
| 1 | `backend/app/modules/news_bulletin/definition.py` | NEWS_BULLETIN_MODULE tanimlamasi |
| 2 | `backend/app/modules/news_bulletin/executors/__init__.py` | Executor export'lari |
| 3 | `backend/app/modules/news_bulletin/executors/script.py` | BulletinScriptExecutor |
| 4 | `backend/app/modules/news_bulletin/executors/metadata.py` | BulletinMetadataExecutor |
| 5 | `backend/app/modules/news_bulletin/executors/composition.py` | BulletinCompositionExecutor |
| 6 | `backend/app/modules/news_bulletin/executors/_helpers.py` | Paylasilan artifact IO helpers |
| 7 | `renderer/src/compositions/NewsBulletinComposition.tsx` | Remotion bulletin composition |
| 8 | `tests/modules/news_bulletin/test_definition.py` | Module definition testleri |
| 9 | `tests/modules/news_bulletin/test_script_executor.py` | Script executor testleri |
| 10 | `tests/modules/news_bulletin/test_metadata_executor.py` | Metadata executor testleri |
| 11 | `tests/modules/news_bulletin/test_composition_executor.py` | Composition executor testleri |
| 12 | `tests/modules/news_bulletin/test_start_production.py` | Service start_production testleri |
| 13 | `tests/modules/news_bulletin/test_pipeline_integration.py` | Pipeline integration testleri |
| 14 | `tests/modules/news_bulletin/test_dispatch_integration.py` | Dispatch integration testleri |
| 15 | `tests/modules/news_bulletin/test_router_start_production.py` | API endpoint testleri |
| 16 | `tests/modules/news_bulletin/test_render_step.py` | Render step bulletin entegrasyonu testleri |
| 17 | `tests/settings/test_bulletin_settings_seed.py` | Bulletin prompt + config seed testleri |
| 18 | `backend/alembic/versions/xxxx_add_edited_narration.py` | Alembic migration — edited_narration alani |

### 17.2 Degistirilecek Dosyalar

| # | Dosya | Degisiklik |
|---|---|---|
| 1 | `backend/app/main.py` | `module_registry.register(NEWS_BULLETIN_MODULE)` eklenir |
| 2 | `backend/app/settings/settings_resolver.py` | Bulletin KNOWN_SETTINGS + KNOWN_VALIDATION_RULES eklenir |
| 3 | `backend/app/modules/standard_video/composition_map.py` | `COMPOSITION_MAP["news_bulletin"] = "NewsBulletin"` eklenir |
| 4 | `backend/app/modules/news_bulletin/router.py` | `POST /{id}/start-production` endpoint eklenir |
| 5 | `backend/app/modules/news_bulletin/service.py` | `start_production()` + `_watch_bulletin_job()` eklenir |
| 6 | `backend/app/modules/news_bulletin/schemas.py` | `StartProductionRequest/Response` eklenir |
| 7 | `backend/app/modules/news_bulletin/editorial_gate.py` | Audit log eklentisi (2 nokta) |
| 8 | `backend/app/modules/prompt_builder.py` | `build_bulletin_script_prompt()` + `build_bulletin_metadata_prompt()` eklenir |
| 9 | `backend/app/modules/step_context.py` | `module_id="news_bulletin"` desteği — bulletin_id input parse |
| 10 | `renderer/src/Root.tsx` | NewsBulletinComposition import + Composition kaydi |
| 11 | `backend/app/db/models.py` | `NewsBulletinSelectedItem.edited_narration = Column(Text, nullable=True)` eklenir |

---

## 18. Riskler

| Risk | Etki | Azaltma |
|---|---|---|
| edge-tts paket kurulumu basarisiz | TTS degrade moda duser, ses kalitesi yok | Degrade path tam test edilir, pipeline durmaz |
| LLM narration kalitesi dusuk | Bulletin script icerik sorunu | Prompt key'ler admin panelden ayarlanabilir, iterasyon hizli |
| Remotion composition regression | Standard video render bozulabilir | Composition drift testi, ayri composition ID |
| Settings snapshot boyutu | input_data_json buyuyebilir | Sadece relevant key'ler snapshot'lanir, tum settings degil |
| Bulletin status / job status senkron kaybi | Bulletin done ama job failed, veya tersi | `_watch_bulletin_job()` + timeout guard |
| Pipeline step hatasi bulletin'i stuck birakir | Bulletin "rendering" kalir | Job failure callback bulletin.status = failed yapar |

---

## 19. Done Criteria

M28 tamamlanmis sayilmasi icin:

### Kod Kalitesi
- [ ] TypeScript: 0 hata (tsc --noEmit)
- [ ] Backend lint: 0 hata
- [ ] Tum yeni dosyalar CLAUDE.md kurallarina uygun

### Pipeline
- [ ] NEWS_BULLETIN_MODULE tanimli ve module_registry'ye kayitli
- [ ] 7 step (script, metadata, tts, subtitle, composition, render, publish) tanimli
- [ ] BulletinScriptExecutor settings snapshot'tan prompt okuyor
- [ ] BulletinMetadataExecutor settings snapshot'tan prompt okuyor
- [ ] TTSStepExecutor bulletin icin calisiyor (reuse)
- [ ] SubtitleStepExecutor bulletin icin calisiyor (reuse)
- [ ] BulletinCompositionExecutor dogru composition_id uretiyor (sadece props, render cagirmaz)
- [ ] RenderStepExecutor composition_props.json → Remotion CLI → video.mp4 uretiyor
- [ ] Pipeline hatasiz tamamlaniyor (en az 1 haber iceren bulletin)

### Migration
- [ ] Alembic migration olusturuldu (edited_narration)
- [ ] Fresh-DB kosusu basarili
- [ ] `NewsBulletinSelectedItem.edited_narration` modelde mevcut

### Degrade
- [ ] edge-tts yokken pipeline tamamlaniyor (stub TTS)
- [ ] faster-whisper yokken pipeline tamamlaniyor (cursor subtitle)
- [ ] Degrade durumu provider_trace'de kayitli

### Entegrasyon
- [ ] `start-production` API endpoint calisiyor
- [ ] Dispatcher bulletin job'unu dogru dispatch ediyor
- [ ] Bulletin status gecisleri dogru: in_progress → rendering → done/failed
- [ ] Audit log: production.started, production.completed/failed dusUyor
- [ ] Settings + prompt snapshot job.input_data_json icinde sakli
- [ ] Snapshot degerleri runtime config degisikliginden bagimsiz

### Remotion
- [ ] `NewsBulletinComposition.tsx` mevcut ve calisiyor
- [ ] `COMPOSITION_MAP["news_bulletin"] = "NewsBulletin"` kayitli
- [ ] `Root.tsx`'te Composition id="NewsBulletin" kayitli
- [ ] Composition drift testi geciyor

### Test
- [ ] Tum unit testler geciyor
- [ ] Pipeline integration testi geciyor
- [ ] API endpoint testleri geciyor
- [ ] Composition drift testi geciyor
- [ ] Degrade smoke testi geciyor
- [ ] Snapshot isolation testi geciyor

### Mevcut Sistem
- [ ] Standard video pipeline BOZULMADI
- [ ] Mevcut testler BOZULMADI
- [ ] Mevcut editorial gate BOZULMADI
- [ ] Mevcut used news registry BOZULMADI

---

## 20. M29'a Devredilecek Isler

| # | Is | Aciklama |
|---|---|---|
| 1 | Bulletin Wizard UI | 3 adimli wizard: source → draft → render |
| 2 | Editorial Gate UI Genisletmesi | Review state machine: draft → reviewed → approved → ready |
| 3 | Category → Style Auto Mapping | Style blueprint resolver'a entegre |
| 4 | Per-category Render Mode | Kategori bazinda ayri video output |
| 5 | Lower-third / Ticker / Live Badge Props | Composition props genisletmesi |
| 6 | Preview Entegrasyonu | Bulletin icin preview-first bilesenler |
| 7 | Publish Handoff | Publish center → bulletin linkage |
| 8 | Frontend Detail Page Genisletmesi | Job detail'de bulletin-specific bilgiler |
| 9 | Narration Edit UI | Selected item bazinda inline narration duzenleme |
| 10 | Render Format Secimi | 16:9 / 9:16 switch |
| 11 | Composition/Thumbnail Direction Wiring | Wizard kartlari frontend-only, backend'e baglanmali |
| 12 | YTRobot v3 Remotion Taslaklari | Haber bulteni composition/stil kurallarinin Style Blueprint entegrasyonu |

---

## 21. Bilinen Limitasyonlar ve Devir Notlari

### 21.1 `_watch_bulletin_job()` Polling Mekanizmasi
Bulletin status guncelleme (rendering → done/failed) simdilik polling ile yapiliyor. Uzun vadede job engine'e callback/event hook eklenmeli. M28 scope'unda yeterli, ama M29+ icin refactor adayi.

### 21.2 `edited_narration` UI Akisi Yarim
Backend alani hazir, executor "AYNEN KORU" instruction'ini destekliyor, ama UI'da henuz inline duzenleme yapilabilir bir alan yok. Backend kontrati tamamdir, M29 wizard'da UI tamamlanacak.

### 21.3 `test_m7_c1_migration_fresh_db.py` Pre-Existing Hata
Bu test system `python3` kullanarak fresh-DB migration kosusu yapiyor. M28 oncesinden gelen bir sorun — M28 degisikliklerinden kaynaklanmiyor. Venv `python3` PATH'e eklenmesi veya test icinde venv activation gerekiyor. M28 scope disinda, ayri fix gerekli.

### 21.4 Composition/Thumbnail Direction Kartlari (Kozmetik)
`CompositionDirectionPreview` ve `ThumbnailDirectionPreview` kartlari wizard'da gorunuyor ama secim backend'e ulasmaz — schema, DB kolonu ve render pipeline entegrasyonu yok. M29+ Style Blueprint calismasinda entegre edilecek.

### 21.5 YTRobot v3 Remotion Entegrasyonu (Gelecek Plan)
YTRobot v3'un haber bulteni icin sahip oldugu Remotion composition taslaklari ve stil kurallari, ContentHub Style Blueprint + Template sistemiyle uyumlu hale getirilerek entegre edilebilir. Kod kopyalanmayacak (CLAUDE.md C-01), tasarim pattern'leri referans alinarak yeniden yazilacak. Hedef milestone: M29-M30 (Style Blueprint + AI-assisted style variants).
