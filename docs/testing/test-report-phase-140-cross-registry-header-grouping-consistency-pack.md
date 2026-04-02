# Test Raporu — Phase 140: Cross-Registry Header/Grouping Consistency Pack

## Tarih
2026-04-03

## Amaç
9 registry tablosu arasında başlık dili ve kavram tutarlılığını artırmak. Aynı PublicationOutcome kavramının farklı isimlerle gösterilmesi düzeltildi, İngilizce kalan son başlık Türkçeleştirildi.

## Gözden Geçirilen Registry Tabloları
1. SourcesTable (16 sütun)
2. SourceScansTable (13 sütun)
3. JobsTable (15 sütun)
4. NewsItemsTable (17 sütun)
5. UsedNewsTable (13 sütun)
6. TemplatesTable (14 sütun)
7. StyleBlueprintsTable (12 sütun)
8. StandardVideosTable (13 sütun)
9. NewsBulletinsTable (18 sütun)

## Yapılan Başlık Hizalamaları

| Tablo | Eski Başlık | Yeni Başlık | Sebep |
|---|---|---|---|
| SourceScansTable | Yayın Sonucu | Yayın Çıktısı | Sources, Templates, StyleBlueprints ile hizalama (aynı PublicationOutcome kavramı) |
| JobsTable | Yayın Sonucu | Yayın Çıktısı | Sources, Templates, StyleBlueprints ile hizalama (aynı PublicationOutcome kavramı) |
| NewsBulletinsTable | Enforcement | Uygunluk | İngilizce → Türkçe çevirisi |

## Bilerek Korunan Farklılıklar
- **SourcesTable'da "Oluşturulma" kolonu yok**: Entity'ye özgü, diğer tablolarla zorla hizalamaya gerek yok
- **Grup isimleri entity'ler arasında hafif farklı**: "Tarama & Hazırlık" vs "Hazırlık & İçerik" gibi farklar entity bağlamına uygun
- **"Yayın Verimi" (PublicationYield)**: Sadece Jobs ve SourceScans'ta var, farklı kavram olduğu için "Yayın Çıktısı"yla birleştirilmedi
- **"Çıktı Zenginliği" (OutputRichness)**: Jobs ve SourceScans'a özgü, entity-specific kavram
- **Badge stilleri**: Hiçbir badge stiline dokunulmadı

## Çalıştırılan Komutlar
- `npx vitest run`
- `npx tsc --noEmit`

## Test Sonuçları
- **Toplam:** 1093 test
- **Geçen:** 1093
- **Başarısız:** 0
- **tsc --noEmit:** 0 hata

## Bilerek Yapılmayanlar
- Badge stili değişikliği
- Backend değişikliği
- Raw kolon ekleme/silme
- Summary mantığı değişikliği
- Grup ismi zorla aynılaştırma (entity bağlamı korundu)
- Global design system refactor

## Riskler
- Yok. Sadece 3 header string değişikliği ve 1 test güncellemesi.
