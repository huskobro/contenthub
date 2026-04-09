# Faz 13 — Automation Policy + Checkpoint Model + Operations Inbox Foundation Raporu

## Executive Summary

Faz 13, kanal bazli otomasyon politikasi omurgasini, checkpoint bazli karar modelini ve Operations Inbox temelini kurdu. Her ChannelProfile icin 5 checkpoint (source_scan, draft_generation, render, publish, post_publish) uzerinden 3 modlu (disabled/manual_review/automatic) politika tanimlanabilir. Tam otomasyon acilmadi; saglam bir policy decision + future-safe execution omurgasi olusturuldu. Faz 12'den kalan bulletin style tuketim acigi kapatildi.

## Current Automation Audit Sonucu

Mevcut sistem tarandi:

| Akis | Durum | Otomasyon Uygunlugu |
|------|-------|---------------------|
| Publish flow | Enforced state machine, review gate aktif | publish_mode checkpoint'e baglanabilir |
| Job engine | Enforced state machine, waiting state mevcut | draft_generation + render checkpoint'lere baglanabilir |
| Source scan | Auto-scheduler (5dk polling) mevcut | source_scan_mode checkpoint'e baglanabilir |
| Comments | YouTube sync + reply_status tracking | post_publish checkpoint + inbox aday |
| Playlists | YouTube sync + CRUD | post_publish checkpoint + inbox aday |
| Posts | PlatformPost + EngagementTask | post_publish checkpoint + inbox aday |
| Draft generation | Manuel via wizard | draft_generation checkpoint'e baglanabilir |

## AutomationPolicy Domain Modeli

### Eski Model (Faz 2)
```
automation_level, cp_source_scan, cp_draft_generation, cp_render, cp_publish, cp_post_publish
(auto / review_required / disabled modlari)
```

### Yeni Model (Faz 13 V2)
```
owner_user_id, name, is_enabled
source_scan_mode, draft_generation_mode, render_mode, publish_mode, post_publish_mode
(disabled / manual_review / automatic modlari)
max_daily_posts, publish_windows_json, platform_rules_json
```

Migration: Alembic `faz13_automation_policy_v2_and_inbox` — eski kolonlar migrate edilip silindi.

### OperationsInboxItem Model
```
item_type, channel_profile_id, owner_user_id
related_project_id, related_entity_type, related_entity_id
title, reason, status (open/acknowledged/resolved/dismissed)
priority (low/normal/high/urgent), action_url, metadata_json
resolved_at
```

## Checkpoint Matrisi Nasil Modellendi

5 checkpoint, 3 mod:

| Checkpoint | disabled | manual_review | automatic |
|-----------|----------|---------------|-----------|
| source_scan | Elle tetiklenmeli | Inbox'e duser | Otomatik tarama |
| draft_generation | Elle olusturulmali | Inbox'e duser | Otomatik uretim |
| render | Elle render | Inbox'e duser | Otomatik render |
| publish | Elle yayin | Inbox'e duser | Otomatik yayin |
| post_publish | Elle islem | Inbox'e duser | Otomatik post-yayin |

`evaluate_checkpoint()` fonksiyonu:
- `should_proceed`: True sadece automatic mod'da
- `requires_review`: True sadece manual_review mod'da
- `reason`: Turkce aciklama metni

`policy_decision != execution_result`: Policy sadece karar verir, calistirma ayri.

## User/Admin Policy Yuzeyleri

### User Panel — `/user/automation`
- Kanal profili secimi (buton grubu)
- Politika yoksa olustur butonu
- is_enabled toggle
- Checkpoint matrisi: her checkpoint icin 3 mod butonu
- Operasyonel limitler (gunluk maks. yayin)

### Admin Panel — `/admin/automation`
- Tum politikalar tablosu
- Renk kodlu checkpoint dot matrisi (gri=disabled, sari=manual_review, yesil=automatic)
- Kanal profili + durum + max yayin bilgisi
- Legenda

## Operations Inbox Nasil Kuruldu

### Backend
- `OperationsInboxItem` model (SQLAlchemy)
- CRUD service: `list_inbox_items`, `create_inbox_item`, `update_inbox_item`, `count_open_inbox_items`
- Router: `GET /operations-inbox`, `POST /operations-inbox`, `GET /operations-inbox/count`, `PATCH /operations-inbox/{id}`
- Filtreleme: owner_user_id, channel_profile_id, status, item_type

### Frontend — `/user/inbox` + `/admin/inbox`
- Acik ogeler listesi (type badge, title, reason, priority, tarih)
- Aksiyonlar: Git, Coz, Kapat
- Cozulmus/kapatilmis ogeler collapsed section
- Admin: isAdmin=true ile tum ogeler gorunur
- User: sadece kendi ogeleri

### Desteklenen item_type'lar
- publish_review, comment_reply, playlist_action, post_action
- render_failure, publish_failure, source_scan_error

## Bulletin Preview/Style Closure (Faz 12 Gap)

### Sorun
CreateBulletinWizardPage'den secilen `lowerThirdStyle` ve `styleBlueprintId` query param olarak NewsBulletinWizardPage'e iletiliyordu, ama wizard bu parametreleri okumuyordu.

### Cozum
`NewsBulletinWizardPage.tsx`:
- `contextLowerThirdStyle = searchParams.get("lowerThirdStyle")` eklendi
- `contextStyleBlueprintId = searchParams.get("styleBlueprintId")` eklendi
- Initial state'ler bu degerlerden baslatiliyor: `useState(contextLowerThirdStyle ?? "broadcast")`
- Execution snapshot'a yansiyor: `lower_third_style` ve `style_blueprint_id` zaten submit payload'da var

## Degisen Dosyalar

### Backend — Yeni
| Dosya | Aciklama |
|-------|----------|
| `alembic/versions/faz13_automation_policy_v2_and_inbox.py` | Migration: AutomationPolicy V2 + OperationsInboxItem tablosu |
| `tests/test_faz13_automation_policy_inbox.py` | 10 test |

### Backend — Degisen
| Dosya | Degisiklik |
|-------|-----------|
| `app/db/models.py` | AutomationPolicy V2 (checkpoint mode alanlari, is_enabled, name, owner_user_id). OperationsInboxItem yeni model. |
| `app/automation/schemas.py` | V2 semalari: AutomationPolicyCreate/Update/Response, CheckpointDecision, InboxItemCreate/Update/Response |
| `app/automation/service.py` | V2 CRUD + `evaluate_checkpoint()` + `evaluate_all_checkpoints()` + Inbox CRUD + `count_open_inbox_items()` |
| `app/automation/router.py` | V2 endpoint'ler + `/by-channel/{id}` + `/{id}/evaluate` + inbox_router |
| `app/api/router.py` | operations_inbox_router registered |

### Frontend — Yeni
| Dosya | Aciklama |
|-------|----------|
| `src/api/automationApi.ts` | AutomationPolicy + OperationsInbox API tipleri ve fonksiyonlari |
| `src/pages/user/UserAutomationPage.tsx` | User otomasyon politika sayfasi |
| `src/pages/user/UserInboxPage.tsx` | User/admin operations inbox sayfasi |
| `src/pages/admin/AdminAutomationPoliciesPage.tsx` | Admin politika tablosu |
| `src/pages/admin/AdminInboxPage.tsx` | Admin inbox wrapper |

### Frontend — Degisen
| Dosya | Degisiklik |
|-------|-----------|
| `src/app/router.tsx` | +4 lazy import, +4 route (/user/automation, /user/inbox, /admin/automation, /admin/inbox) |
| `src/pages/admin/NewsBulletinWizardPage.tsx` | +contextLowerThirdStyle + contextStyleBlueprintId query param okuma |

## Test Sonuclari

| Dosya | Test Sayisi | Sonuc |
|-------|-------------|-------|
| `tests/test_faz13_automation_policy_inbox.py` | 10 | 10/10 PASSED |

Test listesi:
1. AutomationPolicy create with V2 fields
2. AutomationPolicy update checkpoint modes
3. Checkpoint mode validation (reject invalid modes)
4. Policy evaluation helper — disabled mode
5. Policy evaluation helper — manual_review mode
6. Policy evaluation helper — automatic mode
7. Operations Inbox item create
8. Inbox item status update + resolved_at auto-set
9. Inbox list filtering by owner_user_id
10. Policy by-channel + evaluate endpoint

## TypeScript / Build

- `npx tsc --noEmit`: Hatasiz
- `npx vite build`: Basarili

## Kalan Limitasyonlar

1. **Tam executor yok**: Policy karar verir, ama otomatik tetikleme executor'u bu fazda yok. Source scan auto-scheduler mevcut ama policy'ye baglanmadi.
2. **Inbox otomatik doldurma yok**: Inbox ogeleri simdilik manuel `POST /operations-inbox` ile olusturuluyor. Publish review, render failure vb. olaylarda otomatik olusturma hook'u sonraki fazda eklenecek.
3. **Policy history/audit**: Policy degisiklikleri audit_log'a yazilmiyor. Gelecekte audit trail eklenebilir.
4. **Publish windows**: `publish_windows_json` alani var ama parser/enforcer yok.
5. **Platform-specific rules**: `platform_rules_json` alani var ama YouTube-specifik kural seti tanimlanmadi.
6. **Admin policy editing**: Admin tablosu read-only. Admin'den policy duzenleme icin detail page gerekecek.
7. **SSE inbox notification**: Inbox count degisikliginde SSE event broadcast yok.

## Onceki Bilinen Test Sorunlari

- `test_m7_c1_migration_fresh_db`: Alembic modul yolu (Python 3.9)
- `test_create_rss_source`: 422 sema uyumsuzlugu
