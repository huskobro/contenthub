# Channel Auto-Import (URL-only) — PHASE X

> Kanal oluşturma akışı **tek alana** indirildi: **kanal URL'si**. Metadata
> (başlık, handle, avatar, external channel id) sistem tarafından çekilir.
> Metadata çekilemezse uydurma placeholder üretilmez — `import_status=partial`
> olarak kaydedilir; kullanıcı dürüstçe durumu görür.

---

## 1. Akış

```
  Kullanıcı       Frontend             Backend (channels/router)        DB
     │                │                         │                        │
     │  URL gir ──▶  POST /api/v1/channel-profiles
     │                │   { source_url }        │                        │
     │                │ ───────────────────────▶│                        │
     │                │                         │ normalize_channel_url  │
     │                │                         │  → platform, normalized│
     │                │                         │  → handle / channel_id │
     │                │                         │                        │
     │                │                         │ UniqueConstraint       │
     │                │                         │  (user_id, normalized) │
     │                │                         │  çakışma → 409         │
     │                │                         │                        │
     │                │                         │ fetch_channel_metadata │
     │                │                         │  (http, 5s timeout)    │
     │                │                         │                        │
     │                │                         │ INSERT ChannelProfile  │
     │                │                         │  import_status =       │
     │                │                         │   "success" |          │
     │                │                         │   "partial"            │
     │                │                         │                        │
     │                │ ◀──────────────────────│                        │
     │                │  ChannelProfileRead    │                        │
     │  "Kanal Eklendi"                        │                        │
```

---

## 2. URL Normalizasyonu — `app/channels/url_utils.py`

- `normalize_channel_url(url)` — host lowercase, tracking param temizliği
  (`utm_*`, `fbclid`, `si`, `pp`, `feature` vs.), sonda slash, query sort.
- `parse_channel_url(url)` → `ChannelURLInfo(platform, source_url,
  normalized_url, handle, external_channel_id, kind)`.
- `kind ∈ {"handle", "channel", "user", "custom", "unknown"}` — orijinal URL
  formunu kaydeder.

### Platform Desteği (v1)

- **YouTube:** `youtube.com`, `youtu.be`, `m.youtube.com`.
  - `@handle`, `/channel/UC…`, legacy `/user/…`, legacy `/c/…`.
- Diğer platformlar: out-of-scope (faz L sonrası ayrı faz).

### Unique Key

Aynı kullanıcı aynı `normalized_url`'i ikinci kez ekleyemez:

```
UniqueConstraint(user_id, normalized_url)
```

İhlal → **HTTP 409** (duplicate). Farklı kullanıcılar aynı URL'i ekleyebilir
(multi-operator senaryosu için).

---

## 3. Metadata Fetch — `app/channels/metadata_fetch.py`

### Akış

1. **HTML fetch** — `httpx.AsyncClient`, 5s timeout, 512 KB read limit.
   - `User-Agent`: jenerik browser; YouTube captcha / consent-wall yok sayılır.
2. **og:\* scrape** — `og:title`, `og:image`, `og:description`.
3. **YouTube-spesifik:** `"channelId":"UC..."` HTML regex ile yakalanır.
4. **Title sonek temizliği:** `" - YouTube"` çıkarılır.
5. **Hata durumu:**
   - Network / timeout / parse hatası → `ChannelMetadata(is_partial=True,
     fetch_error=reason)`, title/handle None.

### Kesin Kurallar

- ❌ **Uydurma title üretilmez.** ("Kanal 1", "Untitled" yok.)
- ✅ Partial state **dürüst kaydedilir:** `import_status="partial"`,
  `import_error="..."`, title NULL.
- ✅ Kullanıcı daha sonra elle title girebilir; import yeniden denenebilir
  (re-import endpoint'i şu an kapsamında değil; teknik borç olarak işaretli).

---

## 4. Veri Modeli — Yeni Kolonlar

Migration: `phase_x_001`.

`channel_profiles` tablosuna eklenenler:

| Kolon | Tip | Amaç |
|---|---|---|
| `platform` | `VARCHAR(32)` (default "youtube") | Hedef platform |
| `source_url` | `TEXT` | Kullanıcının verdiği ham URL |
| `normalized_url` | `TEXT` | Tracking-strip edilmiş canonical URL |
| `external_channel_id` | `VARCHAR(64)` | Platformun kanal ID'si (YouTube UC…) |
| `handle` | `VARCHAR(128)` | `@someone` (varsa) |
| `title` | `VARCHAR(256)` | og:title / YouTube page title |
| `avatar_url` | `TEXT` | og:image |
| `metadata_json` | `JSON` | Ham fetch sonucu (debug) |
| `import_status` | `VARCHAR(16)` | `"pending"` / `"success"` / `"partial"` |
| `import_error` | `TEXT` | Partial olduğunda hata mesajı |
| `last_import_at` | `DATETIME` | Son çekme zamanı |

### Index'ler

- `ix_channel_profiles_platform`
- `ix_channel_profiles_normalized_url`

### Constraint

- `UniqueConstraint("user_id", "normalized_url")` — kullanıcı bazlı tekil.

---

## 5. Router Yüzeyi

Dosya: `backend/app/channels/router.py`.

### `POST /api/v1/channel-profiles`

**Request (URL-only):**
```json
{ "source_url": "https://www.youtube.com/@somechannel?si=xxxxxxxx" }
```

**Response 201:**
```json
{
  "id": "...",
  "user_id": "...",
  "platform": "youtube",
  "source_url": "https://www.youtube.com/@somechannel?si=xxxxxxxx",
  "normalized_url": "https://youtube.com/@somechannel",
  "handle": "@somechannel",
  "external_channel_id": "UC...",
  "title": "Some Channel",
  "avatar_url": "https://...",
  "import_status": "success",
  "last_import_at": "2026-04-16T..."
}
```

**Hata durumları:**
- `400` — URL parse hatası (geçersiz URL, desteklenmeyen platform).
- `409` — aynı kullanıcı aynı `normalized_url` ile zaten kayıt oluşturmuş.
- `422` — eksik `source_url`.

### `GET /api/v1/channel-profiles` / `GET /{id}`

Ownership scope uygulanır (`apply_user_scope`). Detail endpoint'i
`ensure_owner_or_admin` kapısından geçer.

### Legacy manuel alanlar

`profile_name` hâlâ opsiyonel; frontend form'da **gizli**. Advanced admin
panelinde (override gerekirse) görünür. Kullanıcı form'u tek alanlıdır:
**kanal URL'si.**

---

## 6. Frontend — `frontend/src/pages/user/MyChannelsPage.tsx`

- Tek input: **Kanal URL'si**.
- Submit sonrası:
  - `import_status === "success"` → başlık + avatar kartta görünür.
  - `import_status === "partial"` → "Başlık alınamadı" rozeti, kullanıcı
    elle düzeltebilir (teknik borç: re-import buton yok).
- Liste `useChannelProfiles` hook'u üzerinden — server'dan zaten
  scope'lu gelir.

---

## 7. Test Kapsamı

- `backend/tests/test_phase_x_ownership.py` — URL-only create, duplicate 409,
  partial import state, cross-user ownership denial.
- Mevcut `test_faz5a_project_channel_wiring.py` + `test_faz11_publish_v2.py`
  — auth'lı flow, channel attach.

---

## 8. Teknik Borç / Ertelenen

- **Re-import endpoint.** Partial ya da eski kayıtlar için `POST
  /channel-profiles/{id}/re-import` yoktur. Kullanıcı elle title girer ya da
  kaydı silip tekrar ekler. Sonraki fazda eklenecek.
- **YouTube API anahtarlı fetch.** OEmbed/Data API yoktur; HTML scrape.
  Daha sağlıklı metadata için API entegrasyonu gelecek fazda.
- **Non-YouTube platformlar.** TikTok / Instagram / X / diğerleri kapsamda
  değil. `platform` kolonu genişlemeye hazır.
- **Consent-wall / captcha.** YouTube bazı bölgelerde HTML'yi consent-wall
  arkasına alır. `is_partial=True` döner; operatör dürüstçe görür.
