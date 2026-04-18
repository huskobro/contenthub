# ContentHub v1.0 — Release Notes

**Tarih:** 2026-04-18 (güncellendi; ilk yayın: 2026-04-09)
**Tip:** MVP Launch Release — REV-2 dalgası dahil

---

## Özet

ContentHub, localhost-first modüler içerik üretim ve yayınlama platformudur. Bu sürüm, tek makine üzerinde çalışan tam işlevli bir MVP'dir. REV-2 dalgası (19 P-item) 2026-04-18'de main'e merge edildi.

---

## İçerik Modülleri

### Standard Video (`standard_video`)
- Konu bazlı otomatik video üretimi
- Pipeline: Script (LLM) → Metadata → TTS → Altyazı → Görsel → Kompozisyon → Render
- Wizard + ileri mod desteği

### Haber Bülteni (`news_bulletin`)
- RSS/URL/API kaynaklardan gerçek haber toplama
- Dedupe koruması (hard + soft)
- Otomatik bülten script'i + TTS + render

### Ürün İnceleme (`product_review`)
- URL scraping (parser chain: site-specific + generic fallback)
- SSRF guard + robots.txt uyumu
- Tam pipeline: scrape → script → TTS → render → publish

---

## Admin Paneli

- **Settings Registry:** 204 yapılandırılabilir ayar, 16 grup
- **Visibility Engine:** Sayfa, widget, alan bazlı görünürlük kontrolü
- **Wizard Yönetimi:** Modül bazlı wizard yapılandırma + `AdminWizardShell` / `UserWizardShell`
- **İş Motoru:** Kuyruk, adım takibi, ETA, retry, recovery
- **Yayın Merkezi:** draft → review → approved → scheduled → published
- **Bildirim Merkezi:** Gerçek zamanlı SSE + backend notification
- **Bağlantı Merkezi:** YouTube OAuth, yetenek matrisi
- **Analytics:** Platform, içerik, operasyon, yayın metrikleri (gerçek veri)
- **Denetim Logu:** Tüm değişikliklerin kaydı
- **Prompt Assembly Engine:** Block-tabanlı, Settings Registry entegre

---

## Kullanıcı Paneli

- Dashboard (Özet + son işler + otomasyonlar)
- Content Calendar (3 view: liste / hafta / ay)
- Projeler listesi + proje detay
- Video, bülten, ürün inceleme oluşturma wizard'ları
- Yayın sayfası + kişisel işler
- Kişisel analitik ve kanal performansı
- Otomasyon yönetimi + Approver ataması
- Platform bağlantıları

---

## Teknik Özellikler

- **Backend:** FastAPI + SQLite WAL + Alembic (44+ migration)
- **Frontend:** React + Vite + TypeScript + Zustand + React Query v5
- **Auth:** JWT (access + refresh token), role-based (admin/user) — `require_admin` / `require_user` guards
- **Gerçek Zaman:** SSE
- **Render:** Remotion (`npx remotion render` gerçek subprocess)
- **TTS:** Microsoft Edge TTS (ücretsiz) + DubVoice (ElevenLabs sarmalı)
- **LLM:** Kie.ai (Gemini) + OpenAI uyumlu fallback
- **Görseller:** Pexels + Pixabay fallback
- **Kanal import:** `POST /channel-profiles/{id}/reimport` (Phase AD)

---

## Test Durumu (2026-04-18)

| Kontrol | Sonuç |
|---------|-------|
| Backend pytest (geniş) | ✅ 2547/2547 PASS |
| Frontend vitest (full) | ✅ 2670/2670 PASS |
| TypeScript `tsc --noEmit` | ✅ exit 0 |
| Vite build | ✅ exit 0 |
| Alembic fresh-DB | ✅ 10/10 PASS |

---

## Bilinen Sınırlamalar

| Alan | Durum | Not |
|------|-------|-----|
| Full-auto publish | Kasıtlı draft | `full_auto/service.py` v1 ALWAYS draft — auto-publish policy Phase AM'de |
| Approver enforcement | Kısmen | `approver_user_id` kolonu var; state machine zorlama Phase AM'de |
| `module.id.enabled` runtime | Declarative | UI toggle enforcement sonraki fazda |
| 3 wizard AdminWizardShell göçü | Kısmen | Dosyalar var; adapter wrap Phase AM'de |
| Vite bundle code-split | Ertelendi | 1.59 MB tek chunk; localhost-first için bloke değil |
| Theme persistence (DB'ye) | Ertelendi | Şu an localStorage; DB'ye taşıma Post-R6 |
| Otomasyon visual flow builder | Ertelendi | `@xyflow/react` + yeni tablo gerekli |
| Semantic dedupe (haber) | Ertelendi | Hard+soft var; embedding tabanlı CLAUDE.md "can come later" |
| Multi-tenant | Yok | Tek makine MVP — kalıcı CLAUDE.md kuralı |
| SSE auth | Yok | Localhost-only MVP kararı |
| YouTube Analytics admin guard | Backlog | Publish hardening'de |

Tüm açık kalemler: `docs/tracking/DEFERRED_BACKLOG.md`

---

## Upgrade

```bash
git pull origin main
cd backend
source .venv/bin/activate
pip install -e .
.venv/bin/python -m alembic upgrade head
cd ../frontend
npm install
npm run build
```
