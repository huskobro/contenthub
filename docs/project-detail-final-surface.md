# Project Detail — Final Surface (PHASE AF)

Durum: **Kapandı** — proje detay sayfası artık projenin ana üssü.

## Nedir

`/user/projects/:projectId` — kullanıcının bir projenin **tüm** durumunu
tek ekranda gördüğü sayfa. Job detayına, publish detayına ve wizard'lara
bu sayfadan navigate edilir; proje kaybolmaz.

## Bölüm Haritası

### 1. TabBar (Genel / Otomasyon)
- Genel: aşağıdaki bölümler
- Otomasyon: `ProjectAutomationPanel` — full-auto v1 ayarları (değişmedi)

### 2. Proje Bilgileri
- Proje ID (mono)
- Ana modül (label)
- **Kanal link** (PHASE AF): `useChannelProfile` ile `profile_name + @handle`
  gösterir; click → `/user/channels/:channelId`
- İçerik + Yayın durumu (badge)
- Öncelik + oluşturulma
- Açıklama (varsa)
- Aktif Job (varsa link)

### 3. Proje Özeti (PHASE AF)
`useProjectSummary` çağırır, `data-testid="project-summary"` ile sarılır.
4 stat kartı:
- Toplam İş (`jobs.total`)
- Tamamlanan (`jobs.by_status.completed`)
- Yayın Kaydı (`publish.total`)
- Yayınlanan (`publish.by_status.published`)

Altında module chip'leri: `by_module` map'inden her modül için sayı.
`last_created_at` ve `last_published_at` altbilgide.

Backend 403 → section komple gizlenir (summary data null). Boş proje → 0.

### 4. Yeni İş Başlat (PHASE AF Launcher)
3 kart, `data-testid="project-launcher-${moduleType}"`:

| Kart | Path | Wizard |
|------|------|--------|
| Video | `/user/create/video` | CreateVideoWizardPage |
| Haber Bülteni | `/user/create/bulletin` | CreateBulletinWizardPage |
| Ürün İncelemesi | `/user/create/product-review` | CreateProductReviewWizardPage |

Tıklama: `launchModule(path)` → URLSearchParams ile
`?contentProjectId=P&channelProfileId=C`. Wizard'lar preset'leri okur ve
Kanal+Proje step'lerini atlar.

### 5. Bekleyen Video (legacy, opsiyonel)
`module_type === "standard_video"` + pendingVideo varsa üretim-başlat
butonu. Launcher'a alternatif; eski akışı bozmamak için korundu.

### 6. Bağlı İşler (PHASE AF Filter)
`useProjectJobs({ module_type, status })`. Filter UI:
- `project-jobs-filter-module` — "Tüm modüller" + 3 modül
- `project-jobs-filter-status` — "Tüm durumlar" + queued/running/review_required/completed/failed/cancelled
- `project-jobs-filter-clear` — filtre aktifken görünür

Her iş satırı modül label + kısa ID + oluşturulma + adım + `nextActionHint`
+ status badge. Click → `/user/jobs/:jobId`.

Empty-state:
- Filter aktif + 0 sonuç: "Bu filtreye uyan iş yok."
- Filter yok + 0 sonuç: "Henüz bu projeye bağlı iş yok. Yukarıdan yeni bir iş başlatabilirsiniz."

### 7. Son İş Preview (reused)
Jobs listesinin en son iş'i için `JobPreviewList` render edilir — mevcut
preview/final classification kullanılır. Yeni altyapı YOK.

### 8. Yayın Durumu
`usePublishRecordsByProject` → satır bazlı publish kayıtları; click →
`/user/publish/:recordId`.

### 9. Aksiyonlar
- "Yayına Gönder" — completed iş varsa → `/user/publish?projectId=...`
- "Projelere Dön" — her zaman

## Ownership

Tüm sorgular ownership + visibility backend'de zorlanır. Cross-user access
→ 403. Frontend ek filtre YAPMAZ. `useContentProject`, `useProjectSummary`,
`useProjectJobs`, `useChannelProfile`, `usePublishRecordsByProject` —
hepsi aynı kuralı izler.

## Canvas Surface

`useSurfacePageOverride("user.projects.detail")` varsa trampoline kullanır
(CanvasProjectDetailPage). Override yoksa bu legacy body render edilir.

## Test Kanıtı

Frontend smoke: `phase-af-project-centered.smoke.test.tsx` (5 test)
- summary aggregate counts
- 3 launcher cards
- jobs filter wiring
- channel link href + handle
- linked job row modül label

Mevcut canvas-legacy / atrium-legacy smoke testleri yeni hook mock'larıyla
güncellendi; hepsi yeşil.
