# 10 — Settings, Visibility ve Governance

Bu dosya ContentHub'ın "yönetilebilirlik" omurgasını açıklar: Settings Registry, Effective Settings, Visibility Engine, Provider Registry, Wizard governance.

---

## Settings Registry

**Amaç:** Ürünün tüm operatör-facing davranışını admin panelden yönetilebilir hale getirmek. CLAUDE.md'nin non-negotiable kuralıdır — prompt metinleri, threshold'lar, default'lar, editorial patternlar asla kod içinde string literal olarak tutulamaz.

### KNOWN_SETTINGS

`backend/app/settings/known.py` (veya benzer) içinde tüm setting key'leri tanımlıdır. Bu liste sistemin "izin verilen config anahtarları" listesidir. Tanımlı olmayan bir key registry'ye yazılamaz.

### Setting metadata

Her setting kayıt olarak şunları içerir:

- `key` — yapısal isim (ör. `news_bulletin.prompt.narration_system`)
- `group` / `category` — UI'da gruplama
- `type` — `text` / `number` / `bool` / `select` / `prompt` / `json`
- `default_value`
- `admin_value` (opsiyonel — admin override)
- `user_override_allowed` — bool
- `visible_to_user` — bool
- `visible_in_wizard` — bool
- `read_only_for_user` — bool
- `module_scope` — hangi modüle aittir
- `help_text`
- `validation_rules`
- `version` / `status`

### Setting türleri — örnekler

| Tür | Amaç | Örnek key |
|---|---|---|
| `text` | Kısa metin | `platform.brand_name` |
| `number` | Sayı | `news_bulletin.max_items_per_bulletin` |
| `bool` | Toggle | `module.news_bulletin.enabled` |
| `select` | Enum seçim | `tts.default_voice` |
| `prompt` | LLM prompt metni | `news_bulletin.prompt.narration_system` |
| `json` | Structured config | `style_blueprint.defaults` |

### Naming convention

Prompt setting'leri için: `{module}.prompt.{purpose}`

Örnekler:
- `news_bulletin.prompt.narration_system`
- `news_bulletin.prompt.script_pipeline`
- `news_bulletin.prompt.metadata_generator`
- `standard_video.prompt.script_system`
- `standard_video.prompt.thumbnail_director`

Modül toggle'ları: `module.{id}.enabled`
- `module.standard_video.enabled`
- `module.news_bulletin.enabled`

---

## Effective Settings — merge mantığı

Bir setting için "effective" değer şu sırayla hesaplanır:

1. **User override** — kullanıcı kendi değerini override etti mi, ve `user_override_allowed=true` mı?
2. **Admin value** — admin değer override etti mi?
3. **Default value** — fabrika ayarı

### Snapshot-lock

Bir job başlatıldığında **o anki effective değerler** JSON olarak job'a embed edilir (`settings_snapshot`). Sonradan setting değişirse bile **çalışan job etkilenmez**.

Bu kural CLAUDE.md'de açıkça yazılıdır ve kod içinde enforce edilir.

### Effective settings API

`GET /api/settings/effective` — kullanıcı için tüm effective değerleri döndürür (visibility + user override + admin merge sonrası).

Frontend `useSettings` hook'u bu endpoint'i çağırır.

---

## Prompt governance (Master Prompt Editor)

**Sayfa:** `/admin/prompts`

**İş:** type=`prompt` olan tüm setting'leri merkezi olarak editleyen UI.

### Özellikler
- Prompt'lar module_scope bazlı gruplanır
- Her prompt'un version history'si korunur
- Monaco editor (veya benzer) syntax highlighting
- Test butonu (prompt + sample input → LLM smoke)
- "Varsayılana dön" — fabrika prompt'una reset

### Audit trail
Her prompt değişikliği audit_log'a yazılır: kim, ne zaman, eski değer, yeni değer.

### Snapshot korunumu
Prompt değişikliği çalışan job'lara etki etmez. Sadece sonraki job'lar yeni prompt ile çalışır.

---

## Visibility Engine

**Amaç:** Panel / widget / field / wizard step görünürlüğünü kural bazlı kontrol etmek.

**Sayfa:** `/admin/visibility`

### Rule model

Her kural:

- `key` — neyi kontrol ettiği
- `audience` — kime uygulanacağı
- `visible` — görünür mü
- `read_only` — salt okunur mu
- `notes` — admin not

### Key convention

- `panel:{panel_name}` — panel visibility (ör. `panel:publish`)
- `widget:{widget_id}` — widget visibility (ör. `widget:analytics.revenue`)
- `field:{field_path}` — field visibility (ör. `field:publish.schedule`)
- `step:{wizard}.{step}` — wizard step (ör. `step:wizard.video.prompt_override`)

### Audience

- `all` — herkese uygulan
- `role:admin` / `role:user` — rol bazlı
- `user:username` — tek kullanıcı bazlı

### Enforcement

**Server-side enforce:**
- API endpoint'i her çağrıda visibility kontrol yapar
- Field level: gizli field'lar response'tan çıkarılır
- Panel level: rota 403 döner (veya redirect)

**Client-side reflect:**
- Visibility manifest client'a download edilir
- UI gizli field/widget/panel'leri render etmez
- Ancak client-side kontrol güvenlik değildir — server asla güvenmeyen bir rol'e hidden veri göndermez

### Test fixture'lar

Development için test fixture visibility rule'ları eklenir ve bunlar default olarak gizlenir. `/admin/visibility`'deki `Test verisini göster` toggle ile görünür hale getirilir.

---

## Provider Registry

**Amaç:** Tüm dış servisleri (LLM / TTS / image / speech) merkezi olarak yönetmek. Credential + fallback + metrik.

**Sayfa:** `/admin/providers`

### Kategoriler

| Kategori | Provider örnekleri |
|---|---|
| LLM | `kie_ai_gemini_flash`, `openai_compatible` |
| TTS | `kie_ai_tts`, `local_tts` |
| Image | `pexels`, `pixabay` |
| Speech Recognition | `local_whisper` |

### Provider metadata

- `id`, `category`, `name`, `version`
- `credentials_status` — `configured` / `missing` / `invalid`
- `enabled` — boolean
- `priority` — fallback sırası
- `metrics`:
  - `calls` — toplam çağrı
  - `errors` — toplam hata
  - `error_rate` — %
  - `avg_latency_ms`
  - `total_cost_usd`

### Credential yönetimi

Credential'lar **Settings Registry'de** tutulur (`provider.{id}.credentials.{key}`). Güvenlik için değer encrypted saklanır ve UI'da masked gösterilir.

**Kural:** Credential'lar kesinlikle kod içine yazılamaz.

### Fallback mekanizması

Bir kategori içinde (ör. LLM), provider'lar `priority` sırasına göre denenir. İlk başarısız olursa otomatik olarak sonraki denenir. Bu Job Detail'in provider trace bölümünde görünür — "Fallback kullanıldı: kie_ai_gemini_flash başarısız → openai_compatible ile tamamlandı".

### Metric akışı

Her provider çağrısı kayıt edilir:
- Başlangıç zamanı
- Bitiş zamanı
- Input token / output token
- Latency
- Cost estimate
- Success / fail + error message

Bu veriler `/admin/providers` sayfasında özetlenir.

---

## Wizard Governance

**Amaç:** Wizard step'lerin admin tarafından yönetilmesini sağlamak.

**Sayfa:** `/admin/wizard-settings`

### Wizard definition

Her wizard:
- `id` — ör. `wizard.video`, `wizard.bulletin`, `wizard.channel_setup`
- `module_type` (varsa)
- `steps` — step definition'ları
- `mode_support` — `guided` / `advanced` / `both`

### Step governance

Her step için admin:
- `visible` — gösterilsin mi
- `read_only` — salt okunur mu
- `default_value_override` — admin'den default
- `user_override_allowed` — user değiştirebilir mi

### Guided vs Advanced Mode

- **Guided Mode** — teknik override'lar gizli, default'lar otomatik, wizard adımları basitleştirilmiş
- **Advanced Mode** — tüm step'ler görünür, prompt override açık, provider seçimi açık

User `/user/settings`'den kendi modunu değiştirebilir (eğer `user_override_allowed=true`). Admin bir kullanıcıyı belirli moda kısıtlayabilir.

---

## Settings feature surface checklist

CLAUDE.md'nin non-negotiable kuralı: **her yeni feature + prompt + behavior + modül için settings governance kontrol listesi**.

Her yeni feature eklerken:

1. ✅ Setting key KNOWN_SETTINGS'de tanımlandı mı?
2. ✅ Admin Settings page'de görünür mü?
3. ✅ Type `prompt` ise Master Prompt Editor'de görünür mü?
4. ✅ Wizard parameter ise Wizard Governance'da görünür mü?
5. ✅ Module toggle ise `module.{id}.enabled` Settings Registry'de yönetiliyor mu?

Bu checklist tamamlanmadan feature merge edilmez.

---

## Core invariants (admin panelden kapatılamaz)

Bazı kurallar kesinlikle kod içinde kalır ve admin tarafından override edilemez:

- **Pipeline step order** — script → metadata → tts → subtitle → composition → render sırası değiştirilemez
- **Publish state machine rules** — `draft → published` doğrudan geçiş yasak, Review Gate zorunlu
- **Security guards** — auth, authz, CSRF, input validation
- **Validation enforcement** — her API input validate edilir
- **Job engine state machine** — queued → running → completed/failed transition'ları
- **Snapshot-lock** — runtime setting değişikliği çalışan job'ı etkilemez

Bu kurallar "core invariants" olarak işlem görür ve Settings Registry'de yer almaz.

---

## Audit log

**Sayfa:** `/admin/audit-logs`

**Ne kayıt edilir?**
- Settings değişiklikleri
- Visibility rule ekleme/düzenleme/silme
- User ekleme/rol değiştirme
- Provider credential değişiklikleri
- Publish manual override (approve, reject, rollback)
- Template + blueprint CRUD
- Prompt değişiklikleri (Master Prompt Editor)

**Ne kayıt edilmez?**
- Normal job yaşam döngüsü (zaten Job Detail'de)
- Read-only API çağrıları
- Content oluşturma (ContentProject) — audit değil, domain event

---

## Notification Center

**Amaç:** Kritik olayları kullanıcıya push etmek.

**Örnekler:**
- Job failed → notification
- Review pending → admin notification
- Scheduled publish başladı → owner notification
- Provider credential expired → admin notification
- Source failed scan → admin notification

**Kanal:** SSE ile anlık + Notification Center panel'inde history.

---

## Sonraki adım

- Hangi alan tam hangi partial → `11-current-capabilities-vs-partial-areas.md`
- Günlük admin rutini → `12-operator-playbook.md`
- Settings key'lerin tam sözlüğü → kod içinde `KNOWN_SETTINGS`
