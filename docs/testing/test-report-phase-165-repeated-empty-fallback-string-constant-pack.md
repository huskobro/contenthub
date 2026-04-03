# Test Report — Phase 165: Repeated Empty/Fallback String Constant Pack

**Tarih:** 2026-04-03
**Faz:** 165
**Başlık:** Repeated Empty/Fallback String Constant Pack

---

## Audit Özeti

Tüm frontend bileşen dosyaları fallback/empty string tekrarları açısından tarandı.

### Gerçek Extraction Fırsatları

| String | Dosya | Tekrar | Durum |
|---|---|---|---|
| `—` (JSX text) | NewsBulletinForm.tsx | 4 kez | ✅ Extraction yapıldı |
| `"—"` | TemplateStyleLinksTable.tsx | 2 kez | ⏭ Threshold altı (2 < 3) |
| `"—"` | StandardVideoArtifactsPanel.tsx | 2 kez | ⏭ Threshold altı |
| `"—"` | SourceForm.tsx | 2 kez (ternary içinde) | ⏭ Threshold altı |
| `"Bilinmiyor"` | Badge dosyaları (3 adet) | 3 kez | ⏭ Type + STYLES key + fallback — type/key'e dokunulmaz |
| `"Yok"` / `"Boş"` | Badge/Summary dosyaları | çeşitli | ⏭ Business logic string'ler, type union içinde |

---

## Yapılan Değişiklikler

### NewsBulletinForm.tsx
- `const DASH = "—"` eklendi (import bloğunun hemen sonrası)
- 4 adet `<option value="">—</option>` → `<option value="">{DASH}</option>`

---

## Atlanılan Dosyalar ve Gerekçeler

- **Badge dosyaları** (`"Bilinmiyor"`, `"Yok"`, `"Boş"` içerenler): Bu string'ler TypeScript type union tanımında ve STYLES lookup object key'lerinde kullanılıyor. Type/key'lere dokunmak behavior değişikliğine yol açar — Phase 165 kapsamı dışı.
- **2 tekrarlı dosyalar**: Threshold 3+ olduğundan extraction yapılmadı.
- **Ternary fallback'ler** (`{x || "—"}`): Conditional mantık, ham fallback string değil.

---

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz (0 hata) |
| vitest run | ✅ 127/127 test dosyası, 1587/1587 test geçti |
| vite build | ✅ Temiz |

---

## Dokunulmayanlar

- Badge type union string'leri
- STYLES nesne key'leri
- Görünüm, davranış
- Badge stilleri
- Backend
