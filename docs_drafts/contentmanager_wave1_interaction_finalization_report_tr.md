# ContentHub — Wave 1 Etkilesim Finalizasyonu Raporu (Sheet / QuickLook / Keyboard)

**Tarih:** 2026-04-05
**Kapsam:** Wave 1 Final — Sheet, Overlay ve Klavye Etkilesim Sistemleri
**Durum:** TAMAMLANDI

---

## 1. Ozet

Wave 1 Final kapsaminda Sheet paneli, overlay yonetimi ve klavye etkilesim alt-sistemleri finalize edildi. Focus trap, dismiss stack, keyboard scope yonetimi ve "/" arama kisa yolu production-ready duruma getirildi.

---

## 2. Sheet Bileseni Finalizasyonu

### 2.1 Genel Bakis

Sheet, sag taraftan kayan detay paneli olarak calisan bir overlay bilesendir. Sayfa baglamini terk etmeden oge detaylarini goruntulemek icin kullanilir.

**Konum:** `src/components/design-system/Sheet.tsx`

### 2.2 Ozellikler

| Ozellik | Durum | Aciklama |
|---------|-------|----------|
| Sag'dan kayma animasyonu | TAMAMLANDI | CSS transition ile slide-in |
| Backdrop overlay | TAMAMLANDI | Tiklandiginda Sheet'i kapatir |
| ESC ile kapatma | TAMAMLANDI | useDismissStack uzerinden en yuksek oncelikli |
| Tam focus trap | TAMAMLANDI | Tab/Shift+Tab dongusu panel icinde kalir |
| Focus restore | TAMAMLANDI | Kapatildiginda onceki elemana focus doner |
| Keyboard scope yonetimi | TAMAMLANDI | keyboardStore ile scope push/pop |
| Body scroll kilidi | TAMAMLANDI | Acikken sayfa scroll devre disi |
| Heading font | TAMAMLANDI | Baslik icin `typography.headingFamily` kullanimi |

### 2.3 Focus Trap Detayi

Sheet icindeki focus trap mekanizmasi:

1. Panel acildiginda `requestAnimationFrame` ile panele focus yapilir
2. `FOCUSABLE_SELECTOR` ile panel icindeki tum fokuslanabilir elementler belirlenir
3. `Tab` tusuna basinca:
   - Son elemandaysa ilk elemana doner
   - Ilk elemandaysa (Shift+Tab ile) son elemana doner
4. Fokuslanabilir element yoksa Tab islemi engellenir (`preventDefault`)

Fokuslanabilir element secicisi:
```
a[href], button:not([disabled]), textarea:not([disabled]),
input:not([disabled]), select:not([disabled]),
[tabindex]:not([tabindex="-1"])
```

### 2.4 Dismiss Stack Entegrasyonu

- `useDismissStack(scopeId, open, onClose)` ile ESC tusuna basinca en ustteki overlay kapatilir
- Sheet "sheet-panel" scope ID'si ile kaydolur
- Birden fazla overlay aciksa (orn: Sheet + Modal), en son acilan ilk kapatilir

### 2.5 Focus Restore

- `useFocusRestore(open)` hook'u Sheet acilmadan onceki aktif elemani kaydeder
- Sheet kapatildiginda focus onceki elemana geri doner
- Bu, klavye navigasyonu surekliligini saglar

---

## 3. Keyboard Scope Yonetimi

### 3.1 keyboardStore

`keyboardStore` Zustand store'u, aktif klavye kapsamlarini yonetir:

- `pushScope(scope)` — yeni kapsam ekler
- `popScope(id)` — belirtilen kapsami kaldirir
- Kapsamlar yigin (stack) seklinde yonetilir

### 3.2 Sheet Kapsami

Sheet acildiginda:
1. `pushScope({ id: "sheet-panel", label: "Sheet Panel" })` cagirilir
2. Diger klavye kisa yollari (orn: Cmd+K, "/") bu kapsam aktifken devre disi kalabilir
3. Sheet kapatildiginda `popScope("sheet-panel")` ile kapsam kaldirilir

---

## 4. "/" Arama Kisa Yolu (useSearchFocus)

### 4.1 Hook Tasarimi

**Konum:** `src/hooks/useSearchFocus.ts`

```typescript
function useSearchFocus(
  inputRef: React.RefObject<HTMLInputElement | null>,
  options?: { enabled?: boolean }
): void
```

### 4.2 Calisma Mantigi

1. "/" tusuna basildiginda tetiklenir
2. Aktif eleman kontrol edilir — asagidaki durumlarda tetiklenmez:
   - `HTMLInputElement` fokustaysa
   - `HTMLTextAreaElement` fokustaysa
   - `HTMLSelectElement` fokustaysa
   - `contentEditable` eleman fokustaysa
3. `enabled` opsiyonu `false` ise tetiklenmez (overlay acikken kullanilir)
4. `e.preventDefault()` ile "/" karakterinin yazilmasi engellenir
5. `inputRef.current?.focus()` ile arama input'una focus yapilir

### 4.3 Entegre Edilen Sayfalar

| Sayfa | Entegrasyon |
|-------|-------------|
| AssetLibraryPage | FilterInput ref + useSearchFocus |
| ContentLibraryPage | FilterInput ref + useSearchFocus |
| EffectiveSettingsPanel | FilterInput ref + useSearchFocus |

### 4.4 FilterInput forwardRef Donusumu

`FilterInput` bileseni `forwardRef` ile sarmalandi. Bu sayede disa ref verilebilir ve `useSearchFocus` hook'u input elementine dogrudan erisebilir.

---

## 5. Auto-Save Etkilesimi (EffectiveSettingsPanel)

### 5.1 SettingRow Durumu

Her SettingRow bileseni su durum gostergelerini icerir:

| Durum | Gorsel | Aciklama |
|-------|--------|----------|
| Temiz | Normal gorunum | Kaydedilmis deger gosterilir |
| Dirty | Degisiklik isareti | Kullanici degeri degistirdi, henuz kaydedilmedi |
| Saving | Yukleme gostergesi | Kayit islemi devam ediyor |
| Error | Hata gostergesi | Kayit basarisiz oldu |

### 5.2 Akis

1. Kullanici degeri degistirir → dirty durumuna gecer
2. Debounce suresi sonunda auto-save tetiklenir
3. API cagirisi basarili ise temiz duruma doner
4. API cagirisi basarisiz ise error durumu gosterilir

---

## 6. Test Kapsami

| Test Dosyasi | Test Sayisi | Kapsam |
|--------------|-------------|--------|
| `useSearchFocus.test.ts` | 4 | "/" tetikleme, input filtre, enabled kontrol |
| `uiStore.sidebar-persist.test.ts` | 4 | Sidebar collapse localStorage kaliciligi |

Tum testler BASARILI.

---

## 7. Erisebilirlik (Accessibility) Notlari

- Sheet, ARIA rollerini panelRef uzerinden yonetir
- Focus trap, WCAG 2.1 modal dialog gereksinimlerine uygundur
- ESC ile kapatma, WCAG klavye navigasyonu gereksinimini karsilar
- "/" kisa yolu, input/textarea icerisindeyken devre disi — kullanici deneyimini bozmaz
- Focus restore, klavye kullanicilari icin sureklilik saglar

---

## 8. Bilinen Sinirlamalar

1. Sheet icinde nested modal acildiginda focus trap iç ice davranisi test edilmemistir (Wave 2 adayi)
2. Screen reader bildirimleri (aria-live) Sheet acilik/kapanisinda henuz yok
3. "/" kisa yolu sadece Latin klavye duzeninde calisir; alternatif duzenlerde farkli tus gerekebilir

---

## 9. Dosya Referanslari

| Dosya | Konum |
|-------|-------|
| Sheet bileseni | `src/components/design-system/Sheet.tsx` |
| useSearchFocus | `src/hooks/useSearchFocus.ts` |
| useDismissStack | `src/hooks/useDismissStack.ts` |
| useFocusRestore | `src/hooks/useFocusRestore.ts` |
| keyboardStore | `src/stores/keyboardStore.ts` |
| uiStore | `src/stores/uiStore.ts` |
