# 06 — Core Domain Model

Bu dosya ContentHub'ın veri modelini, ana entity'leri ve aralarındaki ilişkiyi açıklar. Backend kod detayı değil; kavramsal model.

Kaynak: `backend/app/` + live Job Detail gezisi + router + state machines.

---

## Entity grafı — bir bakışta

```
User
 ├── ChannelProfile (1:N)
 │    └── PlatformConnection (1:N — şu an sadece YouTube)
 ├── ContentProject (1:N)
 │    └── Job (1:N)
 │         ├── JobStep (1:N)
 │         ├── Artifact (1:N)
 │         ├── ProviderCall (1:N)
 │         └── JobLog (1:N)
 └── PublishRecord (1:N)
      └── ReviewDecision (1:N)

Template ← Job (snapshot lock)
StyleBlueprint ← Job (snapshot lock)
Settings Snapshot ← Job (snapshot lock)

Source
 ├── SourceScan (1:N)
 │    └── NewsItem (1:N)
 └── UsedNews (ledger)
```

---

## User

**Kim?** Sistemin bir aktörü.

**Alanlar:**
- `id`
- `username`
- `role` — `admin` veya `user`
- `status` — `active` / `disabled`
- `created_at`
- `default_mode` — `guided` / `advanced`
- `surface_override` (opsiyonel) — kullanıcı kendi surface seçimi
- `setting_overrides` — user-override edilen setting'ler (JSON)

**İlişkiler:**
- Bir kullanıcının birden fazla ChannelProfile'ı olabilir
- Bir kullanıcı birden fazla ContentProject başlatabilir

**Rol ve yetki:**
- `admin` — her iki panele de erişir, Settings/Visibility/Audit yönetir
- `user` — sadece user panele erişir, kendi projelerini görür

---

## ChannelProfile

**Nedir?** Kullanıcının sahip olduğu bir yayın kanalı profili. Brand identity + platform bağlantılarının container'ı.

**Alanlar:**
- `id`
- `user_id` (owner)
- `brand_name`
- `channel_slug`
- `default_language` (ör. `tr`, `en`, `de`)
- `logo_url`, `banner_url`, `brand_color`
- `created_at`

**İlişkiler:**
- Bir ChannelProfile'ın birden fazla PlatformConnection'ı olabilir (platform başına bir)
- Her ContentProject bir ChannelProfile'a bağlı olabilir

**Not:** Bir kullanıcı birden fazla kanala sahip olabilir. Bir kanal sadece tek bir user'a aittir.

---

## PlatformConnection

**Nedir?** Bir ChannelProfile'ı dış bir platforma bağlayan OAuth connection.

**Alanlar:**
- `id`
- `channel_profile_id`
- `platform` — şu an sadece `youtube`
- `external_id` — YouTube channel ID
- `oauth_token` (encrypted)
- `oauth_refresh_token` (encrypted)
- `status` — `connected` / `expired` / `revoked`
- `last_verified_at`

**Not:** ContentHub v1'de sadece YouTube desteklenir. Adapter mimarisi ileride Instagram / TikTok / X eklenmesine açık.

---

## ContentProject

**Nedir?** Kullanıcının başlattığı bir içerik üretim projesi. Bir modüle bağlıdır.

**Alanlar:**
- `id`
- `user_id`
- `module_type` — `standard_video` veya `news_bulletin`
- `channel_profile_id` — hedef kanal
- `title`
- `brief` — topic veya prompt
- `status` — `draft` / `in_production` / `ready_for_publish` / `published` / `archived`
- `priority` — `low` / `normal` / `high`
- `template_id` (opsiyonel)
- `style_blueprint_id` (opsiyonel)
- `cover_asset_id` (opsiyonel)
- `created_at`, `updated_at`

**İlişkiler:**
- Bir proje birden fazla Job'a sahip olabilir (retry, rerun, clone)
- Bir proje birden fazla PublishRecord'a sahip olabilir (aynı içerik farklı kanallara yayınlanabilir)

---

## Job

**Nedir?** Bir projenin pipeline'ını çalıştıran iş. Deterministik adımlar + state machine + artifact'lar.

**Alanlar:**
- `id` — UUID
- `content_project_id`
- `module_type`
- `status` — `queued` / `running` / `completed` / `failed` / `cancelled`
- `current_step` — ör. `render`, `composition`, `script`
- `queued_at`, `started_at`, `completed_at`
- `elapsed_total_seconds`
- `eta_seconds` (opsiyonel — historical average)
- `retry_count`
- `template_snapshot` (JSON — snapshot-lock)
- `blueprint_snapshot` (JSON — snapshot-lock)
- `settings_snapshot` (JSON — snapshot-lock)
- `workspace_path` — `backend/workspace/users/<username>/jobs/<job-id>/`
- `error_message` (opsiyonel)

### Job state machine

```
queued → running → completed
             ↓
           failed → (retry) → running
             ↓
         cancelled
```

- `queued`: queue'da sırada
- `running`: bir worker tarafından yürütülüyor
- `completed`: tüm adımlar başarılı
- `failed`: bir adım başarısız oldu; retry seçeneği açık
- `cancelled`: kullanıcı/admin iptal etti

### Pipeline step'leri (standard pipeline)

1. **script** — LLM ile script üretimi
2. **metadata** — başlık, açıklama, etiket üretimi
3. **tts** — text-to-speech audio üretimi
4. **subtitle** — SRT altyazı üretimi (speech recognition + script align)
5. **composition** — Remotion composition planning
6. **render** — Remotion ile final video render
7. **thumbnail** — thumbnail üretimi (genellikle render'dan sonra veya paralel)
8. **publish** — PublishRecord oluşturma (asıl yayın PublishRecord akışıyla olur)

### Snapshot-lock kuralı

Bir job başlatıldığında ilgili tüm template, style blueprint, ve effective settings değerleri JSON olarak job'a embed edilir. Sonradan template değiştirse, setting değişse, blueprint yeni versiyona güncellense bile **çalışan job kendi snapshot'ıyla devam eder**.

Bu CLAUDE.md'nin non-negotiable kuralıdır — runtime config değişikliği çalışan job'ı etkilemez.

---

## JobStep

**Nedir?** Job'ın içindeki tek deterministik adım.

**Alanlar:**
- `id`
- `job_id`
- `step_name` — `script` / `metadata` / `tts` / `subtitle` / `composition` / `render` / `thumbnail` / `publish`
- `status` — `queued` / `running` / `completed` / `failed` / `skipped`
- `started_at`, `completed_at`
- `elapsed_seconds`
- `eta_seconds`
- `logs_ref`
- `artifacts_ref`
- `provider_trace_ref` (opsiyonel)
- `error_message`

### Step state machine

```
queued → running → completed
             ↓
           failed
             ↓
          skipped (örn. publish step skipped by design)
```

### Live job detail'den örnek

- `script` — completed — 26sn
- `metadata` — completed — 15sn
- `tts` — completed — 7sn
- `subtitle` — completed — 5sn
- `composition` — completed — 0sn
- `render` — completed — 1dk 45sn
- `publish` — skipped (review gate henüz geçilmedi)

---

## Artifact

**Nedir?** Job'ın ürettiği dosya veya veri.

**Tipler:**
- `script.json`, `script_enhanced.json`
- `metadata.json`
- `audio.mp3`, `audio.wav`
- `subtitles.srt`, `subtitles.ass`
- `composition.json`
- `final.mp4`
- `thumbnail.jpg`
- `preview.mp4`, `preview.gif`

**Alanlar:**
- `id`
- `job_id`
- `step_name`
- `artifact_type`
- `file_path` (relative to workspace)
- `mime_type`
- `size_bytes`
- `created_at`

**Workspace ayrımı:**
- **final artifacts** — durable, publish akışında kullanılır
- **preview artifacts** — kullanıcıya visual choice için gösterilir
- **temporary processing files** — regenerate edilebilir

---

## ProviderCall (Provider Trace)

**Nedir?** Job içinde yapılan her LLM / TTS / image / speech çağrısının kaydı.

**Alanlar:**
- `id`
- `job_id`
- `step_name`
- `provider_id` — ör. `kie_ai_gemini_flash`
- `model` — ör. `gemini-2.5-flash-openai`
- `input_tokens`, `output_tokens`
- `latency_ms`
- `cost_estimate_usd`
- `status` — `success` / `failed` / `timeout`
- `request_payload_ref`
- `response_payload_ref`
- `error` (opsiyonel)

**Live örnek:** Provider Trace kartında şöyle görünür:
- `kie_ai_gemini_flash + gemini-2.5-flash-openai, 1072 input tokens, 478 output tokens, 26567ms latency, $0.00045498`

---

## Template

**Nedir?** İçerik üretim şablonu. Başlık/açıklama/tag formülasyonu + pipeline parametreleri.

**Tipler:**
- **Style Template** — görsel tekrarlanabilir kurgular
- **Content Template** — başlık/açıklama/tag paternleri
- **Publish Template** — yayın metadata formülasyonu

**Alanlar:**
- `id`, `name`, `module_type`, `family`, `version`, `owner` (system/admin/user), `status`

**Versiyonlama:** Her template versiyonlanır. Job'a bind edildiğinde snapshot alınır.

---

## StyleBlueprint

**Nedir?** Görsel stil kuralları — renk, motion, layout, subtitle stil, disallowed elements.

**Alanlar:**
- `id`, `name`, `version`, `status`
- `rules` — JSON (color palette, motion style, layout direction, subtitle style, thumbnail direction, disallowed elements)
- `preview_strategy` — style cards / mock frames / subtitle samples / lower-thirds

**Preview-first kural:** Blueprint önizleme için belirli preview artifact üretme stratejisi tanımlar.

---

## PublishRecord

**Nedir?** Bir içeriğin bir platforma yayınlanma kaydı.

**Alanlar:**
- `id`
- `content_project_id`
- `channel_profile_id`
- `platform_connection_id`
- `platform` — `youtube`
- `status` — state machine aşağıda
- `title`, `description`, `tags`, `category_id`
- `privacy` — `private` / `unlisted` / `public`
- `scheduled_for` (opsiyonel)
- `published_at` (opsiyonel)
- `external_video_id` (publish sonrası YouTube video ID)
- `review_gate_passed` — bool
- `created_at`, `updated_at`

### Publish state machine

```
draft → review_pending → approved → scheduled → publishing → published
                           ↓
                        rejected
                         
                        publishing → failed → (retry) → publishing
```

- `draft` — taslak, review'a göndermedi
- `review_pending` — user yayına gönderdi, admin onayı bekliyor
- `approved` — admin onayladı
- `rejected` — admin reddetti (reason ile)
- `scheduled` — belirli bir zamana planlandı
- `publishing` — şu an YouTube API'ye upload ediliyor
- `published` — başarıyla yayınlandı
- `failed` — yayın başarısız oldu (retry açık)

### Review Gate kuralı

PublishRecord `published` state'ine sadece `approved` veya `scheduled`'dan geçebilir. Direct `draft → published` transition yasaktır. Admin onayı olmadan yayın yapılamaz.

Bu CLAUDE.md'nin Publishing kuralıdır ve kod içinde enforce edilir (core invariant, admin panelden kapatılamaz).

---

## ReviewDecision

**Nedir?** Bir PublishRecord üzerindeki review aksiyonunun denetim kaydı.

**Alanlar:**
- `id`
- `publish_record_id`
- `decision` — `approved` / `rejected` / `sent_back`
- `reviewer_id`
- `reason` (rejected için zorunlu)
- `created_at`

---

## Source (News Source)

**Nedir?** Haber kaynağı — RSS, manual URL, API.

**Alanlar:**
- `id`
- `name`
- `type` — `rss` / `manual_url` / `api`
- `url`
- `language`
- `trust_level` — `high` / `medium` / `low`
- `enabled`
- `scan_mode` — `manual` / `auto` / `curated`
- `last_scan_at`
- `health` — `healthy` / `degraded` / `failed`

**Not:** Bu doc setinde "Source" kavramı sadece news source'a aittir. Semantic dedupe henüz yok; hard + soft dedupe kullanılır.

---

## SourceScan

**Nedir?** Bir Source'un tek taramasının kaydı.

**Alanlar:**
- `id`
- `source_id`
- `started_at`, `completed_at`
- `status` — `success` / `failed`
- `items_fetched`
- `items_new`
- `items_duplicate`
- `error_message`

---

## NewsItem

**Nedir?** Bir SourceScan'den elde edilen normalize edilmiş tekil haber.

**Alanlar:**
- `id`
- `source_id`
- `source_scan_id`
- `external_id` (kaynak dedupe anahtarı)
- `title`
- `summary`
- `body` (veya `body_ref`)
- `published_at`
- `url`
- `normalized_at`
- `used` — bool (UsedNews ledger ile eşlenir)

---

## UsedNews

**Nedir?** Kullanılan haberleri işaretleyen dedupe ledger.

**Alanlar:**
- `id`
- `news_item_id`
- `content_project_id` — hangi projede kullanıldı
- `used_at`

**Kural:** Bir NewsItem aynı ChannelProfile için iki kez kullanılamaz (hard dedupe). Soft dedupe kontrolü wizard'da uyarı verir. Controlled follow-up exception işlenebilir.

---

## Setting

**Nedir?** Settings Registry'de tutulan bir config key.

**Alanlar:**
- `key` — ör. `news_bulletin.max_items_per_bulletin`
- `group` / `category`
- `type` — `text` / `number` / `bool` / `select` / `prompt` / `json`
- `default_value`
- `admin_value` (opsiyonel override)
- `user_override_allowed` — bool
- `visible_to_user` — bool
- `visible_in_wizard` — bool
- `read_only_for_user` — bool
- `module_scope` — `standard_video` / `news_bulletin` / vb.
- `help_text`
- `validation_rules`
- `version`, `status`

### Effective Setting

Bir kullanıcı için bir setting'in **effective** değeri şu sırayla hesaplanır:

1. User override (varsa ve izinliyse)
2. Admin value (varsa)
3. Default value

Job başlatıldığında effective snapshot alınır → snapshot-lock.

### Prompt-type setting örnekleri

- `news_bulletin.prompt.narration_system`
- `news_bulletin.prompt.script_pipeline`
- `standard_video.prompt.metadata_generator`

Prompt metni kod içinde string literal olarak tutulamaz — KNOWN_SETTINGS kuralı.

---

## Visibility Rule

**Nedir?** Bir kullanıcıya hangi panelin / alanın / wizard step'in görüneceğini belirleyen kural.

**Alanlar:**
- `id`
- `key` — ör. `panel:publish`, `widget:analytics.revenue`, `field:publish.schedule`, `step:wizard.video.prompt_override`
- `audience` — `all` / `role:user` / `role:admin` / `user:username`
- `visible` — bool
- `read_only` — bool
- `notes`
- `created_by`
- `created_at`

**Enforce:** Server-side zorunlu. Client-side yansıtılır ama bypass edilemez.

---

## Provider

**Nedir?** Dış bir AI/TTS/image/speech servisinin kaydı.

**Kategoriler:**
- **LLM** — kie_ai_gemini_flash, openai_compatible
- **TTS** — kie_ai_tts, local_tts
- **Image** — pexels, pixabay
- **Speech Recognition** — local_whisper

**Alanlar:**
- `id`, `category`, `name`, `version`
- `credentials_status` — `configured` / `missing` / `invalid`
- `enabled`
- `priority` — fallback sırası
- `metrics` — calls, errors, error_rate

---

## Wizard

**Nedir?** Onboarding / content creation / publish / source setup için rehberli adımlı akış.

**Alanlar (wizard definition):**
- `id`
- `module_type` (opsiyonel)
- `steps` — adım listesi
- `mode_support` — `guided` / `advanced` / `both`
- `visibility_rules` — hangi step hangi kullanıcıya

**Wizard types:**
- Video Wizard (`/user/create/video`)
- Bulletin Wizard (`/user/create/bulletin`)
- Channel Setup Wizard (onboarding)
- Source Setup Wizard
- Publish Wizard

---

## Sonraki adım

- Bu entity'lerin iş akışları → `07-key-workflows.md`
- Publish state machine detayı → `07-key-workflows.md` + `09-buttons-actions-and-states.md`
- Settings ve visibility governance → `10-settings-visibility-and-governance.md`
- Terim sözlüğü → `14-glossary.md`
