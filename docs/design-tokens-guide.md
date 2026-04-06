# Design Token Kullanim Rehberi

ContentHub coklu tema destekler (Chalk/light, Obsidian/dark, Sand/warm, Midnight/navy).
Tailwind siniflari `--ch-*` CSS degiskenlerini referans alir ve tema degistikce otomatik uyum saglar.

## Neutral Renk Skalasi (Tema-Semantik)

| Token | Chalk (light) | Obsidian (dark) | Kullanim |
|-------|--------------|-----------------|----------|
| neutral-0 | #ffffff | #09090b | Sayfa arka plan |
| neutral-50 | #fafafa | #111114 | Surface inset |
| neutral-100 | #f5f5f5 | #18181b | bg-neutral-100 (inset, code bg) |
| neutral-200 | #e5e5e5 | #202024 | bg-neutral-200, hover bg |
| neutral-300 | #d4d4d4 | #2a2a30 | Border, ayirici |
| neutral-400 | #a3a3a3 | #3f3f46 | Placeholder, disabled |
| neutral-500 | #737373 | #52525b | Label, ikincil metin |
| neutral-600 | #525252 | #71717a | Ikincil metin, aciklama |
| neutral-700 | #404040 | #a1a1aa | Govde metni |
| neutral-800 | #262626 | #d4d4d8 | Govde metni (guclu) |
| neutral-900 | #171717 | #e4e4e7 | Baslik, birincil metin |
| neutral-950 | #0a0a0a | #fafafa | En guclu vurgu / code bg (dark) |

## Kurallari

### Metin Renkleri (Ana Icerik Alani)
- **Basliklar:** `text-neutral-900`
- **Govde metni:** `text-neutral-800`
- **Ikincil metin / label:** `text-neutral-500` veya `text-neutral-600`
- **Placeholder / disabled:** `text-neutral-400`

### ASLA Yapilmamasi Gerekenler
- `text-neutral-100` veya `text-neutral-200` ana icerik alaninda KULLANMA — light temada gorunmez
- `text-neutral-900` veya `text-neutral-800` sidebar/koyu arka planda KULLANMA — dark temada gorunmez

### Arka Plan Kullanimi
- `bg-neutral-100` — inset arka plan, code block arka plani (HER temada dogru)
- `bg-neutral-950` — CodeBlock koyu arka plan (uzerinde `text-neutral-200` dogru)
- `bg-surface-card` — kart/panel arka plani (tema semantik)

### Sidebar Baglami (Koyu Arka Plan)
Sidebar her temada koyu renk kullanir (`surface.sidebar`).
- Metin: `text-neutral-200` (sidebar'da dogru, ana iceride YANLIS)
- Hover: `text-neutral-200` hover OK
- Muted: `text-neutral-500`

### Border Renkleri
- `border-border-subtle` — en hafif ayirici
- `border-border` (border-DEFAULT) — standart border
- `border-border-strong` — guclu ayirici

### Sheet (Detay Paneli) Tasarim Kurallari
- Dinamik yukseklik: icerik kadar uzar, `max-height: calc(100vh - 2rem)`
- Sabit tam yukseklik KULLANMA (`top-0 bottom-0`)
- Icerik asarsa `overflow-y-auto` ile scroll
- Header: `text-neutral-900`, kompakt padding (px-5 py-3)
- Icerik padding: px-5 py-3

## Yeni Bilesen Yazarken Kontrol Listesi

1. Metin `text-neutral-100` veya `text-neutral-200` kullaniyorsan — durDUR. Arka plan koyu mu?
2. Arka plan `bg-surface-card` veya `bg-neutral-0` ise → metin `text-neutral-700+` olmali
3. Arka plan `bg-neutral-950` ise → metin `text-neutral-200` olmali
4. Sidebar icindeysen → metin `text-neutral-200` OK
5. Border icin `border-border-*` semantic token tercih et, `border-neutral-*` yerine
