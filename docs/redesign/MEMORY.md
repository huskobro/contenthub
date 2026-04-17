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

### 1.5 Çalışma Biçimi Kuralları (R2'den itibaren)
- Artık gereksiz onay bekleme
- R2 → R5 kesintisiz otomatik devam
- Her faz sonunda kısa 7 başlıklı rapor
- Büyük onay kapısı: **FAZ R6** (implementasyon başlangıcı)
- Her anlamlı iş = ayrı commit
- Her faz bu MEMORY.md'yi günceller

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
| R6 | Onaylı implementasyon | 🔒 Onay kapısı — kullanıcı seçecek | — | (R5'teki 14 kalemden 1-N tanesi) |
| R7 | Wizard birleştirme (ayrı faz — ertelendi) | ⏳ R6 sonrasına ertelendi | — | `docs/redesign/R7_wizard_unification.md` (planlandı, yazılmadı) |

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

## 5. Yapılmayanlar / Reddedilenler / Ertelenenler

### 5.1 Bu Turda Yapılmayacak (kullanıcı talimatı)
- Kod yazma — R6'ya kadar yok
- Main'e dokunma — R6 sonrası bile ayrı merge dalgasıyla yapılacak
- npm/pip install — onay gerekli
- Migration çalıştırma — onay gerekli
- Hardcoded çözüm — tüm öneriler Settings Registry üzerinden

### 5.2 Reddedilenler (kullanıcı net dedi)
- Workspace switcher (tekrarlıyorum: şimdilik yok)
- Org/team picker
- Enterprise karmaşası
- "Sıfırdan rastgele UI" — mevcut ürünün evrimi istenir

### 5.3 Bilinçli Ertelenenler (R6 sonrası belki)
- Surface kill-switch temizliği (F3 legacy fallback yeter)
- Vite bundle code-split (gzip 404 kB, localhost-first için bloke değil)
- Mobil / PWA (R3'te karar verilecek)
- Preview analytics + semantic dedupe
- Platform adapter registry (YouTube community post API 3rd party'e kapalı)

### 5.4 Bilinçli Korunacaklar
- `UserPublishEntryPage` scaffold (13 test bağlı)
- Surface mod varyantları legacy fallback (kullanıcı sürpriz görmez)
- Wizard çift-sayfa paradigması **şimdilik** (R3'te tek-motor + iki-shell kararı gelecek)

---

## 6. İleride İstenebilecekler (not olarak tutulur, şimdi yapılmaz)

- Mobil uygulama / PWA
- Multi-tenant enterprise tier (workspace/org switcher)
- Billing ve licensing
- External broker integration
- Real-time collaboration (birden fazla kullanıcı aynı anda aynı sayfa)
- Template marketplace
- AI-assisted automation suggestion

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
