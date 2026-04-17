# Redesign Dalgası — Kalıcı Memory Dokümanı

> **Amaç:** Bu dalganın tüm isteklerini, yapılan/yapılmayan/reddedilen/ertelenen/ileride-yapılabilir her şeyi tek bir izlenebilir yerde tutmak. Her faz sonunda güncellenir. Unutulmasın diye.
>
> **Worktree:** `.claude/worktrees/product-redesign-benchmark`
> **Branch:** `worktree-product-redesign-benchmark`
> **Baz SHA:** `33783e1` (main)
> **Dil:** Türkçe (konuşma + raporlar), teknik terimler/isimler İngilizce kalabilir

---

## 1. Kilit Ürün İlkeleri (asla unutulmayacak)

### 1.1 Mimari Karar: "Tenant-Scoped User Isolation + Admin All-Users"
- **Her kullanıcı YALNIZ kendi scope'unu görür:** kendi kanalları, işleri, OAuth/API key'leri, ayarları, analytics'i, inbox'ı, calendar'ı.
- **Admin ise all-users view + X kullanıcısına odak** ikilisine sahip. Varsayılan "tüm kullanıcılar", tek tuşla "kullanıcı: X" scope'una geçiş.
- **Enforcement backend'de** — sadece frontend filtresi değil (CLAUDE.md ile tam uyumlu).
- **Frontend'de "kim olduğum" hissi** görsel olarak var olmalı (avatar, subtle "Sen:" vurgusu, scope chip'i).

### 1.2 Şimdilik İSTENMEYENLER (kalıcı "hayır" listesi)
- ❌ Workspace switcher (org/project picker)
- ❌ Team switcher
- ❌ Organization management
- ❌ Multi-tenant enterprise karmaşası (billing, licensing)
- ❌ Hardcoded çözümler — her davranış Settings Registry üzerinden
- ❌ Kod kopyalama (rakipten de içeriden de)
- ❌ Ağır yeni npm dependency (özellikle canvas/flow/graphics kütüphaneleri: önce ispat)

### 1.3 Korunması ZORUNLU Mimari Omurga
- FastAPI + SQLAlchemy async mimarisi
- SQLite WAL + Alembic tek migration otoritesi
- Remotion rendering (renderer/)
- Settings Registry 4-layer resolver (KNOWN_SETTINGS 204 entry)
- Visibility Engine
- React Query (server state) + Zustand (client-only UI state) ayrımı
- Mevcut tema/design tokens sistemi (`docs/design-tokens-guide.md`)
- Navigation single source: `useLayoutNavigation.ts`
- Publish state machine + Analytics ownership guard + Channels UserContext + Platform Connections Faz 17/AM-2 + Automation phase AN-1

### 1.4 İstenen Rakip-Esinleri (sadece uyarlama, kopya değil)
- **make.com / n8n:** Otomasyon akışı sezgiselliği
- **Hootsuite / Buffer / Metricool / Later:** Sosyal medya yönetim paneli UX'i
- **OpusClip / Canva Studio:** Medya/clip/brand/asset deneyimi

### 1.5 Çalışma Biçimi Kuralları (REV-2 — 2026-04-17)
- Artık gereksiz onay bekleme — **R6 onay kapısı KALDIRILDI**.
- R2 → R5 kesintisiz otomatik devam ve sonrasında **R5'teki 16 kalemin tamamı tek dalgada** uygulanır.
- **R7 ayrı faz KALDIRILDI** — wizard unification P3.3 olarak bu dalgaya dahil edildi.
- Yalnızca anlamlı checkpoint'lerde 7 başlıklı kısa Türkçe rapor.
- Her anlamlı iş = ayrı commit.
- Her kod değişikliği dalgasında test + typecheck + build + ilgili smoke/integration/permission/visibility çalıştırılır; sonuç commit mesajına ve MEMORY.md'ye.
- Her kalem sonunda MEMORY.md güncellenir.
- Küçük-büyük ayrımı yok; iş tek seferde ürün seviyesinde kapatılır.
- Konuşma dili + dokümanlar = Türkçe.
- Main branch'e dokunulmaz; worktree-product-redesign-benchmark dalında kalınır.

### 1.6 REV-2 Uygulama Plan Tablosu (16 kalem, sırayla)

Her kalem: ayrı commit, push, test sonucu MEMORY.md'ye, 7 başlıklı Türkçe rapor anlamlı checkpoint'lerde.

| # | Kod | Kalem | Durum | Commit |
|---|---|---|---|---|
| 1 | P0.1 | `useCurrentUser()` hook | ⏳ Sırada | — |
| 2 | P0.2 | `useActiveScope()` + `adminScopeStore` | ⏳ | — |
| 3 | P0.3a | Admin fetch refactor — Jobs/Publish/Channels/Automation | ⏳ | — |
| 4 | P0.3b | Admin fetch refactor — Analytics/Calendar/Audit | ⏳ | — |
| 5 | P0.3c | Admin fetch refactor — kalan 35+ sayfa | ⏳ | — |
| 6 | P1.1 | `AdminScopeSwitcher` component | ⏳ | — |
| 7 | P1.2 | `UserIdentityStrip` component | ⏳ | — |
| 8 | P1.3 | `AdminDigestDashboard` | ⏳ | — |
| 9 | P1.4 | `UserDigestDashboard` | ⏳ | — |
| 10 | P2.1 | Nav yeniden gruplandırma | ⏳ | — |
| 11 | P2.2 | Analytics tabs (3 → 1) | ⏳ | — |
| 12 | P2.3 | Settings module landing | ⏳ | — |
| 13 | P3.1 | 6 duplicate çift birleştirme | ⏳ | — |
| 14 | P2.4 | Calendar unified (P3.1 sonrası) | ⏳ | — |
| 15 | P2.5 | PublishBoard toggle | ⏳ | — |
| 16 | P2.6 | Automation SVG görselleştirme | ⏳ | — |
| 17 | P3.2 | Approver assignment (Alembic migration + UI) | ⏳ | — |
| 18 | P3.3 | Wizard unification (tek motor + iki shell) | ⏳ | — |
| 19 | REG | Final regresyon: test + typecheck + build + smoke | ⏳ | — |

**Legend:** ⏳ sırada · 🟡 aktif · ✅ tamam · ❌ iptal/reddedildi

---

## 2. Faz Durum Takibi

| Faz | Adı | Durum | Commit | Teslim |
|---|---|---|---|---|
| R0 | Worktree/branch setup | ✅ Tamam | `33783e1` (branch base) | — |
| R1 | Delta-audit (post-F4 + multi-tenant) | ✅ Tamam | `689ffdb` | `docs/redesign/R1_repo_reality_delta_audit.md` |
| R2 | Rakip analizi (hibrit: 4 derin + 5 tamamlayıcı) | ✅ Tamam | `16c93bc` | `docs/redesign/R2_competitor_benchmark.md` |
| R3 | Yeni IA önerisi | ✅ Tamam | `b7c77a3` | `docs/redesign/R3_information_architecture.md` |
| R4 | Preview/prototype planı | ✅ Tamam | `8746047` | `docs/redesign/R4_preview_prototype_plan.md` |
| R5 | Uygulama yol haritası | ✅ Tamam | `e9c2cda` | `docs/redesign/R5_execution_roadmap.md` |
| R5-REV2 | R5 REV-2 revizyonu (R6 kapısı kaldırıldı, 16 kalem tek dalgada) | 🟡 Sürüyor | (commit sonrası) | `docs/redesign/R5_execution_roadmap.md` |
| IMPL | R5'teki 16 kalemin tek dalgada uygulanması | 🟡 Başlıyor | (her kalem ayrı commit) | `frontend/**/*`, `backend/**/*`, `docs/redesign/MEMORY.md` |
| ~~R6~~ | ~~Onaylı implementasyon~~ | ❌ KALDIRILDI (REV-2) | — | — |
| ~~R7~~ | ~~Wizard birleştirme ayrı faz~~ | ❌ KALDIRILDI (REV-2) — P3.3 olarak IMPL içine alındı | — | — |

---

## 3. R1 Bulguları Özeti (unutulmasın diye)

**Backend zemini:**
- Phase AL'in 3 kritik leak'i (platform_connections legacy, /users/*, /audit-logs/*) F4 öncesi kapatıldı → `06108df` + `a1c4bd6` + `50500a0`.
- Backend enforcement bugün sağlam: UserContext + apply_user_scope + require_admin.

**Frontend zayıflığı (redesign ana hedefi):**
- **54/54 (%100) admin sayfası** `useAuthStore`/`useCurrentUser` referansı taşımıyor.
- **5/54 (%9) admin sayfası** fetch'te explicit `owner_user_id`/`scope` geçiriyor.
- **12/21 (%57) user sayfası** doğru scope geçiriyor.
- Kullanıcı değişse UI görsel hâli aynı → "multi-tenant his" yok.

**Envanter:**
- 97 sayfa toplam (7 flat + 54 admin + 21 user + 15 surface).
- 6 admin/user duplicate çifti: Calendar, Connections, Inbox, JobDetail, YouTubeAnalytics, YouTubeCallback.
- 12 layout (6 flat + 6 surface), canon kararı verilmemiş.
- Wizard çatalı: admin NewsBulletin 1409 LoC (tam) vs user CreateBulletin 195 LoC (shell).
- Navigation tek kaynaktan (useLayoutNavigation.ts — KORU).

**5 ek risk (R1 çıkışı):**
1. Surface canon kararsızlığı (Atrium/Bridge/Canvas/Horizon)
2. Backend header + query-param çifte kanal
3. `useAuthStore` 30+ dosyada dağınık
4. Production ile test-scaffold iç içe (`_scaffolds/` dışında)
5. Mobil/PWA hâlâ yok

---

## 4. Yapılanlar (Cumulative)

### 4.1 Commits
- `689ffdb` — R1 delta-audit raporu (R1 teslimi)
- `7aaadbb` — MEMORY.md ilk sürüm
- `16c93bc` — R2 competitor benchmark raporu
- `b7c77a3` — R3 information architecture önerisi
- `8746047` — R4 preview/prototype planı
- `e9c2cda` — R5 uygulama yol haritası + MEMORY güncellemesi

### 4.2 Yeni Dosyalar
- `docs/redesign/MEMORY.md` (bu dosya)
- `docs/redesign/R1_repo_reality_delta_audit.md`
- `docs/redesign/R2_competitor_benchmark.md`
- `docs/redesign/R3_information_architecture.md`
- `docs/redesign/R4_preview_prototype_plan.md`
- `docs/redesign/R5_execution_roadmap.md`

### 4.3 Değiştirilen Dosyalar
- Yok (discovery-only)

---

## 5. Bu Dalgada Bilinçli Olarak Yapılmayanlar / Reddedilenler / Teknik Olarak İmkansız Olanlar

### 5.1 Reddedilenler (kullanıcı net talimatı, REV-2'de tekrar onaylandı)
- ❌ Workspace switcher / org picker / project picker
- ❌ Team switcher / team management
- ❌ Organization management
- ❌ Multi-tenant enterprise tier (billing, licensing, SSO federation)
- ❌ Ağır yeni npm dependency (özellikle `@xyflow/react` ~140 KB gzip, react-flow, d3-graph kategorileri)
- ❌ Kod kopyalama (rakipten de içeriden de)
- ❌ Hardcoded çözüm (her davranış Settings Registry üstünden)
- ❌ "Sıfırdan rastgele UI" — mevcut ürünün evrimi

### 5.2 Bu Dalgada Bilinçli Atlananlar (aktif karar)
- ⏸ **P0.4 Query key ESLint rule** — insan disiplini + test coverage yeterli; tooling gerekmiyor
- ⏸ **Mobile / PWA** — scope dışı; `ileride istenebilecekler`e
- ⏸ **Semantic dedupe** — News hard dedupe yeterli
- ⏸ **Preview analytics** — preview sayısı/tercih telemetrisi henüz gerekmiyor
- ⏸ **Vite bundle code-split** — localhost-first için bloke değil (gzip ~404 kB kabul edilebilir)
- ⏸ **Platform adapter registry** — tek platform (YouTube) yeterli, community post API 3rd party'e kapalı
- ⏸ **Real-time collaboration** (birden fazla kullanıcı aynı anda aynı sayfa)
- ⏸ **Template marketplace**
- ⏸ **AI-assisted automation suggestion**
- ⏸ **External broker integration**
- ⏸ **Custom `/api/v1/dashboard/admin/digest` endpoint** — P1.3'te client-side parallel fetch ile başla, perf sorunu olursa ekle

### 5.3 Teknik Olarak İmkansız / Kısıtlı Olanlar
- 🚫 YouTube community post API — 3rd party'e kapalı (sadece resmi app)
- 🚫 Remotion composition mapping'i değiştirmek — bu dalga dışı (CLAUDE.md: "safe composition mapping")
- 🚫 Snapshot-lock davranışını bozmak — P3.3 wizard unification'da bile kural korunacak
- 🚫 Main branch'e merge — bu dalgada asla

### 5.4 Bilinçli Korunacaklar (dokunulmayacak)
- ✅ `UserPublishEntryPage` scaffold (13 test bağlı)
- ✅ Surface mod varyantları legacy fallback (kullanıcı sürpriz görmez)
- ✅ `useLayoutNavigation.ts` single-source pattern (yalnız array içeriği güncellenir, yapı değişmez)
- ✅ Snapshot-lock davranışı (`effective_settings_snapshot_id` yazımı)
- ✅ Tüm CLAUDE.md non-negotiable kuralları
- ✅ Design tokens guide (`text-neutral-900/200` vb. kuralları)
- ✅ React Query + Zustand ayrımı
- ✅ Alembic tek migration otoritesi (Alembic dışı manuel SQL yok)

---

## 6. İleride İstenebilecekler (not olarak tutulur, bu dalgada yok)

- Mobil uygulama / PWA
- Multi-tenant enterprise tier (workspace/org switcher) — kullanıcı net "hayır" dedi
- Billing ve licensing
- External broker integration
- Real-time collaboration (birden fazla kullanıcı aynı anda aynı sayfa)
- Template marketplace
- AI-assisted automation suggestion
- Query key ESLint rule (opsiyonel tooling)
- Preview analytics + semantic dedupe

---

## 7. Risk/Bağımlılık Zinciri (R2 için girdi)

**R3 IA önerisi gerektiriyor:**
- R2 benchmark sonuçları (pattern seçimi)
- R1 envanter (mevcut ekranlar)
- Senin onayladığın "tenant-scoped isolation + admin all-users" ilkesi

**R4 preview gerektiriyor:**
- R3 IA onayı (önce mimari, sonra görsel)
- Mevcut tema/tokens rehberi (değiştirilmeyecek)
- Hangi ekranların preview'e gireceği kısa listesi

**R5 yol haritası gerektiriyor:**
- R3 + R4 onayı
- Mevcut main commit history (F4'e kadar neyin üstüne inşa ediyoruz)
- Veri modeli değişiklikleri gerektiren iş kalemleri ayrımı

---

## 8. Değişiklik Kaydı (bu memory'nin kendi history'si)

| Tarih | Faz | Değişiklik |
|---|---|---|
| 2026-04-17 | R1 kapanış | İlk sürüm — ilkeler + R1 özet + yapılan/yapılmayan listeleri |
| 2026-04-17 | R2 kapanış | 9 platform × 7 kategori benchmark eklendi, 4-etiket tablosu, commit `16c93bc` |
| 2026-04-17 | R3 kapanış | Admin nav 32→27, user 12→15, 6 duplicate karar, surface/wizard canon, commit `b7c77a3` |
| 2026-04-17 | R4 kapanış | 4 yeni component + 5 sayfa evrim planı, preview dosya konumu, commit `8746047` |
| 2026-04-17 | R5 kapanış | 14 kalem / 4 kademe (P0/P1/P2/P3) yol haritası, effort/risk matrisi, R7 wizard ertelendi, R6 onay kapısı açık |
| 2026-04-17 | REV-2 kararı | Kullanıcı: "R6 kapısı kaldırılsın, 16 kalem tek dalgada bitsin, R7 ayrı faz olmasın, wizard dahil"; §1.5 çalışma kuralları + §1.6 plan tablosu + §5 yapılmayanlar bölümü + §2 faz tablosu güncellendi; R5 dosyası REV-2'ye alındı |
