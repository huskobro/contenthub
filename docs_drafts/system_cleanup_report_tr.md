# M33 Sistem Temizligi ve Veri Gorunurlugu Raporu

**Tarih:** 2026-04-06
**Kapsam:** Faz A–F (Veri Analizi, Siniflandirma, Temizlik, Filtreleme, Wizard Iyilestirme)
**Durum:** TAMAMLANDI

---

## Ozet

Sistem genelinde biriken test/demo veriler analiz edildi, siniflandirildi ve varsayilan gorunumlerden filtrelendi.
Hicbir veri silinmedi — tum test verisi `is_test_data=True` olarak isaretlendi ve liste endpointlerinde
varsayilan olarak gizlendi. Admin panelden `include_test_data=true` parametresiyle tum veri gorulebilir.

---

## Faz A — Veri Kaynak Analizi

### Wizard Haber Akisi

Wizard'da secilen haberler su sorguyla gelir:
```
GET /api/v1/news-items?status=new
→ SELECT * FROM news_items WHERE status='new'
```

**Tespit edilen sorunlar:**
- Kaynak trust/status bilgisi filtrelenmiyordu
- Test verisi ile gercek veri ayrimi yoktu
- Tum 3009 haber ornek URL'lerden geliyordu (`example.com/news/...`)

### Veritabani Durum Analizi (Temizlik Oncesi)

| Tablo | Toplam Kayit | Test Verisi | Gercek Veri |
|-------|-------------|-------------|-------------|
| news_sources | 1,537 | 1,536 | 1 (NTV Gundem) |
| news_items | 3,009 | 3,009 | 0 |
| news_bulletins | 3,262 | 3,262 | 0 |
| standard_videos | 1,815 | 1,815 | 0 |
| templates | 1,327 | 1,327 | 0 |
| style_blueprints | 1,212 | 1,212 | 0 |
| publish_records | 2,419 | 2,419 | 0 |
| publish_logs | 8,774 | — | — |
| jobs | 8,147 | 8,147 | 0 |
| used_news_registry | 1,059 | — | — |

**Sonuc:** Veritabanindaki tum icerik test/demo verisidir. Tek gercek kayit: "NTV Gundem" haber kaynagi.

### Orphan Analizi

| Kontrol | Sonuc |
|---------|-------|
| Selected items → bulletin FK | 0 orphan |
| Selected items → news item FK | 0 orphan |
| Bulletins → job FK | 0 orphan |
| News items → source FK | 101 orphan (source silinmis) |

### Test Verisi Patern Analizi

**news_sources:** `Test Source*` (808), `RSS Source*` (104), `Manual Source*` (104), `API Source*` (104), `Update Test*`, `List Test*`, `Filter Test*`, `Detail Test*`

**news_items:** `Breaking News*` (101), `Update*` (101), diger tumu `example.com` URL'li

**news_bulletins:** `Bulletin*`, `Breaking News*`, `Daily Tech Bulletin*`, `Detail*`, `Update*`, `Item*`, `List*`, `Filter*`, `M22 SQL Test NB`, `Library Test NB`

**standard_videos:** `Test Video*` (107), `Orijinal Video*` (46), `deneme` (1), geri kalan basliksiz

**templates:** `Test Template*` (420), `style-*` (105), `content-*` (105), diger `*Template*`

**style_blueprints:** `Test Blueprint*` (520), `Blueprint*` (659), `Linked Blueprint*` (33)

---

## Faz B — Veri Siniflandirma

### Siniflandirma Karar Matrisi

| Tablo | Karar | Yontem |
|-------|-------|--------|
| news_sources | ISARETLENDI (is_test_data=1) | Tum test paternleri |
| news_items | ISARETLENDI | Source FK + URL paterni (example.com) |
| news_bulletins | ISARETLENDI | Topic paterni + tumu test |
| standard_videos | ISARETLENDI | Title paterni + tumu test |
| templates | ISARETLENDI | Name paterni + tumu test |
| style_blueprints | ISARETLENDI | Name paterni + tumu test |
| publish_records | ISARETLENDI | Tum job'lar test → tum publish'ler test |
| jobs | ISARETLENDI | Tumu test (onceden is_test_data=0 idi) |
| settings | KORUNDU | Sistem ayarlari — temizlik kapsami disinda |
| visibility_rules | KORUNDU | Sistem gorunurluk kurallari |
| audit_logs | KORUNDU | Denetim kayitlari — silinmez |
| used_news_registry | KORUNDU | Referans butunlugu icin |

### Siniflandirma Kurallari
- **Silme YAPILMADI** — hicbir kayit silinmedi
- **Soft-archive yontemi**: `is_test_data=True` ile isaretleme
- **Iliski butunlugu korundu**: FK referanslar bozulmadi
- **Geri alinabilir**: Admin panelden `include_test_data=true` ile tum veri gorunur

---

## Faz C — Guvenli Temizlik Uygulamasi

### Alembic Migration: `e5f6a7b8c9d0`

**Eklenen kolon:** `is_test_data BOOLEAN NOT NULL DEFAULT 0` + index

**Eklenen tablolar:**
- standard_videos
- templates
- style_blueprints
- news_sources
- news_items
- news_bulletins
- publish_records

(Job tablosunda zaten mevcuttu — M31)

**Otomatik siniflandirma:** Migration icinde bulk UPDATE ile test verisi isaretlendi.
Ek siniflandirma migration sonrasi elle yapildi (example.com URL'ler, kalan paternler).

### Migration Zinciri
```
d4e5f6a7b8c9 (M32: wizard_configs)
    |
e5f6a7b8c9d0 (M33: is_test_data columns + classification)
```

---

## Faz D — Varsayilan Liste Davranisi

### Guncellenen Endpointler

Tum ana liste endpointleri `include_test_data: bool = False` parametresi aldi:

| Endpoint | Dosya |
|----------|-------|
| GET /api/v1/news-items | news_items/router.py, service.py |
| GET /api/v1/sources | sources/router.py, service.py |
| GET /api/v1/modules/news-bulletin | news_bulletin/router.py, service.py |
| GET /api/v1/jobs | jobs/router.py, service.py |
| GET /api/v1/modules/standard-video | standard_video/router.py, service.py |
| GET /api/v1/modules/templates | templates/router.py, service.py |
| GET /api/v1/modules/style-blueprints | style_blueprints/router.py, service.py |

**Davranis:**
- Varsayilan: test verisi gizli (`is_test_data=False` filtresi)
- `?include_test_data=true`: tum veri gorunur
- Tekil GET (by id) endpointleri etkilenmez

---

## Faz E — Wizard Veri Kaynak Iyilestirmesi

### Wizard Hata Duzeltmesi

**Sorun:** "Secimi Onayla" butonu hata veriyordu, kullaniciya bilgi gostermiyordu.

**Cozum:** 7 mutation'a `onError` handler eklendi:
- createBulletinMut → "Bulten olusturulamadi"
- addItemMut → "Haber eklenemedi"
- removeItemMut → "Haber kaldirilamadi"
- updateNarrationMut → "Anlatim guncellenemedi"
- confirmSelectionMut → "Secim onaylanamadi"
- consumeNewsMut → "Haber tuketimi basarisiz"
- updateBulletinMut → "Bulten guncellenemedi"

**Dosya:** `frontend/src/pages/admin/NewsBulletinWizardPage.tsx`

### Wizard Haber Filtreleme

News items list endpoint artik `is_test_data=False` filtresi uyguluyor.
Wizard'da haber secerken test haberleri varsayilan olarak gorunmeyecek.

### Wizard Config Seed

wizard_configs tablosu bos idi (0 satir). Seed scripti ile 2 wizard config eklendi:
- `news_bulletin` — Haber Bulteni Wizard (3 adim, 17 alan)
- `standard_video` — Standart Video Wizard (4 adim, 11 alan)

**Script:** `backend/scripts/seed_wizard_configs.py` (idempotent — tekrar calistirma guvenli)

---

## Faz F — Test Sonuclari

### Backend
| Kapsam | Sayi | Durum |
|--------|------|-------|
| M32 wizard config testleri | 27 | GECTI |
| M33 data cleanup testleri | 26 | GECTI |
| Full backend (M7 fresh DB haric) | 1418 | GECTI |
| Pre-existing M7 fresh DB | 1 fail | M33 ile ilgisi yok (system python alembic) |

### TypeScript
```
tsc --noEmit → 0 hata (temiz)
```

---

## Degismeyen Kurallar (Onaylandi)

- Hicbir veri silinmedi (soft-archive only)
- FK referans butunlugu korundu
- Settings, visibility_rules, audit_logs dokunulmadi
- 7-adim pipeline bozulmadi
- Core invariant'lar (language, trust) korundu
- Admin `include_test_data=true` ile tum veriye erisebilir
- Yeni kayitlar varsayilan olarak `is_test_data=False` ile olusturulur

---

## Bilinen Limitasyonlar

1. **publish_logs** ve **used_news_registry** tablolarina `is_test_data` eklenmedi — dogrudan listeleme endpointleri yok, parent (job/publish_record) uzerinden filtrelenir
2. **source_scans** tablosuna `is_test_data` eklenmedi — ayni sekilde source uzerinden filtrelenir
3. Mevcut 101 orphan news_item (source silinmis) test olarak isaretlendi ama source referansi geri gelmeyecek
4. "Secimi onayla" hatasinin kok nedeni (hangi HTTP hatasi donduruyor) kullanici tarafindan tekrar tetiklenip loglarda incelenmeli

---

## Dosya Degisiklikleri

### Backend
- `app/db/models.py` — 7 modele is_test_data eklendi
- `alembic/versions/e5f6a7b8c9d0_m33_...py` — Migration + bulk classification
- `scripts/seed_wizard_configs.py` — Wizard config seed scripti
- `tests/test_m33_data_cleanup.py` — 26 test
- 7x router.py + 7x service.py — include_test_data filtreleme

### Frontend
- `pages/admin/NewsBulletinWizardPage.tsx` — 7 mutation onError handler
