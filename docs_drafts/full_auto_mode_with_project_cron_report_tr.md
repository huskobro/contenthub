# Full-Auto Mode + Project-Level Cron — v1 Rapor

## Mimari Kararlar

### Neden Global + Project-Level iki katman?
- **Global katman** (Settings Registry): tavan, guardrail, varsayılan. Admin tüm sistemi tek yerden kontrol eder.
- **Project katman** (ContentProject üzerinde 15 kolon): her proje kendi schedule, mode, policy, limitlerine sahip olabilir.
- Bu ayrım sayesinde admin "max 5 günlük çalıştırma" dediğinde hiçbir proje bunu aşamaz, ama her proje kendi cron'unu bağımsız tanımlayabilir.
- JSON policy yerine doğrudan kolonlar seçildi: SQLite'ta sorgu/filtreleme kolay, migration açık, type safety güçlü.

### Cron Scheduler nasıl kuruldu?
- In-process async background task (`poll_full_auto_projects`), `main.py` lifespan'da başlatılır.
- Default 60s poll interval (ayarlanabilir: `automation.scheduler.poll_interval_seconds`).
- Her tick'te: `automation_enabled=true` + `automation_schedule_enabled=true` + `next_run_at <= now` olan projeleri bulur.
- Her aday için guard evaluation çalıştırır → geçerse trigger, başarısızsa audit log.
- Duplicate fire koruması: aynı `scheduled_run_id` ile ikinci tetikleme reddedilir.
- Harici bağımlılık yok (APScheduler/Celery değil). Localhost-first prensibi korundu.

### Review Gate Precedence
- `automation_require_review_gate` varsayılan `true`.
- v1'de `publish_policy` ne olursa olsun, review gate açıksa üretim sonrası `pending_review` durumuna düşer.
- State machine kuralı: `review/security/state machine > publish policy`. Kod içinde bu sıra sabit, admin panelden değiştirilemez.

### Neden sadece standard_video?
- `automation.full_auto.allowed_modules` default `["standard_video"]`.
- news_bulletin pipeline farklı input gereksinimleri var (source scan, dedupe).
- İlk fazda stabil ve izlenebilir bir modülle başlayıp, sonra genişletme güvenli.

## Hangi Ekranlara Ne Eklendi

| Ekran | Eklenen |
|-------|---------|
| User ProjectDetail (legacy) | TabBar: "Genel" / "Otomasyon" — otomasyon sekmesinde ProjectAutomationPanel |
| Canvas ProjectDetail | Alt kısımda "Otomasyon" section, aynı panel |
| Atrium ProjectDetail | Alt kısımda "Otomasyon" section, aynı panel |
| Admin Automation Policies | Üstte SchedulerStatusCard (enabled/disabled, poll interval, son tick, bekleyen proje) |

### ProjectAutomationPanel İçeriği
1. Enable/disable toggle
2. Çalıştırma modu seçici: Manuel / Asistanlı / Tam Otomasyon
3. Zamanlama: cron ifadesi + canlı önizleme (sonraki 5 çalıştırma) + saat dilimi
4. Koruma ayarları: review gate, yayın politikası, hata davranışı, günlük limit
5. Durum: son/sonraki çalıştırma, bugünkü sayı
6. Eylemler: Denetle (dry-run guard check) + Şimdi Tetikle

## Guard'lar

1. Global kill switch (`automation.full_auto.enabled`)
2. Modül izin listesi (`automation.full_auto.allowed_modules`)
3. Proje toggle (`automation_enabled`)
4. Günlük limit — global ve proje bazlı
5. Eşzamanlı limit — kullanıcı ve proje bazlı (max 1)
6. Template/blueprint/channel gerekliliği
7. Duplicate fire koruması (scheduled_run_id)
8. Review gate — state machine tarafında zorunlu

## Test Sonuçları

| Test Seti | Sonuç |
|-----------|-------|
| Backend: test_full_auto_cron.py | 12/12 pass |
| Backend: test_full_auto_service.py | 9/9 pass |
| Frontend: tsc --noEmit | EXIT 0 |
| Frontend: npm run build | EXIT 0 |
| Frontend: sprint4 smoke test | 56/56 pass |

## Commit'ler

| Hash | Açıklama |
|------|----------|
| `80ebc2c` | Backend: service, router, scheduler, cron, schemas, migration, settings, tests |
| `c22abcd` | Frontend: hooks, ProjectAutomationPanel, CronPreviewDisplay, SchedulerStatusCard, 4 sayfa entegrasyonu |

Branch: `feature/full-auto-mode-with-project-cron`

## Invariant Doğrulama (Finishing Pass)

| # | Invariant | Durum | Kanıt |
|---|-----------|-------|-------|
| 1 | Review gate precedence publish policy'den üstte mi? | ✅ | `on_job_completed()` (service.py:402-407) publish_policy ne olursa olsun hiçbir zaman otomatik yayın yapmaz, her zaman draft kalır |
| 2 | Duplicate scheduler fire engelleniyor mu? | ✅ | `trigger_full_auto()` (service.py:262-276) aynı `scheduled_run_id` varsa "duplicate fire" ile reddeder |
| 3 | Global guardrail project-level override'ın üstünde mi? | ✅ | `evaluate_guards()` global kill switch'i (satır 111) proje toggle'ından (satır 135) önce kontrol eder; global kapalıysa proje açık olsa da bloklanır |
| 4 | Missed cron run davranışı: skip mi catch-up mi? | ✅ Catch-up | Scheduler stale `next_run_at` olan projeyi BİR KEZ tetikler, sonra `compute_next_run(now=utcnow)` ile bir sonraki zamana resync eder. Birden fazla kaçırılan fire biriktirilmez |
| 5 | blocked_by_policy sebepleri audit log'da okunur mu? | ✅ | Guard rejection'da violations listesi `write_audit_log()` ile `details_json`'a yazılır (service.py:281-294); her ihlal sebebi Türkçe okunur metin |

## Job Detail Rozetleri (Finishing Commit)

`JobOverviewPanel` ve `JobDetailPanel` bileşenlerine eklenen:

- **Çalıştırma Modu** rozeti: `Tam Otomatik` (yeşil) / `Asistanlı` (sarı) / `Manuel` (gri) + auto-advance bilgisi
- **Tetikleme Kaynağı** rozeti: `Zamanlanmış` (brand) / `Manuel Tetik` / `API` / `Yeniden Deneme` / `Admin` + scheduled_run_id kısa hash
- Backend `JobResponse` schema'ya 3 alan eklendi: `run_mode`, `auto_advanced`, `scheduled_run_id`
- Frontend `JobResponse` type'a aynı 3 alan eklendi

## Bilerek Defer Edilen

- news_bulletin full-auto desteği
- Otomatik konu seçme / A/B test
- Multi-platform full auto publish
- Dağıtık scheduler
- Visibility target (`panel:automation`) — şu an gereksiz, proje detay sayfası zaten mevcut visibility ile kontrollü
