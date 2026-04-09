# Faz 12 — Template Gallery + Preview-First Selection UX Raporu

## Executive Summary

Faz 12, template ve style blueprint secim akislarini preview-first hale getirdi. Mevcut 6+ preview component'i wizard akislarina entegre edildi, yeni MotionLevelPreview olusturuldu, kartlara gorsel onizleme ve version traceability eklendi. Bulletin wizard'a ilk kez stil secim adimi eklendi.

## Yeni Dosyalar

| Dosya | Aciklama |
|-------|----------|
| `src/components/preview/MotionLevelPreview.tsx` | Hareket seviyesi secici (low/medium/high), animasyonlu dot gostergesi |
| `tests/test_faz12_template_gallery_preview.py` | 10 backend test — template/blueprint gallery ve preview verisi |

## Degisen Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `src/components/preview/StyleBlueprintPreviewCard.tsx` | +Mini gorsel onizleme frame (16:9 mockup: renk paleti, motion dots, layout, altyazi). +Version trace badge footer'da. +`safeJsonParse` ve `MiniMotionDots` yardimci fonksiyonlar. |
| `src/components/preview/TemplatePreviewCard.tsx` | +Renk swatch bar + gradient (style_profile_json'dan). +Font gostergesi. +Version trace badge footer'da. +`safeJsonParse` yardimci. |
| `src/pages/user/CreateVideoWizardPage.tsx` | +LowerThirdStylePreview entegrasyonu (Step 3). +MotionLevelPreview entegrasyonu (Step 3). +`lower_third_style` ve `motion_level` state/payload alanlari. +Review adimina yeni alanlar eklendi. |
| `src/pages/user/CreateBulletinWizardPage.tsx` | +Yeni Step 2: Stil Secimi (StyleBlueprintSelector + LowerThirdStylePreview). +Stil parametreleri bulten wizard'a query param olarak iletiliyor. +Confirmation step guncellendi. |

## Preview-First Degisiklikler

### CreateVideoWizardPage — Step 3 (Stil Secimi)

Onceki durum:
- StyleBlueprintSelector (text-list kart)
- CompositionDirectionPreview (gorsel)
- ThumbnailDirectionPreview (gorsel)
- SubtitleStylePicker (gorsel)
- Video Format + Karaoke

Yeni eklenenler:
- **LowerThirdStylePreview** — 3 alt bant stili gorsel karti (broadcast/minimal/modern)
- **MotionLevelPreview** — 3 seviye animasyonlu secici (dusuk/orta/yuksek)

### CreateBulletinWizardPage — Yeni Step 2 (Stil Secimi)

Onceki durum: Kanal → Proje → Devam (stil secimi yok)

Yeni akis: Kanal → Proje → **Stil Secimi** → Devam
- StyleBlueprintSelector (news_bulletin scope)
- LowerThirdStylePreview

### StyleBlueprintPreviewCard Gorsel Gelistirme

Onceki: Sadece G/H/D/A/T harf kutucuklari + text ozet
Yeni: 16:9 mini mockup frame icerir:
- Renk paleti dots (visual_rules_json > color_palette)
- Motion seviye dots (motion_rules_json > motion_level)
- Layout yonu mockup cizgileri
- Altyazi bar mockup
- Harf kutucuklari korundu
- Text ozet 2 satira dusuruldu

### TemplatePreviewCard Gorsel Gelistirme

Onceki: Sadece aciklama veya JSON key tag'leri
Yeni: style_profile_json varsa:
- Renk swatch kutuculari + gradient bar
- Font stili gostergesi
- Aciklama/tag'ler korundu

### Version Traceability

Her iki kart footer'inda:
- `v{version}` mono badge
- Hover'da tarih bilgisi (updated_at)
- owner_scope / module_scope metadata

## Test Sonuclari

| Dosya | Test Sayisi | Sonuc |
|-------|-------------|-------|
| `tests/test_faz12_template_gallery_preview.py` | 10 | 10/10 PASSED |

Test listesi:
1. Template list returns active templates with version field
2. StyleBlueprint list returns active blueprints with version field
3. Template response includes style_profile_json for preview rendering
4. StyleBlueprint response includes all rule JSON fields
5. Template create preserves version for traceability
6. StyleBlueprint create preserves version for traceability
7. Template list filters by module_scope (gallery filtering)
8. StyleBlueprint list filters by module_scope (gallery filtering)
9. Template style_profile_json round-trip (color/font preview data)
10. StyleBlueprint rules JSON round-trip (visual preview data)

## TypeScript / Build

- `npx tsc --noEmit`: Hatasiz
- `npx vite build`: Basarili

## Basari Kriterleri Durumu

| Kriter | Durum |
|--------|-------|
| Template secimi preview-first | Kartlarda renk/font/gradient gorsel onizleme |
| Style/blueprint secimi text-list'ten cikti | Mini 16:9 mockup frame + renk paleti + motion dots |
| Alt bant, hareket seviyesi kor secilmiyor | LowerThirdStylePreview + MotionLevelPreview wizard'da |
| Preview ile final output ayrildi | Her preview'de "CSS onizleme — nihai cikti farkli olabilir" disclaimer |
| Preview'ler version ile traceable | v{version} badge + hover tarih, tum kartlarda |
| Admin tarafi korundu, user tarafi gorsel | Admin registry'ler ayni, user wizard'lar zenginlesti |

## Kalan Limitasyonlar

1. **Remotion render preview**: Tum preview'ler CSS mockup. Gercek Remotion ciktisi ile fark olabilir — disclaimer mevcut.
2. **Blueprint gorsel preview expand**: Kart icindeki mini frame tiklanarak buyutulmuyor. Gelecekte modal preview eklenebilir.
3. **Asset library connection**: Faz 12G (lightweight reuse) deferred — template/blueprint kartlari icinden asset linkage yok.
4. **Bulletin wizard stil iletimi**: Secilen stil query param ile admin wizard'a iletiliyor, admin wizard'in bunu okumasi henuz eklenmedi.
5. **AI-assisted style oneri**: AssistedComposer slot'u hazir, ama AI oneri hook'u deferred.

## Onceki Bilinen Test Sorunlari

- `test_m7_c1_migration_fresh_db`: Alembic modul yolu (Python 3.9)
- `test_create_rss_source`: 422 sema uyumsuzlugu
