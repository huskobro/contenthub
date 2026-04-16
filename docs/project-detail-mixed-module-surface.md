# Project Detail — Mixed-Module Surface (PHASE AG)

Durum: **Aktif**. ProjectDetail artık modül-üstü merkez yüzeydir.

## Hedef

PHASE AF'de "project-centered workflow" yüzeyi kurulmuştu ama proje
oluşturulurken hâlâ bir modül seçmek zorunluydu. PHASE AG bu kalıntıyı
kaldırır ve yüzeyi **karma projeler** için optimize eder.

## Ürün Davranışı

### Create Flow

1. Kullanıcı "+ Yeni Proje" butonuna basar (MyProjects veya Canvas
   MyProjects).
2. Modal açılır: **başlık** + **kanal** (+ opsiyonel açıklama).
   Modül seçici **yok**.
3. Kısa yardım metni: _"Modül seçimini ilgili wizard başlatırken
   yaparsınız."_
4. Backend `"mixed"` olarak kaydeder → kullanıcı ProjectDetail'e
   yönlendirilir.

### Detail Yüzeyi

Surface katmanı (legacy, Canvas, Atrium) aynı contract'i izler:

- **Hero / başlık**: Proje başlığı + `formatProjectModuleLabel()` alt
  satırı (`Karma (modül-üstü)` veya `Standart Video (legacy)`).
- **Meta bloğu**: "Ana modül" satırı; `data-testid="project-main-module-label"`
  (Canvas: `canvas-project-main-module-label`, Atrium:
  `atrium-project-main-module-label`).
- **3 Launcher kart**:
  - 🎥 Standart Video →
    `/user/create/video?contentProjectId=<id>&channelProfileId=<ch>`
  - 📰 Haber Bülteni →
    `/user/create/bulletin?contentProjectId=<id>&channelProfileId=<ch>`
  - 🛍 Ürün İncelemesi →
    `/user/create/product-review?contentProjectId=<id>&channelProfileId=<ch>`
  Üçü de her proje için görünür. Modül kilidi yok.
- **Summary kartları**: Job count / publish count / last activity.
  Karma projede tüm modüller aggregate edilir.
- **Jobs bloğu**: Module + status filter; her satır kendi `module_type`
  rozeti ile.
- **Preview & Publish**: PHASE AF'deki `JobPreviewList` + publish
  summary aynen korunur.

### Automation Guard

Karma proje (`module_type` null veya `"mixed"`) olduğunda
`ProjectAutomationPanel` (legacy + Canvas + Atrium) **pause+warning**
modunda render edilir:

> "Bu proje modül-üstü (karma). Full-auto başlatılamadı — sadece tek
> modüle ait projelerde otomasyon çalışır."

UI tarafında moduleType param'ı opsiyonel:
```tsx
<ProjectAutomationPanel moduleType={project.module_type ?? undefined} />
```

## Surface Parity

| Yüzey | Sayfa | Key Helper |
|-------|-------|-----------|
| Legacy | `pages/user/ProjectDetailPage.tsx` | `formatProjectModuleLabel()` |
| Canvas | `surfaces/canvas/CanvasProjectDetailPage.tsx` | `formatCanvasProjectModule()` |
| Atrium | `surfaces/atrium/AtriumProjectDetailPage.tsx` | `formatAtriumProjectModule()` |

Helper'lar aynı contract'i uygular — sadece metin/stil surface'e göre
uyarlanmıştır (Canvas: "Karma", Atrium: "Karma · çok modüllü").

## Dashboard ve Publish Yüzeyleri

### Dashboard
- `CanvasUserDashboardPage.tsx`: `ProjectPreviewTile moduleLabel` artık
  null-safe; `null` / `"mixed"` → "Karma".
- `AtriumUserDashboardPage.tsx`: `LineupCard` + headline satırı aynı
  yaklaşımı kullanır.

### Publish
- `UserPublishPage.tsx` ve `CanvasUserPublishPage.tsx`:
  - `content_ref_type` gönderiminde `selectedProject.module_type ?? "mixed"`.
  - Metric tile "Ana modül" → karma/legacy etiketi.

## Dokunulmayan Alanlar

- **Job Detail**: Pipeline view, timeline, logs — değişmedi.
- **Wizard formları**: Standard Video / News Bulletin / Product Review
  wizard'ları kendi module_type'ını çoktan biliyordu; query param'dan
  gelen `contentProjectId` + `channelProfileId` zaten destekleniyordu
  (PHASE AE/AF'den kalma).
- **Analytics**: Project-scoped aggregate aynı; karma projede modül-
  agnostik rakam.

## Test Kapsamı

`frontend/src/tests/phase-ag-multi-module-project.smoke.test.tsx` (6 test):
1. Tablo render — karma proje → "Karma" kolonu
2. Tablo render — legacy proje → "Standart Video (legacy)"
3. Create modal — sadece 1 `<select>` (kanal), modül option yok,
   yardım metni var
4. ProjectDetail karma — `project-main-module-label` = "Karma
   (modül-üstü)"
5. ProjectDetail legacy — "Standart Video (legacy)"
6. 3 launcher kart — `contentProjectId=<id>&channelProfileId=<ch>`
   route'una gider

Baseline (PHASE AG öncesi) fail eden 12 test (`user-publish-entry`,
`user-panel-empty-state-clarity`) **PHASE AG ile alakasız**; aynı
failures stash'li çalıştırmada da mevcut.
