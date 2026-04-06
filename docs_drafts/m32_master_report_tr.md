# M32 Master Rapor — Wizard Governance + Preview-First UX

**Tarih:** 2026-04-06
**Kapsam:** Faz EK-1 ile EK-5
**Durum:** TAMAMLANDI

---

## Ozet

M32, tum wizard sistemlerini admin-managed, preview-first ve gercek pipeline'a bagli hale getirir.
Sahte/pasif parametreler kaldirilir veya gercek wiring verilir.
News bulletin wizard akisi YTRobot-v3 mantigi referans alinarak iyilestirilir.

---

## Faz EK-1 — Preview-First Kurali

### Gerceklestirilen Onizleme Iyilestirmeleri

| Alan | Onceki | Sonraki | Aciklama |
|------|--------|---------|----------|
| subtitle_style | Duz buton | SubtitleStylePicker (CSS preview) | Gercek preset renkleri gosterilir |
| lower_third_style | Duz buton | LowerThirdStylePreview (CSS preview) | 3 stil gorsel olarak preview edilir |
| render_mode | Duz buton | Buton + etki aciklamasi | Her modun ne uretecegi yazilir |
| trust_enforcement_level | Duz buton | Buton + trust check sonucu | Gercek trust check API'den gosterilir |
| composition_direction | Cosmetic preview | Honest label | "Duzenleme yonu gorseli" ifadesi |
| thumbnail_direction | Cosmetic preview | Honest label | "Thumbnail yonu gorseli" ifadesi |
| style_blueprint | Metadata card | Metadata card (korundu) | JSON badge display — gercek |
| template_id | Metadata card | Metadata card (korundu) | Template data display — gercek |

### Preview Dogruluk Etiketi

Cosmetic preview'lar artik "onizleme" degil "yon gorseli" olarak etiketleniyor.
Kullaniciya yaniltici son cikti vaadi verilmiyor.

---

## Faz EK-2 — Sahte/Pasif Parametre Auditi

### Wizard Alan Matrisi — News Bulletin

| Alan | Adim | Backend'e Yazilir | Snapshot'a Girer | Pipeline Etkiler | Preview | Karar |
|------|------|-------------------|------------------|------------------|---------|-------|
| topic | source | Evet | Evet | Evet | Hayir | KORUNDU (auto-suggest eklendi) |
| title | source | Evet | Hayir | Hayir | Hayir | KALDIRILDI (metadata LLM uretecek) |
| brief | source | Evet | Hayir | Hayir | Hayir | KALDIRILDI (metadata LLM uretecek) |
| language | source | Evet | Evet | Evet | Hayir | KORUNDU (core invariant) |
| tone | source | Evet | Evet | Evet | Hayir | KORUNDU |
| duration | source | Evet | Evet | Evet | Hayir | KORUNDU |
| news_selection | source | Evet | Evet | Evet | Hayir | KORUNDU (one basa cikti) |
| edited_narration | review | Evet | Evet | Evet | Hayir | KORUNDU |
| render_mode | style | Evet | Evet | Evet | Etki aciklamasi | KORUNDU + preview eklendi |
| subtitle_style | style | Evet | Evet | Evet | CSS preview | KORUNDU + preview eklendi |
| lower_third_style | style | Evet | Evet | Evet | CSS preview | KORUNDU + preview eklendi |
| trust_enforcement_level | style | Evet | Evet | Evet | Trust check | KORUNDU (core invariant) |
| composition_direction | style | Evet | Evet | Hayir* | Yon gorseli | KORUNDU (honest label) |
| thumbnail_direction | style | Evet | Evet | Hayir* | Yon gorseli | KORUNDU (honest label) |
| style_blueprint_id | style | Evet | Evet | Evet | Metadata card | KORUNDU |
| template_id | style | Evet | Evet | Evet | Metadata card | KORUNDU |

*composition_direction ve thumbnail_direction snapshot'a yazilir, ileride Remotion template selection'da kullanilacak.

### Kaldirilan Alanlar

- **title**: Step 0'dan kaldirildi. Metadata LLM asamasinda uretilecek.
- **brief**: Step 0'dan kaldirildi. Metadata LLM asamasinda uretilecek.

Bu iki alan backend entity'de korunuyor (kaldirmiyoruz) — sadece wizard'da erken zorunlu girdi olmaktan cikarildi.

---

## Faz EK-3 — Admin Wizard Ayarlari Sayfasi

### Yeni Sayfa: `/admin/wizard-settings`

Admin panelde yeni "Wizard Ayarlari" sayfasi:
- Tum wizard tipleri listelenir (news_bulletin, standard_video)
- Her wizard icin: acik/kapali durumu, adim sayisi, version
- Detay editoru: her adimi genisletip alanlari yonetme
- Alan bazinda: gorunurluk, zorunluluk, preview, varsayilan deger
- Admin-hideable=false olan alanlar kilitli gosterilir (core invariant)

### Backend: WizardConfig Modeli

**Tablo:** `wizard_configs`
- `wizard_type`: unique key ("news_bulletin", "standard_video")
- `display_name`: gosterim adi
- `enabled`: wizard aktif mi
- `steps_config_json`: JSON — adim ve alan tanimlari
- `field_defaults_json`: JSON — varsayilan degerler
- `version`: degisiklik izleme
- `status`: active / inactive

**API:** `/api/v1/wizard-configs`
- CRUD + wizard_type ile arama
- Audit log entegrasyonu

**Migration:** `d4e5f6a7b8c9` (down_revision: c3d4e5f6a7b8)

---

## Faz EK-4 — News Bulletin Wizard Akis Iyilestirmesi

### Onceki Akis (Step 0)
1. Kullanici topic yazar (zorunlu)
2. Bulletin olusturulur
3. Kullanici haber secer

### Yeni Akis (Step 0 — news-first)
1. Kullanici dogrudan haber listesini gorur
2. Haberleri secer (local state)
3. Ilk haber secildiginde topic otomatik onerilir (haber basligi)
4. Kullanici topic'i duzenleyebilir
5. "Bulten Olustur" butonu: bulletin yaratir + secilen haberleri ekler
6. Title ve brief wizard'da sorulmaz (metadata LLM uretecek)

### Neden Degisti
YTRobot-v3 urun mantigi referans alindi:
- Kullanici once ne uretecegini (haberler) secer
- Sonra nasil uretecegini (stil, mod) secer
- Form doldurmaya bogma azaltildi
- "Source → draft → render" akisina yakinlasildi

---

## Faz EK-5 — Wizard Parametre Modeli

Seed datada tam alan matrisi:
- Her alan icin: field_key, field_type, required, visible, admin_hideable, auto_suggest, preview_enabled, default_value, writes_to_backend, affects_snapshot, affects_pipeline
- Admin bu matrisi WizardSettingsPage'den gorebilir ve yonetebilir
- Core invariant'lar (language, trust_enforcement_level) admin_hideable=false

---

## Test Sonuclari

### Backend
| Kapsam | Sayi | Durum |
|--------|------|-------|
| M32 wizard config testleri | 27 | GECTI |
| Full backend | 1392 | GECTI |
| Pre-existing M7 | 2 fail | M32 ile ilgisi yok |

### Frontend
| Kapsam | Sayi | Durum |
|--------|------|-------|
| Bulletin smoke tests (6 dosya) | 57 | GECTI |
| Full frontend | 2301 | GECTI |
| Pre-existing localStorage | 17 fail | M32 ile ilgisi yok |

### TypeScript
```
tsc --noEmit → 0 hata (temiz)
```

---

## Alembic Migration Zinciri

```
a1b2c3d4e5f6 (M29)
    |
b2c3d4e5f6a7 (M30)
    |
c3d4e5f6a7b8 (M31)
    |
d4e5f6a7b8c9 (M32: wizard_configs)
```

---

## Degismeyen Kurallar (Onaylandi)

- 7-adim pipeline korundu
- Backend entity modeli bozulmadi (NewsBulletin.topic hala zorunlu)
- Settings snapshot modeli bozulmadi
- YTRobot-v3'ten kod kopyalanmadi — sadece UX akisi referans alindi
- Core invariant'lar (language, trust) admin panelden gizlenemez
- Safe composition mapping korundu
- Wizard governance settings registry ile uyumlu ama ayri tablo (hierarchical data)
