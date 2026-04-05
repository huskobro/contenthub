# M22-C: Publish Executor Truth Hardening — Rapor

## Ozet

Publish executor'daki hardcoded "ContentHub Video" fallback title kaldirild.
Artik eksik veya bozuk payload durumunda yayin sessizce yanlis veriyle devam
etmek yerine acik hata firlatiyor.

## Sorun Tespiti

Onceki davranis:
```python
# Eski kod — executor.py _resolve_payload()
if not record.payload_json:
    return {"title": "ContentHub Video", "description": "", "tags": []}
```

Bu davranis su sorunlara yol aciyordu:
- Metadata olusturulmamis icerik "ContentHub Video" basligi ile yayinlanabiliyordu
- YouTube'da yanlis baslikli videolar olusabiliyordu
- Hata sessiz oldugu icin operatorun haberi olmuyordu

## Yapilan Degisiklikler

### Backend — Executor

1. **`app/publish/executor.py`** — `_resolve_payload()` metodu yeniden yazildi
   - `payload_json` bos → `ValueError("payload_json bos")`
   - JSON parse hatasi → `ValueError("payload_json parse edilemedi")`
   - `title` alani eksik/bos → `ValueError("title alani eksik veya bos")`
   - Gecerli payload → dict olarak dondurulur

### Backend — YouTube Adapter

2. **`app/publish/youtube/adapter.py`** — Title validasyonu eklendi
   - `payload.get("title")` bossa `PublishAdapterError` firlatilir
   - `error_code="MISSING_TITLE"`, `retryable=False`
   - Cift katmanli koruma: executor + adapter seviyesinde

## Hata Propagasyon Zinciri

```
payload_json bos/bozuk
  → executor._resolve_payload() ValueError firlatiyor
    → step FAILED olarak isaretleniyor
      → job timeline'da gorunur
        → operator bilgilendirilir

payload'da title yok (adapter seviyesi ek koruma)
  → adapter PublishAdapterError firlatiyor
    → step FAILED, error_code: MISSING_TITLE
      → retry yapilmaz (retryable=False)
```

## Eski Test Guncelleme

`test_m7_c3_publish_executor.py` test_s_payload_defaults testi guncellendi:
- Eski: `assert payload["title"] == "ContentHub Video"` (fallback bekliyordu)
- Yeni: `pytest.raises(ValueError, match="payload_json bos")` (hata bekleniyor)

## Test Sonuclari

- `test_publish_executor_rejects_empty_payload` — PASSED
- `test_publish_executor_rejects_invalid_json` — PASSED
- `test_publish_executor_rejects_missing_title` — PASSED
- `test_publish_executor_accepts_valid_payload` — PASSED
- `test_s_payload_defaults` (eski test, guncellendi) — PASSED

## Etki Analizi

| Senaryo | Eski Davranis | Yeni Davranis |
|---------|--------------|---------------|
| payload_json = None | "ContentHub Video" ile yayin | ValueError, yayin durur |
| payload_json bozuk JSON | Muhtemelen crash | ValueError, yayin durur |
| payload'da title yok | "ContentHub Video" kullanilir | ValueError, yayin durur |
| Gecerli payload | Normal yayin | Normal yayin |

## Bilinen Sinirlamalar

- Description ve tags icin henuz zorunluluk yok (sadece title zorunlu)
- Payload schema validasyonu (Pydantic model) henuz yok
- Adapter-seviye title kontrolu executor kontrolunden sonra gereksiz ama savunma derinligi olarak korunuyor
