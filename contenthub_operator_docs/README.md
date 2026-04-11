# ContentHub Operator Docs

Bu klasör ContentHub ürününün **bugünkü gerçek hali** için hazırlanmış tam operatör rehberidir.

Amaç: ürünü yeni devralan biri, operatör, admin veya user — herkes tek bir doküman setiyle "bu sistem ne yapıyor, hangi menü ne işe yarar, hangi alan tam, hangi alan partial" sorularının cevabını bulabilsin.

---

## Bu klasör nedir?

ContentHub — localhost-first, modüler içerik üretim + yayın platformu — için yazılmış **sıfırdan oluşturulmuş** operatör dokümantasyonu.

- Pazarlama metni değil.
- Mimari tezi değil.
- Eski doc'ların makyajlı versiyonu değil.
- Gerçek UI + gerçek kod + gerçek davranış gezilerek çıkarılmış **envanter ve rehber**.

---

## Nasıl okunmalı?

### Yeni devralan biri için hızlı başlangıç
Şu sırayla 1 saat içinde oku:

1. `README.md` (burası — 2 dk)
2. `13-quick-start-for-new-owner.md` (15 dk)
3. `01-system-overview.md` (10 dk)
4. `02-information-architecture.md` (10 dk)
5. `05-surfaces-themes-and-panel-switching.md` (10 dk)
6. `11-current-capabilities-vs-partial-areas.md` (10 dk)

Geri kalan dokümanlar referans olarak — ihtiyaç oldukça bakılır.

### Admin / operatör için günlük kullanım
- `12-operator-playbook.md` — her gün hangi sırayla neye bakılır
- `03-admin-panel-guide.md` — admin panelin tamamı, menü menü
- `10-settings-visibility-and-governance.md` — settings / visibility / providers akışı
- `07-key-workflows.md` — video / bulletin / publish akışları

### Son kullanıcı (user) için
- `04-user-panel-guide.md` — user panelinin tamamı
- `05-surfaces-themes-and-panel-switching.md` — yüzey değiştirme

### Kavram referansı
- `14-glossary.md` — her terim tek cümlede

### Route-bazlı arama
- `08-page-by-page-reference.md` — her sayfa route + amaç + durum

---

## Dosya listesi

| Dosya | Amaç |
|---|---|
| `README.md` | Bu dosya — klasörün kendisi hakkında giriş |
| `00-master-index.md` | Tek parça master index: tüm dosyalar + hangi konu nerede |
| `01-system-overview.md` | ContentHub nedir, neyi çözer, ana kavramlar, ana omurga |
| `02-information-architecture.md` | Admin + user panel hiyerarşisi, menü > alt menü > alt sayfa ağacı |
| `03-admin-panel-guide.md` | Admin panelin tamamı — menü menü, sayfa sayfa, buton buton |
| `04-user-panel-guide.md` | User panelin tamamı — dashboard, projects, publish, channels, vb. |
| `05-surfaces-themes-and-panel-switching.md` | Surface (shell) / theme (renk) ayrımı, Bridge/Atrium/Canvas/Horizon/Legacy, panel geçişi |
| `06-core-domain-model.md` | User, ChannelProfile, Job, ContentProject, PublishRecord, Settings, Visibility domain modeli |
| `07-key-workflows.md` | Video / bulletin / publish / review gate / source → news → bulletin akışları |
| `08-page-by-page-reference.md` | Her sayfa için: route, panel, amaç, ana bölümler, durum (tam/partial/shell) |
| `09-buttons-actions-and-states.md` | Buton tipleri, status badge mantığı, disabled/warning/fallback durumları |
| `10-settings-visibility-and-governance.md` | Settings Registry, effective settings, Visibility Engine, providers, wizard governance |
| `11-current-capabilities-vs-partial-areas.md` | Hangi alanlar tam / partial / placeholder / shell — net tablo |
| `12-operator-playbook.md` | Günlük admin + user rutini, jobs/publish/providers kontrol sırası |
| `13-quick-start-for-new-owner.md` | Yeni devralan biri için 1-saatlik öğrenme yolu |
| `14-glossary.md` | Kavram sözlüğü — her terim tek cümlede |
| `sitemap.md` | Admin + user paneli ağaç yapısında tam sitemap |

---

## Kaynaklar

Bu dokümanlar şunlardan derlenmiştir:

1. **Canlı browser turu** — her panel, her menü, her alt sayfa açılarak — preview MCP accessibility snapshot'ları.
2. **Kod envanteri** — router.tsx tam route tablosu, `useLayoutNavigation.ts` nav sabitleri, `surfaces/manifests/*.ts` surface registry, `hooks/*`, `api/*`, `components/*` kataloğu.
3. **Git tarihi** — son 2-3 haftadaki kritik değişiklikler (Round 1 + Round 2 UI polish + Türkçe uppercase locale fix + final acceptance pass).

Sistem durumu: **2026-04-11** — branch: `main` — commit: `ef284b3`.

---

## Ne yok bu dokümanda?

- Backend Python kodunun iç işleyişi (SQLAlchemy modelleri, FastAPI router'ları). Kavramsal model var, ama kod referansı yok. Sistem omurgası için `backend/app/` kendisine bakılmalı.
- Remotion compositionlarının iç kodu.
- Test stratejisi detayları — `backend/tests/`, `frontend/src/test/` kendi disiplinine sahip.
- CLAUDE.md ürün anayasası — bu doc onun uygulamasıdır, ürün anayasasının kendisi yerine geçmez.

---

## Değişiklik disiplini

Bu dokümanlar **canlı** (living documentation) olmalı. Yeni bir sayfa eklendiğinde, yeni bir surface çıktığında, büyük bir akış değiştiğinde:

1. İlgili dosyayı (genelde `03-*`, `04-*`, `08-*`, `11-*`) güncelle.
2. `sitemap.md`'yi güncelle.
3. Eski dosyayı silme — değiştir.

CLAUDE.md "Documentation Discipline" bölümü geçerlidir.
