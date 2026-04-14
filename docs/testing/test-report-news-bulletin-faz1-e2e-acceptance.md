# News Bulletin — FAZ 1 E2E Pipeline Acceptance Test Report

**Tarih:** 2026-04-14
**Modül:** `news_bulletin`
**Amaç:** Uçtan uca pipeline'ın gerçekten çalıştığını kanıtlamak
**Kapsam:** Sadece `combined` render mode; publish adapter dışı; multi-render yok

## 1. Test Verisi

### Test Bülteni
- **ID:** `c4dffac8-49ab-4d59-adac-20ceee4d11ea` (rollback ile silindi)
- **Başlık:** `FAZ1 E2E Acceptance Test`
- **Topic:** `Teknoloji Gundemi - FAZ1 E2E Test`
- **Dil/Ton:** `tr` / `formal`
- **Target duration:** 30 sn
- **Render mode:** `combined`
- **Trust enforcement:** `warn`

### Seçilen 3 Haber (tech, görseli olan)
| Sıra | News Item ID | Başlık |
|---|---|---|
| 0 | `27ac22d8-0d7f-4acd-b7d5-ca591f326ffb` | Gecikme iddialarına son: Katlanabilir iPhone Fold, iPhone 18 Pro ile geliyor |
| 1 | `ec36c9e9-c76c-40af-9a05-0a36b681e6d4` | Dünyanın en ince otomobili! Görenler gözlerine inanamıyor |
| 2 | `5849fd69-64c8-4464-bed3-8e5049bbc0b7` | Samsung'dan sürpriz hamle: Galaxy S27, S27 Plus ve S27 Ultra'ya 'kardeş' geliyor |

## 2. Pipeline Akışı

### Editorial Gate
- `draft` → `confirm-selection` → `selection_confirmed`
- `consume-news` → `in_progress`
- `start-production` → job başladı (job_id `0f29b008-e43c-4a20-a848-c94db55a69ab`)

### 7 Step Sonuç
| # | Step | Status | Elapsed | Artifact |
|---|---|---|---|---|
| 1 | script | completed | 30.8s | `bulletin_script.json` — 3 items, provider=kie_ai_gemini_flash |
| 2 | metadata | completed | 37.5s | `metadata.json` — title/description/tags |
| 3 | tts | completed | 9.6s | `audio_manifest.json` + 3 mp3 — edge_tts, tr-TR-AhmetNeural, 852 char, ~65s |
| 4 | subtitle | completed | 5.1s | `subtitles.srt` + `word_timing.json` — 3 segment, whisper_word timing |
| 5 | composition | completed | 0.3s | `composition_props.json` — NewsBulletin, combined, 3 items, 75.54s |
| 6 | render | completed | 139.0s | `output.mp4` — 21.85 MB, 77.59s, 1920x1080@60fps, H.264+AAC |
| 7 | publish | skipped | — | operator_confirm idempotency (adapter yok, beklenen) |

**Toplam süre:** ~206 saniye (3.4 dk)

## 3. output.mp4 Doğrulama

```
file: /workspace/0f29b008-.../artifacts/output.mp4
size: 21,856,470 bytes (21.85 MB)
format: ISO Media, MP4 Base Media v1 [ISO 14496-12:2003]
duration: 77.589333 s
video: h264, 1920x1080, 60/1 fps
audio: aac
bit_rate: 2,253,554 bps
```

## 4. Artifact Serving

- `GET /api/v1/jobs/{id}/artifacts` → 10 artifact listelendi (mp4, json, srt)
- `GET /api/v1/jobs/{id}/artifacts/output.mp4` → `200 OK`, `video/mp4`, `206 Partial Content` range desteği çalışıyor
- İlk 512 byte → geçerli ISO MP4 header

## 5. Preview Zinciri

- `GET /api/v1/jobs/{id}/content-ref` → bülten linki döndürüyor ✅
- Bülten detay sayfasından `job_id` üzerinden artifact'a erişim mümkün ✅
- **Dashboard preview (content_project.active_job_id → job chain):** Bağlantı yok — news_bulletin `content_projects`'a otomatik bağlanmıyor. Bu ayrı bir bug (bkz. Bulunan Buglar).

## 6. Publish Step

- Status: `skipped`
- Idempotency type: `operator_confirm`
- Bu davranış pipeline tanımına uygun (publish adapter FAZ 2 kapsamında)

## 7. Bulunan Buglar

### Bug #1 — Düşük öncelik (display)
`GET /api/v1/jobs/{id}` endpoint response'unda `artifact_refs` alanı boş obje olarak dönüyor.
DB'de `job_steps.artifact_refs_json` tamamen dolu ama serialize edilmemiş. Job detail sayfasında artifact görünümünü bozabilir.

### Bug #2 — Düşük öncelik (render warning)
Render step log'unda: `total_duration_seconds geçersiz — fallback (60.0s) kullanıldı`.
Composition'da `total_duration_seconds=75.54` var ama render executor'a props gelirken okunamamış. Gerçek çıktı süresi 77.59s, yani render yine doğru çalıştı ama fallback path kullanıldı. Composition → render veri akışında bir field naming uyuşmazlığı.

### Bug #3 — Orta öncelik (preview chain)
News bulletin job'ları `content_projects` tablosuna otomatik bağlanmıyor (`content_project_id = NULL`, `active_job_id = NULL`). Standard_video'da `active_job_id` dashboard preview için kullanılıyordu. News bulletin dashboard preview'ı için ya aynı linkage eklenmeli ya da bülten kendi preview kanalı ile entegre edilmeli.

### Bug #4 — Kozmetik (schema display)
Bülten detay response'unda `selected_news_count=0` gösteriyor, oysa gerçekte 3 selection var (confirmed_count=3 dönüyordu). Field aggregation'da race condition veya yanlış join.

## 8. Rollback

Full rollback transaction ile gerçekleştirildi:

| Tablo | Silinen/Geri alınan |
|---|---|
| notification_items | 1 |
| operations_inbox_items | 1 |
| audit_logs | 4 |
| prompt_assembly_block_traces | 9 |
| prompt_assembly_runs | 1 |
| used_news_registry | 3 |
| news_items (status: used→new) | 3 |
| news_bulletin_selected_items | 3 |
| job_steps | 7 |
| jobs | 1 |
| news_bulletins | 1 |
| **Workspace klasörü** | 22 MB silindi |

Doğrulama sonrası: tüm sorgular 0 döndürdü, 3 news_item tekrar `new` durumunda. DB temiz, workspace temiz.

## 9. Test Sonucu

**PASS** — News bulletin pipeline'ı 7 step tam, `combined` render mode'da gerçek `output.mp4` üretiyor. Artifact serving ve job-level content-ref çalışıyor.

**Kalan iş (FAZ 2+ için):**
- Bug #1 — job response'unda artifact_refs serializer düzelt
- Bug #2 — composition→render duration field uyumu
- Bug #3 — news_bulletin dashboard preview için content_project linkage kararı
- Bug #4 — selected_news_count aggregation fix
- Publish adapter (FAZ 2)

## 10. Sınırlamalar

- Sadece `combined` mode test edildi. `per_category` ve `per_item` test edilmedi (kapsam dışı).
- Frontend (admin detail sayfası, dashboard preview) tarayıcıda manuel görsel doğrulama yapılmadı — sadece API seviyesinde zincir doğrulandı.
- Browser'da gerçek video oynatma smoke testi yapılmadı (artifact serving HTTP seviyesinde doğrulandı).
