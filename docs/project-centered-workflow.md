# Project-Centered Workflow — PHASE AF

Durum: **Kapandı** (commit a2d51f7 backend, 0d38057 frontend).

## Amaç

Kullanıcı tek bir `ContentProject` altında birden fazla iş (news_bulletin,
standard_video, product_review) çalıştırabilmeli; sayfa-sayfa dolaşmadan,
wizard'lar arası context kaybı yaşamadan son ürün hissi veren bir akış.

Scope sınırı: yeni paralel altyapı YOK. Mevcut endpoint'ler, mevcut ownership
kontrolü, mevcut preview pipeline üzerine _project-scope aggregate_ eklendi.

## Hierarchy

```
ChannelProfile (URL-only fetch, import_status lifecycle)
    └── ContentProject (module_type = ana modül, ama işler heterojen olabilir)
            ├── Job #1 (news_bulletin, completed)
            ├── Job #2 (standard_video, running)
            └── Job #3 (product_review, queued)
                    └── PublishRecord[] (per job, yayın kayıtları)
```

`ContentProject.module_type` projenin **ana** modülünü belirtir, ama altta
farklı modüllerden işler koşabilir. Launcher 3 modülü de gösterir.

## Backend Kontrat

### GET `/api/v1/content-projects/{id}/summary`

Proje-scope aggregate. Ownership `ensure_owner_or_admin` ile zorlanır.

```json
{
  "project_id": "proj-uuid",
  "jobs": {
    "total": 5,
    "by_status": {"completed": 3, "failed": 1, "running": 1},
    "by_module": {"news_bulletin": 3, "standard_video": 2},
    "last_created_at": "2026-04-15T12:34:56Z"
  },
  "publish": {
    "total": 2,
    "by_status": {"published": 1, "scheduled": 1},
    "last_published_at": "2026-04-15T13:00:00Z"
  }
}
```

Cross-user erişim → 403. Boş proje → tüm sayımlar 0, `last_*_at` null.

### GET `/api/v1/content-projects/{id}/jobs?module_type=...&status=...`

Proje-scope iş listesi; `module_type` + `status` query filtrelerini destekler.
Ownership aynı kurallar. Frontend filtre UI'ı bu endpoint'i çağırır.

## Frontend Contract

### Launcher Deep-Link

Proje detay sayfasındaki 3 modül kartı wizard'lara aşağıdaki URL'lerle yollar:

- `/user/create/video?contentProjectId=P&channelProfileId=C`
- `/user/create/bulletin?contentProjectId=P&channelProfileId=C`
- `/user/create/product-review?contentProjectId=P&channelProfileId=C`

Her wizard `useSearchParams` ile preset'leri okur:

```tsx
const presetChannelProfileId = searchParams.get("channelProfileId");
const presetContentProjectId = searchParams.get("contentProjectId");
```

İlk state hem preset hem initialState'i merge eder. `useEffect` otomatik
step atlar:
- `presetChannelProfileId + presetContentProjectId` → Step 2 (content adımı)
- sadece `presetChannelProfileId` → Step 1 (proje adımı)

Bu sayede user proje detayından "Yeni Bülten" tıklayınca Kanal + Proje
adımlarını ikinci kez geçmek zorunda kalmaz.

### ProjectDetailPage Bölümleri (sırayla)

1. **TabBar** — Genel / Otomasyon (otomasyon tabı `ProjectAutomationPanel`)
2. **Proje Bilgileri** — ID, modül, kanal (link), durum, oluşturulma
3. **Proje Özeti** — `useProjectSummary` aggregate: 4 stat kartı + module chips
4. **Yeni İş Başlat** — 3 launcher card
5. **Bekleyen Video** (opsiyonel) — standard_video için legacy tek-video başlatma
6. **Bağlı İşler** — `useProjectJobs` + module + status filter + clear
7. **Son iş preview** — `JobPreviewList` (reused)
8. **Yayın Durumu** — `usePublishRecordsByProject` inline
9. **Aksiyonlar** — completed işse `/user/publish?projectId=...`; projelere dön

## Ownership

- **Sadece kendi** projesini/iş/publish kaydını görür (ownership backend'de)
- Admin bypass korunur
- Cross-user direct-ID erişimi 403
- Frontend ek filtre YAPMAZ — backend tek otorite

## Honest State

- Summary boşsa "0" göster, placeholder metin yok
- Filter sonuç boşsa "Bu filtreye uyan iş yok" (filter aktifken)
- Import status `partial` / `failed` olan kanallar badge ile işaretli
- "Yayına Gönder" butonu sadece `completed` iş varsa görünür (fake CTA yok)

## Test Kanıtı

- Backend: `test_phase_af_project_centered.py` 6/6 (filter, summary scope,
  cross-user 403, publish by-project, channel reimport ownership, empty zeros)
- Frontend: `phase-af-project-centered.smoke.test.tsx` 5/5 (summary counts,
  3 launcher cards, jobs filter wiring, channel link, linked job row)
- Full backend suite: 2392/2392 yeşil
- Tip check + build: clean
