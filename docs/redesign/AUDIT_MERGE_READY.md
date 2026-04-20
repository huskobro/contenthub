# REV-2 Dalgası — Seviye B Disiplin Audit (Merge-Ready Raporu)

> **Tarih:** 2026-04-18
> **Worktree:** `.claude/worktrees/product-redesign-benchmark`
> **Branch:** `worktree-product-redesign-benchmark` @ `6244764`
> **Base:** `origin/main` @ `33783e1`
> **Audit Seviyesi:** B (Disiplin Audit — ~1 saat)
> **Kod degisikligi:** yok (audit read-only). `git status` temiz.

---

## 0. Yonetici Ozeti

**KARAR: ⚠️ KOSULLU MERGE-READY.**

Dalgadaki 19 kalem (`P0.1 → P3.3 + REG`) teknik olarak tamamlandi. Frontend, tsc, build ve darmalanmis pytest kapilari tam yesil. **Tek koşul**: backend geniş pytest'te **2 bilinen M7 fresh-DB test sabiti kirildi** — bizim `phase_al_001` Alembic migration'imizi eklediğimiz için; bu kalıcı bir regresyon değil, 1-satir test sabit güncellemesi ile düzelir. User'ın global MEMORY'sinde zaten "M7 fresh DB ve 22 smoke test güncellenmeli" şeklinde **pre-existing known issue** olarak kayıtli — bu auditte ilk kez görülen bir kırılma değil, dalganın doğal bir side-effect'i.

**Merge kararı için seçenekler:**
1. Merge öncesi M7 sabitini güncelle (1 commit, ~2 dk, risksiz) → tamamen yeşil.
2. Mevcut haliyle merge et + M7 fix'i merge sonrası main'de yap.
3. Bekleyip P3.3 kalan 3 wizard göçünü de yap, sonra merge et. (ertelemeyi kapat)

Kullanıcının tercihini beklerim.

---

## 1. Ham Veri — Ne Merge Edilecek?

### 1.1 Boyut

| Metrik | Değer |
|---|---|
| `origin/main..HEAD` commit count | **52** |
| Değişen dosya | **99** |
| Insertions / deletions | **+12,863 / -420** |
| Yeni frontend bileşen | 11+ |
| Yeni hook | 2 (`useCurrentUser`, `useActiveScope`) |
| Yeni store | 1 (`adminScopeStore`) |
| Yeni Alembic migration | 1 (`phase_al_001`) |
| Yeni KNOWN_SETTINGS key | 6 |
| Yeni frontend test | +130 (P0.2 baseline 2540 → REG 2670) |

### 1.2 Commit Bileşimi

- **25 kod P-commit** (feat prefix veya P0.x/P1.x/P2.x/P3.x başlık)
- **22 docs-only SHA backfill** (MEMORY.md'ye commit SHA işleme pattern'i)
- **15 pre-wave R0-R5 dokümantasyon** (R1 delta-audit, R2 benchmark, R3 IA, R4 preview plan, R5 roadmap, REV-2 kararı)
- **1 REG kapanış + 1 SHA backfill**
- **1 MEMORY ilk sürüm**
- `git merge-tree --write-tree origin/main worktree`: **conflict yok** (in-memory 3-way merge temiz tree hash üretti).

### 1.3 Yeni KNOWN_SETTINGS Key'leri (6)

| Key | Group | Visibility | Kullanim |
|---|---|---|---|
| `user.calendar.default_view` | ui (calendar) | user-facing, user_override_allowed=True | Liste/Hafta/Ay varsayilan gorunumu |
| `publish.center.board_view.enabled` | publish | admin-only kill-switch | Board gorunumu etkinlestirici |
| `publish.center.default_view` | publish | user-facing | Tablo/Board default |
| `user.automation.flow_visual.enabled` | automation | admin-only kill-switch | SVG flow gorsel etkinlestirici |
| `automation.approver_assignment.enabled` | automation | admin-only, declarative | Approver atama (publish-gate yok) |
| `wizard.shell.v2.enabled` | wizard | admin-only, declarative | Shell v2 observability kaydi |

Hepsi `settings_resolver.py`'de full-shape (group/type/label/help_text/builtin_default/wired/wired_to) ile mevcut. ✅

---

## 2. Regresyon Kapilari (Gate Tablosu)

| Kapi | Sonuc | Detay |
|---|---|---|
| Frontend vitest (full) | ✅ **2670/2670 PASS** | 35 skipped, 232 dosya + 1 skip, 22.98s (REG run). P3.3 baseline (2670) korundu. |
| Frontend `tsc --noEmit` | ✅ **exit 0** | Tip güvenliği. |
| Frontend `vite build` | ✅ **exit 0** | 3.36s, main chunk 1.59 MB (uyari var — §5.2'de dokümante). |
| Backend dar pytest (wave-relevant 8 suite) | ✅ **140/140 PASS** | 21.09s. Approver migration, settings resolver, settings precedence, wizard configs, automation policies, digest, settings drift. |
| Backend **geniş** pytest (tüm suite) | ⚠️ **2545/2547 PASS + 2 FAILED** | 127.98s. 2 bilinen M7 fresh-DB test sabiti bizim `phase_al_001` migration'ı nedeniyle kırıldı — **aşağıda detay**. |
| Alembic fresh-DB (phase_al_001) | ✅ **6/6 PASS** | 5.60s. Upgrade/downgrade/re-upgrade/NULL default — hepsi geçti. |
| `git merge-tree` in-memory 3-way | ✅ **no conflicts** | Tree hash: `6b81109405...` |
| `git status` (worktree) | ✅ **temiz** | Uncommitted değişiklik yok. |

### 2.1 M7 Pre-Existing Test Kırılması (Detay)

**Dosya:** `backend/tests/test_m7_c1_migration_fresh_db.py:48`

```python
ALEMBIC_TARGET = "phase_ag_001"  # Artık "phase_al_001" olmalı
```

**Kırılan testler:**
- `test_h_alembic_version_is_target` — migrated DB version'i `ALEMBIC_TARGET` sabitine eşit olmalı; `phase_al_001` aldı, `phase_ag_001` bekledi.
- `test_i_downgrade_from_head_is_forward_only` — downgrade sonrası tekrar upgrade edince head'e dönüş kontrolü, aynı sabit üstünden kırılıyor.

**Sebep:** `phase_al_001` (P3.2 approver assignment) yeni head olduğu için M7 fresh-DB testi güncel değil. Bu **beklenen bir test guncellemesi**, kod değişikliği değil.

**Onceden biliniyor mu?**
- ✅ EVET. Kullanıcının global `MEMORY.md`'sinde `project_preexisting_test_failures.md` notu var: "M7 fresh DB ve 22 smoke test güncellenmeli". Bu auditin ilk kez karşılaştığı bir şey değil — dalganın normal bir yan etkisi.

**Fix efor:** 1 satır değişiklik (`"phase_ag_001"` → `"phase_al_001"`) + 1 commit. ~2 dk. Tamamen risksiz.

---

## 3. CLAUDE.md Non-Negotiable Kurallari — Uyum Taramasi

| Kural | Durum | Kanıt |
|---|---|---|
| Hidden behavior yok | ✅ | Yeni 6 KNOWN_SETTINGS key'i tamamen görünür; tüm eklenen davranış Settings Registry'de surface'li. |
| Parallel pattern yok | ✅ | P3.1 YouTubeCallback birleştirmesi **azaltıcı**; P3.3 `AdminWizardShell`/`UserWizardShell` mevcut `WizardShell`'i **wrap ediyor**, motor değişmedi; yeni `AnalyticsTabBar` **primitive `TabBar<T>` üstünde adapter**. Parallel-pattern rule aktif olarak korundu. |
| Prompt-as-string (hardcoded AI prompts) | ✅ | Yeni/değişmiş kod literal prompt içermiyor. Grep'te sıfır match (`system prompt` / `you are`). |
| Snapshot-lock invariant | ✅ | `backend/app/jobs/**` ve snapshot-lock kod yolları değişmedi. P3.3 shell'deki banner yalnizca **hatırlatma UI**'si. |
| Core invariants kod'da | ✅ | State machine (publish, job), pipeline order, review gate — hiçbiri settings-disableable değil. Yeni kill-switch'ler sadece UI görünüm katmanında (board view, flow SVG, wizard shell v2). |
| Every new feature ships settings surface | ✅ | 6 KNOWN_SETTINGS key'i 5'li checklist'ten geçti (key / admin visibility / prompt editor N/A / wizard governance N/A / module toggle). |
| `{module}.prompt.{purpose}` naming | ✅ | Bu dalgada hiç prompt eklenmediği için uygulanabilir değil; mevcut prompt'lara dokunulmadı. |
| No monolithic god-functions | ⚠️ **orta** | `UserCalendarPage.tsx` +118/-... (view toggle + 3 view render branch); `PublishCenterPage.tsx` +174/-... (board branch + filter paylasimi) — görece büyüdü ama her branch kendi fonksiyonunda. Acil refactor gerekli değil. |
| No premature SaaS/multi-tenant | ✅ | Admin/user isolation zaten mevcut pattern; yeni adminScopeStore tek-makine lokalinde çalışıyor. |
| Testable | ✅ | +130 yeni frontend test, 6 backend migration test (phase_al_001). |
| Traceable | ✅ | MEMORY.md §1.6 + §4.1 + §8 + REV-2 dokümanlari; her P-item'in commit SHA'si backfill'li. |

---

## 4. Dokumentasyon Tutarliligi

### 4.1 MEMORY.md İç Tutarlılık

| Kontrol | Beklenen | Gerçek |
|---|---|---|
| §1.6 plan tablosu satır sayısı | 19 | **19** ✅ |
| §1.6'de ✅ Tamam tally | 19 | **19** ✅ |
| §1.6'de ⏳ / 🟡 tally | 0 | **0** ✅ |
| §4.1 Commits listesi girdi sayısı | ≥35 | **35** ✅ |
| §8 Değişiklik Kaydı satırı | ≥25 | **25** ✅ |
| REG satırı §1.6'de | var | var (`3b85e61`) ✅ |
| REG satırı §8'de | var | var (2026-04-18) ✅ |

### 4.2 Bilinçli Erteleme Kayıtları

| Erteleme | Nerede kayıtlı | Değerlendirme |
|---|---|---|
| Backend geniş pytest | §8 REG girdisi | ✅ açıkça "MVP hardening fazına erteleniyor" dedi |
| Vite main chunk code-split | §5.2 | ✅ "Vite bundle code-split" MVP kapsam disi (kalici karar) |
| P3.3 kalan 3 wizard (NewsBulletinWizardPage admin 1409 LoC + CreateVideoWizardPage + CreateProductReviewWizardPage) | §8 P3.3 satırı | ✅ **2026-04-19 final-completion turunda 3'u de drop-in goc ettirildi** (1 satir import + 2 tag rename; prop sozlesmesi birebir uyumlu) |
| Mobile/PWA | §5.2 | ✅ |
| Semantic dedupe | §5.2 | ✅ |
| `module.id.enabled` runtime enforcement (P3.2/P3.3 declarative key'ler) | §8 P3.2 + P3.3 girdileri | ✅ deklaratif kill-switch sozlesmesi: anahtarlar `wired_to` ile izlenebilir; kapatma kapisi ihtiyac duydugunda tek-satir guard ile aktiflesir |

**Closure (2026-04-19):** P3.3 kalan 3 wizard final-completion turunda main üzerinde göçtü. Doc gap kapandi, merge-blocker yok.

---

## 5. Main Worktree Durumu (Merge'den Önce Dikkat)

Main worktree (`/Users/huseyincoskun/Downloads/AntigravityProje/ContentHub`) **uncommitted değişikliklerle dolu**:

```
 M CODE_AUDIT_REPORT.md
 M backend/data/contenthub.db  (WAL drift)
 M backend/data/contenthub.db-shm
 M backend/data/contenthub.db-wal
?? backend/data/contenthub.db.bak  (4 db backup variant)
?? CODE_AUDIT_REPORT_TR.md
?? .claude/worktrees/product-redesign-benchmark/ (= bu worktree gozuküyor)
```

**Merge öncesi temizlik önerisi:**
1. `backend/data/contenthub.db*` dosyaları **gitignore'da olmalı** (lokal DB, commit edilmemeli).
2. `CODE_AUDIT_REPORT*.md` — kullanıcı bunların ne olduğunu söylemeli (kalıcı audit? geçici?).
3. `.claude/worktrees/product-redesign-benchmark/` referansı — worktree silinmeden önce bu main'den görünmüyor olmalı.

Bunlar **REV-2 dalgasının sorumluluğu değil** — ama merge sırasında karışabilir. Merge öncesi kullanıcı main'i temizlemeli veya bu dosyaların commit edilmeyeceği seçilmeli.

---

## 6. Risk Listesi

| Risk | Seviye | Azaltma |
|---|---|---|
| M7 fresh-DB sabiti güncellenmemiş | **orta** (red pytest) | 1 satır fix + commit, merge öncesi veya sonrası |
| Main worktree uncommitted drift | **orta** | Merge öncesi user temizlemeli |
| Vite main chunk 1.59 MB | **düşük** | Localhost-first için bloke değil; §5.2'de dokümante |
| P3.3 kalan 3 wizard legacy'de | **kapali** | 2026-04-19 final-completion turunda 3'u de UserWizardShell/AdminWizardShell'e gocturuldu (drop-in 1 satir import + 2 tag rename) |
| `adminScopeStore` localStorage v=1 shape migrasyonu | **düşük** | Yeni key, eski client'ta sorun yok |
| Yeni approver_user_id kolonu NULL kalır | **dokumante** | NULL semantigi: "owner is approver" (publish-gate kontratinda owner_user_id approver olarak kabul edilir, kalici sozlesme) |
| `wizard.shell.v2.enabled` runtime switch yok (sadece gözlem) | **düşük** | §8'de declarative olarak net dokümante |

---

## 7. Merge Stratejisi Önerisi

### 7.1 Önerilen Pre-Merge Adımı (OPSİYONEL, tavsiye edilir)

**1 commit, ~2 dk:** M7 ALEMBIC_TARGET sabitini güncelle.

```diff
- ALEMBIC_TARGET = "phase_ag_001"
+ ALEMBIC_TARGET = "phase_al_001"
```

Dosya: `backend/tests/test_m7_c1_migration_fresh_db.py:48`. Bu tek satır fix, full pytest'i **2547/2547 PASS**'a çekerek merge'i tamamen yeşil yapar.

### 7.2 Önerilen Merge Yolu

**Seçenek A (güvenli, geleneksel):**
```
git checkout main
git pull origin main
git merge --no-ff worktree-product-redesign-benchmark
# -> 52 commit topolojisi korunur (bisect-friendly)
git push origin main
```

**Seçenek B (squash — tek commit):**
```
git checkout main
git pull origin main
git merge --squash worktree-product-redesign-benchmark
git commit -m "REV-2 dalgası (19 kalem) — product redesign benchmark"
git push origin main
```

**Ben A'yı öneriyorum** çünkü:
- P-item başına bisect imkânı değerli (MEMORY §1.5 single-commit-per-P-item disiplini)
- SHA backfill pattern'i main'de de iz bırakır (traceability)
- 52 commit main history'ye çok yük değil

### 7.3 Merge Sonrası

```
git worktree remove .claude/worktrees/product-redesign-benchmark
git branch -d worktree-product-redesign-benchmark       # lokal
git push origin --delete worktree-product-redesign-benchmark  # remote (isteğe bağlı)
```

---

## 8. Sonuç — 3 Liste (K8)

### 8.1 Merge Öncesi YAPILMALI (1 madde)
1. **M7 ALEMBIC_TARGET sabit güncellemesi** — `backend/tests/test_m7_c1_migration_fresh_db.py:48` → `"phase_al_001"`. Tek satır, tek commit. Merge'i tamamen yeşil yapar.

### 8.2 Merge Sırasında DİKKAT EDİLMELİ (2 madde — kapali)
1. ✅ Main worktree'deki uncommitted drift (DB dosyaları, CODE_AUDIT_REPORT*.md) merge'e karismadi.
2. ✅ `.gitignore` `backend/data/*.db*` kuralı housekeeping turunda hallediledi.

### 8.3 Final-Completion Closure (2026-04-19)
1. ✅ **Kalan 3 wizard göçü**: NewsBulletinWizardPage admin + CreateVideoWizardPage + CreateProductReviewWizardPage drop-in olarak Admin/UserWizardShell'e gocturuldu.
2. ⛔ **Vite bundle code-split**: MVP kapsam disi (kalici karar — localhost-first icin gzip ~574 kB kabul edilebilir).
3. ✅ **approver_user_id publish-gate kontrati**: NULL semantigi "owner is approver" olarak kalici sozlesme — `wired_to` kayitlari sayesinde davranis registry uzerinden izlenebilir.

---

**Kod değişikliği: yok (audit read-only).**

**`git diff --stat origin/main..HEAD` çıktısı**: 99 files, +12863/-420 — yukarıda §1.1'de detaylı.
**`git status` (worktree)**: temiz, working tree clean.
