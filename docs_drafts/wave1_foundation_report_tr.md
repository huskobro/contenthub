# Wave 1 — UI Etkileşim Temeli: Temel Katman Raporu

**Tarih:** 2026-04-05
**Kapsam:** Zustand store'lar, etkileşim hook'ları, UI primitive'leri, sidebar collapse, toast sistemi

---

## Özet

ContentManager'dan davranış referansı alınarak ContentHub mimarisine (inline CSS + tokens, React Query, Zustand) uygun şekilde sıfırdan inşa edilen Wave 1 temel katmanı tamamlandı.

**Hiçbir kod doğrudan kopyalanmadı. Tüm implementasyon ContentHub'ın mevcut design system'i ve mimarisi üzerine yazıldı.**

---

## Oluşturulan Yeni Dosyalar (13 dosya)

### Zustand Store'lar
| Dosya | Açıklama |
|---|---|
| `stores/uiStore.ts` | Sidebar collapse state + toast kuyruğu (FIFO, max 5, spam önleme) |
| `stores/keyboardStore.ts` | LIFO scope stack — klavye navigasyonu öncelik yönetimi |

### Etkileşim Hook'ları
| Dosya | Açıklama |
|---|---|
| `hooks/useDismissStack.ts` | ESC tuşu öncelik sistemi — sadece en üstteki handler çalışır |
| `hooks/useFocusRestore.ts` | Overlay kapatıldığında önceki focus'u geri yükler |
| `hooks/useRovingTabindex.ts` | WAI-ARIA roving tabindex — Arrow/Home/End/Enter desteği |
| `hooks/useScopedKeyboardNavigation.ts` | Scope yönetimi + roving tabindex birleştiren ana hook |
| `hooks/useToast.ts` | uiStore.addToast etrafında typed wrapper |
| `hooks/useSSE.ts` | EventSource wrapper + React Query invalidation entegrasyonu |
| `hooks/useAutoSave.ts` | toggle/select: anında, text/number: blur, textarea: 800ms debounce |

### UI Primitive'leri
| Dosya | Açıklama |
|---|---|
| `components/design-system/Sheet.tsx` | Sağdan kayan detay paneli — backdrop, ESC, focus trap, animasyon |
| `components/design-system/QuickLook.tsx` | Space ile tetiklenen ön izleme modalı + useQuickLookTrigger |
| `components/design-system/Toast.tsx` | ToastContainer — 4 tip, 4s auto-dismiss, aria-live |
| `components/design-system/ConfirmAction.tsx` | İki aşamalı silme onayı — 3s timeout ile otomatik reset |

### Test Dosyaları (6 dosya, 37 test)
| Dosya | Test Sayısı |
|---|---|
| `tests/stores/uiStore.test.ts` | 7 |
| `tests/stores/keyboardStore.test.ts` | 6 |
| `tests/components/Sheet.test.tsx` | 6 |
| `tests/components/QuickLook.test.tsx` | 5 |
| `tests/components/Toast.test.tsx` | 4 |
| `tests/components/ConfirmAction.test.tsx` | 6 |

---

## Değiştirilen Mevcut Dosyalar (4 dosya)

| Dosya | Değişiklik |
|---|---|
| `index.css` | 4 animasyon keyframe eklendi (sheetSlideIn, sheetFadeIn, quicklookScaleIn, toastSlideIn) |
| `components/layout/AppSidebar.tsx` | Collapse/expand desteği — uiStore entegrasyonu, daraltılmış mod UI'ı |
| `app/layouts/AdminLayout.tsx` | ToastContainer eklendi |
| `app/layouts/UserLayout.tsx` | ToastContainer eklendi |

---

## Test Sonuçları

```
npx tsc --noEmit  → 0 hata
npx vitest run    → 172 dosya, 2225 test GEÇTI (önceki: 166 dosya, 2188 test)
```

| Metrik | Önce | Sonra | Fark |
|---|---|---|---|
| Test dosyaları | 166 | 172 | +6 |
| Test sayısı | 2188 | 2225 | +37 |
| Başarısız | 0 | 0 | 0 |
| TypeScript hataları | 0 | 0 | 0 |

---

## Mimari Kararlar

1. **Zustand sadece minimum UI state** — Sidebar collapse + toast kuyruğu. React Query'ye dokunulmadı.
2. **LIFO scope stack** — Keyboard event'leri sadece en üstteki scope'a iletilir. Sheet açılınca tablo navigasyonu otomatik durur.
3. **Dismiss stack global array** — useDismissStack her instance için modül-seviyesi array'e push/pop yapar. React dışı, DOM event listener bazlı.
4. **Inline CSS + tokens** — Tailwind yok, Radix yok. Tüm stiller React.CSSProperties + tokens.ts'den.
5. **CSS keyframes** — Animasyonlar index.css'te tanımlandı (JS animation API yerine), daha performanslı ve SSR-friendly.
6. **Space isolation** — QuickLook capture-phase keydown listener kullanır, inner button tetiklenmesini önler.
7. **Auto-save field strategy** — 3 farklı strateji tek hook'ta birleştirildi, fieldType prop'u ile seçilir.

---

## Bilinen Sınırlamalar

1. **Sheet focus trap** — Tam focus trap implementasyonu yok (Tab tuşu ile panel dışına çıkılabilir). Wave 1 kapsamında yeterli, gerekirse ileride eklenir.
2. **Sidebar collapsed state persist** — localStorage'a kaydedilmiyor. Sayfa yenilenmesinde sıfırlanır. İstenirse eklenebilir.
3. **SSE hook** — Backend SSE endpoint'leri henüz mevcut olmadığı için entegrasyon testi yazılmadı. Hook hazır, endpoint geldiğinde bağlanacak.
4. **Sayfa entegrasyonları** — Hook'lar ve primitive'ler oluşturuldu ama henüz sayfalara (JobsRegistry, ContentLibrary vb.) entegre edilmedi. Bu bir sonraki adım.

---

## Sonraki Adımlar

1. **Pilot sayfa entegrasyonu** — JobsRegistryPage'e keyboard + Sheet + QuickLook bağlanması
2. **Diğer registry sayfalarına yayılma** — ContentLibrary, Sources, Templates, AuditLog
3. **JobDetailPage SSE** — useSSE ile canlı güncelleme
4. **SettingsRegistryPage auto-save** — useAutoSave entegrasyonu
5. **ConfirmAction** — Sources ve Templates sayfalarında silme butonlarına entegre
