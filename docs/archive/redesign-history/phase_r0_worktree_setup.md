# Faz R0 — Worktree / Branch Kurulum Raporu

**Tarih:** 2026-04-17
**Amaç:** Rakip analizi destekli ürün sadeleştirme / UX iyileştirme dalgası için izole bir çalışma alanı açmak. Main'e dokunmadan keşif → benchmark → IA → preview planı → uygulama yol haritası sırasıyla ilerleyebilmek.

---

## 1. Worktree Kurulumu

| Alan | Değer |
|---|---|
| **Worktree path** | `/Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/.claude/worktrees/product-redesign-benchmark` |
| **Branch adı** | `worktree-product-redesign-benchmark` |
| **Başlangıç commit (SHA)** | `33783e185e672181af5f6f594a11f1a8ac7fa984` — *"Merge Phase Final F4 — deferred items closure + merge-ready gate"* |
| **Kısa SHA** | `33783e1` |
| **Taban branch** | `main` (aynı commit) |
| **Remote durum** | Local-only (henüz push edilmedi; ilk anlamlı commit ile origin'e iletilecek) |

## 2. Main ile Divergence Durumu

- `git rev-parse HEAD` → `33783e185e672181af5f6f594a11f1a8ac7fa984`
- `git rev-parse origin/main` → `33783e185e672181af5f6f594a11f1a8ac7fa984`
- **Divergence: 0 commit ileri / 0 commit geri.**
- Working tree temiz (`nothing to commit, working tree clean`).
- Bu worktree, main'in Phase Final F4 merge sonrası durumunu **birebir** miras alır; F1→F4 boyunca kapatılan tüm kapılar (ownership guard, admin-only, settings drift, automation digest, theme force-hydrate, scaffold relocation, posts TODO) bu dalda da mevcut ve korunacaktır.

## 3. Bu Dalın Sözleşmesi (Non-Negotiable)

1. **Main'e dokunulmayacak.** Tüm çalışma bu worktree'de.
2. **R0 → R5 arası hiç kod değişikliği olmayacak** (yalnızca `docs/*.md` Türkçe raporlar).
3. **R6 (gerçek kod) senin açık onayına kadar başlamayacak.**
4. CLAUDE.md'deki tüm non-negotiable kurallar korunur: Settings Registry otoritesi, backend authority, ownership enforcement backend'de, React Query/Zustand ayrımı, FastAPI + SQLAlchemy katman düzeni, Remotion safe composition mapping, tema/design-tokens sistemi, no hidden settings.
5. F4 zincirinin hiçbir kazanımı geri alınmayacak — üstüne inşa edilecek.
6. Ağır yeni npm kütüphanesi (özellikle flow/canvas) **önce gereklilik kanıtı**, sonra tartışılır.
7. Hardcoded çözüm yok — her davranış Settings Registry / Visibility / Ownership üstünden akacak.

## 4. Faz Planı (Yol Haritası)

| Faz | Başlık | Çıktı | Kod? |
|---|---|---|---|
| **R0** | Worktree/branch kurulum | Bu rapor | ❌ |
| **R1** | Repo Reality Audit | Türkçe kod-gerçeği raporu (F4 sonrası delta odaklı) | ❌ |
| **R2** | Rakip Analizi / Pattern Benchmark | 9 platform × 7 kategori matris + ilk 15 uyarlanabilir pattern | ❌ |
| **R3** | Yeni Bilgi Mimarisi (IA) | Eski → yeni ekran eşleme tablosu + navigation önerisi | ❌ |
| **R4** | Preview / Prototype Planı | Hangi `_scaffolds/` altında, hangi component ağacı, hangi mock kontratı — yazılı plan | ❌ |
| **R5** | Uygulama Yol Haritası | Risk/bağımlılık/test/efor/sıra tabloları | ❌ |
| **R6** | Onay Sonrası Uygulama | Senin seçtiğin parça için gerçek kod | ✅ (yalnızca onayla) |

## 5. Kontrat Satırları

```
code change:         no
migrations run:      no
packages installed:  no
db schema mutation:  no
db data mutation:    no
main branch touched: no
```

## 6. Sonraki Adım

**Faz R1 — Repo Reality Audit.**
- Phase AK + AL audit raporları taban olarak alınacak (tekrar sıfırdan yazılmayacak).
- F2 ownership + F3 release readiness + F4 closure delta'sı eklenecek.
- Admin/user navigation truth source, automation akışı, publish/calendar/analytics/assets akışı, wizard vs standalone çakışması, surface varyantları (canvas/atrium/bridge/horizon/legacy) gerçek-değer analizi.
- "Korunmalı / Basitleştirilmeli / Birleştirilmeli / Test-only" tabloları dosya:satır kanıtlarıyla.
- Çıktı: `docs/phase_r1_repo_reality_audit.md`.
