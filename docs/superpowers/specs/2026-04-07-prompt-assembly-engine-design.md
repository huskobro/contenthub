# Prompt Assembly Engine — Design Specification

Date: 2026-04-07
Status: Final Design

## 1. Executive Summary

ContentHub'a "Prompt Assembly Engine + Prompt Trace + Provider Request Visibility" ekleniyor. Amac: prompt olusumunu parcali, izlenebilir, neden-sonuc iliskisi net, operator tarafindan anlasilabilir hale getirmek.

Tek parca prompt textarea'si yerine, sirali bloklardan olusan deterministik bir assembly motoru kurulacak. Her blogun neden eklendigi/atlandigi, hangi ayarin buna sebep oldugu, hangi verinin prompta girdigi ve modele exact ne gittigi gorunur olacak.

## 2. Neden Bu Ozellik Gerekli

Mevcut durum:
- Prompt'lar `type:"prompt"` settings olarak tek parca metin
- `prompt_builder.py` icinde hardcoded string concat ile birlestirme
- Hangi blok neden eklendi/atlandigi gorunmuyor
- KIE.ai'ye giden exact payload saklanmiyor
- Dry run / preview yok
- Job detail'de prompt assembly trace yok

Hedef durum:
- Prompt = sirali block'lardan olusan deterministik assembly
- Her block included/skipped trace'e duser
- Condition evaluation net ve izlenebilir
- KIE.ai request/response tam gorunur
- Dry run ile gonderim oncesi preview
- Job detail'de birinci sinif Prompt Trace sekmesi
- Snapshot locking ile reproducibility

## 3. Mimari Kararlar

### 3.1 Persistence: Hybrid Model

| Katman | Nerede | Ornekler |
|--------|--------|----------|
| Behavior flags | Settings Registry | `normalize_enabled`, `humanize_enabled`, `tts_enhance_enabled` |
| Prompt blocks | Ayri `prompt_blocks` tablosu | `narration_system`, `anti_clickbait_rules`, `output_contract` |
| Assembly trace | Ayri `prompt_assembly_runs` + `prompt_assembly_block_traces` tablolari | Job bazinda kayit |

Neden hybrid:
- Prompt block ile behavior setting ayni sey degil
- Block ordering, condition reference, rendered trace icin ayri domain modeli daha temiz
- Behavior flags zaten Settings Registry'de; orada kalacak
- UI'da tek ekosistem gibi gorunecek

### 3.2 Condition Evaluation: 6 Tur, DSL Yok

Desteklenen condition turleri:
1. `always` — kosulsuz dahil
2. `settings_boolean` — settings key boolean degerine gore
3. `data_presence` — data snapshot'ta alanin varligi
4. `settings_value_equals` — settings key belirli bir degere esit mi
5. `module_match` — assembly'nin module scope'una gore
6. `provider_match` — assembly'nin provider'ina gore

Condition config JSON alaninda saklanir. Mini-language / DSL yok.

### 3.3 Template Rendering: Basit Ama Resmi

- `{{variable}}` substitution
- Jinja2 yok
- Block ici kosul yok — kosullu mantik block seviyesinde
- Template yalnizca veri yerlestirir
- Missing variable: kritik ise block skip, degil ise bos string + warning trace

### 3.4 Job Detail: Prompt Trace Ayri Sekme (B)

- Provider Trace = cagri ve provider davranisi
- Prompt Trace = cagridan once prompt nasil olustu
- Ayri birinci sinif sekmeler, aralarinda gorunur baglanti (referans karti)

## 4. Domain Model

### 4.1 PromptBlock

Ayri `prompt_blocks` tablosu.

```
prompt_blocks
├── id: UUID (PK)
├── key: str (unique) — "news_bulletin.narration_system"
├── title: str — "Narration System Prompt"
├── module_scope: str — "news_bulletin" | "standard_video" | null
├── provider_scope: str | null — "kie_ai" | null (tum providerlar)
├── group_name: str — "core" | "behavior" | "context" | "output"
├── kind: str — "core_system" | "module_instruction" | "behavior_block" | "context_block" | "output_contract" | "provider_instruction"
├── order_index: int — assembly siralama (0, 10, 20...)
├── enabled_by_default: bool — true/false
├── condition_type: str — "always" | "settings_boolean" | "data_presence" | "settings_value_equals" | "module_match" | "provider_match"
├── condition_config_json: str (JSON) — condition parametreleri
├── content_template: text — "{{variable}}" iceren sablonu
├── admin_override_template: text | null — admin degistirdiyse
├── help_text: str | null
├── visible_in_admin: bool — true
├── status: str — "active" | "disabled" | "deleted"
├── version: int — her update'te artar
├── source_kind: str — "builtin_default" | "admin_override" | "seeded_system"
├── created_at: datetime
├── updated_at: datetime
```

**condition_config_json ornekleri:**

```json
// always
null

// settings_boolean
{"settings_key": "news_bulletin.config.normalize_enabled"}

// data_presence
{"data_key": "selected_news_summary"}

// settings_value_equals
{"settings_key": "news_bulletin.config.narration_mode", "expected_value": "broadcast"}

// module_match
{"module": "news_bulletin"}

// provider_match
{"provider": "kie_ai"}
```

**kind degerleri:**

| Kind | Aciklama | Ornek |
|------|----------|-------|
| `core_system` | Temel sistem talimatı, her zaman ilk sirada | "Sen profesyonel bir TV haber spikerisin..." |
| `module_instruction` | Module-specific talimat | "Bu bir haber bulteni narration'idir..." |
| `behavior_block` | Ayar-kontrollü davranis blogu | normalize, humanizer, anti_clickbait |
| `context_block` | Veri-turetimli baglam paragrafı | selected_news_summary, category_guidance |
| `output_contract` | Cikti format sozlesmesi, her zaman son sirada | JSON schema tanimi |
| `provider_instruction` | Provider-specific talimat | KIE.ai token limiti, format tercihi |

**Effective content resolve sirasi:**
1. `admin_override_template` varsa onu kullan
2. yoksa `content_template` (builtin default) kullan

**admin_override_template hakkinda onemli not:**
- v1'de yalnizca current effective override tutulur
- Full version history (diff goruntuleme, rollback) bilincli olarak ertelenmistir
- Admin override yaptiginda `source_kind` otomatik `admin_override` olur, `version` artar
- Reset yapildiginda `admin_override_template = null` olur, `source_kind` `builtin_default`'a doner

**Block yonetim kurallari (disable/edit koruma):**

| Kind | Disable edilebilir mi | Admin override edilebilir mi | Aciklama |
|------|----------------------|------------------------------|----------|
| `core_system` | HAYIR | Evet (icerik duzenlenebilir) | Sistem talimati her zaman olmali |
| `output_contract` | HAYIR | Evet (format degisebilir) | Cikti sozlesmesi her zaman olmali |
| `module_instruction` | Evet | Evet | Module-specific talimat |
| `behavior_block` | Evet | Evet | Ayar-kontrollü blok |
| `context_block` | Evet | Evet | Veri-turetimli blok |
| `provider_instruction` | Evet | Evet | Provider-specific talimat |

UI'da `core_system` ve `output_contract` kind'li block'larin disable butonu pasif olacak ve tooltip ile aciklama gosterilecek: "Bu blok sistem butunlugu icin gereklidir ve devre disi birakilamaz."

### 4.2 PromptAssemblyRun

Assembly calistirma kaydi. Hem gercek job hem dry run icin.

```
prompt_assembly_runs
├── id: UUID (PK)
├── job_id: UUID | null (FK -> jobs) — dry run'da null
├── step_key: str | null — "script" | "metadata" | null (dry run)
├── module_scope: str — "news_bulletin" | "standard_video"
├── provider_name: str — "kie_ai_gemini_flash"
├── provider_type: str — "llm"
├── final_prompt_text: text — birlesmis final prompt
├── final_payload_json: text — KIE.ai'ye giden exact request body
├── provider_response_json: text | null — KIE.ai'den gelen exact response
├── provider_error_json: text | null — hata varsa
├── settings_snapshot_json: text — effective settings o anki hali
├── prompt_snapshot_json: text — effective block tanimlari o anki hali
├── data_snapshot_json: text — prompta giren veriler
├── included_block_keys_json: text — ["narration_system", "anti_clickbait"]
├── skipped_block_keys_json: text — ["humanizer", "tts_enhance"]
├── block_count_included: int
├── block_count_skipped: int
├── is_dry_run: bool — false (gercek) / true (preview)
├── created_at: datetime
```

### 4.3 PromptAssemblyBlockTrace

Block bazinda detay trace.

```
prompt_assembly_block_traces
├── id: UUID (PK)
├── assembly_run_id: UUID (FK -> prompt_assembly_runs) — CASCADE
├── block_key: str — "narration_system"
├── block_title: str — "Narration System Prompt"
├── block_kind: str — "core_system"
├── order_index: int — 0
├── included: bool — true/false
├── reason_code: str — "included_always" | "included_by_setting" | "skipped_by_setting" | ...
├── reason_text: str — "news_bulletin.config.normalize_enabled=true oldugu icin eklendi"
├── evaluated_condition_type: str — "always" | "settings_boolean" | ...
├── evaluated_condition_key: str | null — "news_bulletin.config.normalize_enabled"
├── evaluated_condition_value: str | null — "true"
├── rendered_text: text | null — final rendered paragraf (included ise)
├── used_variables_json: text | null — ["category_name", "normalized_title"]
├── missing_variables_json: text | null — ["style_tone"]
├── data_dependencies_json: text | null — block'un bagimli oldugu data key'leri
├── created_at: datetime
```

**reason_code tam listesi:**

| Code | Anlam |
|------|-------|
| `included_always` | condition_type=always, her zaman dahil |
| `included_by_setting` | settings boolean true |
| `included_by_data_presence` | data var |
| `included_by_value_match` | settings value eslesir |
| `included_by_module_match` | module scope uygun |
| `included_by_provider_match` | provider scope uygun |
| `skipped_by_setting` | settings boolean false |
| `skipped_missing_data` | gerekli data yok |
| `skipped_value_mismatch` | settings value eslesmiyor |
| `skipped_module_mismatch` | module scope uyumsuz |
| `skipped_provider_mismatch` | provider scope uyumsuz |
| `skipped_empty_render` | render sonucu bos |
| `skipped_disabled_block` | block status=disabled veya enabled_by_default=false + condition yok |
| `skipped_critical_data_missing` | block'un kritik verisi eksik, block skip |

## 5. Assembly Flow

### 5.1 PromptAssemblyService

```
PromptAssemblyService.assemble(
    module_scope: str,
    provider_name: str,
    settings_snapshot: dict,
    block_snapshot: list[PromptBlock],
    data_snapshot: dict,
    is_dry_run: bool = False
) -> AssemblyResult
```

**AssemblyResult:**
```
AssemblyResult:
    final_prompt_text: str
    final_payload: dict          # provider-ready payload
    included_blocks: list[BlockTraceEntry]
    skipped_blocks: list[BlockTraceEntry]
    assembly_run: PromptAssemblyRun   # persisted (veya dry_run ise hafizada)
```

### 5.2 Assembly Adimlari

```
1. BLOCK SELECTION
   - block_snapshot'taki tum block'lari al
   - module_scope filtrele (block.module_scope == null veya == target module)
   - provider_scope filtrele (block.provider_scope == null veya == target provider)
   - status == "active" olanlari filtrele
   - order_index'e gore sirala

2. CONDITION EVALUATION (her block icin)
   - condition_type'a gore evaluate et
   - settings_snapshot ve data_snapshot kullan
   - sonuc: included=true/false + reason_code + reason_text

3. TEMPLATE RENDERING (included block'lar icin)
   - content_template veya admin_override_template sec
   - {{variable}} substitution uygula (data_snapshot'tan)
   - missing variable kontrolu:
     - block'un critical_data_keys listesinde mi?
     - evet → block skip, reason=skipped_critical_data_missing
     - hayir → bos string + missing_variables_json'a ekle
   - render sonucu bos ise → skip, reason=skipped_empty_render

4. FINAL ASSEMBLY
   - included block'larin rendered_text'lerini order_index sirasinda concat
   - separator: "\n\n"
   - final_prompt_text olustur

5. PAYLOAD CONSTRUCTION
   - provider adapter'dan format bilgisi al
   - final_prompt_text'i provider-specific payload'a donustur
   - ornek: KIE.ai icin OpenAI-compat messages array

6. TRACE PERSISTENCE
   - PromptAssemblyRun olustur
   - Her block icin PromptAssemblyBlockTrace olustur
   - is_dry_run=true ise provider_response_json bos kalir
```

### 5.3 Determinism Garantisi

Ayni girdi → ayni cikti:
- Block snapshot frozen (job baslangicinda veya dry run aninda)
- Settings snapshot frozen
- Data snapshot frozen
- order_index sirasi kesin
- Condition evaluation pure function (side effect yok)
- Template rendering pure function

## 6. Condition Evaluation Detayi

### 6.1 ConditionEvaluator

```python
class ConditionEvaluator:
    def evaluate(
        self,
        block: PromptBlock,
        settings_snapshot: dict,
        data_snapshot: dict,
        module_scope: str,
        provider_name: str
    ) -> ConditionResult:
        # Returns: included, reason_code, reason_text,
        #          evaluated_condition_type, evaluated_condition_key,
        #          evaluated_condition_value
```

### 6.2 Her Condition Turu

**always:**
```
condition_config_json: null
→ included=True, reason_code="included_always"
→ reason_text="Blok her zaman dahil edilir"
```

**settings_boolean:**
```
condition_config_json: {"settings_key": "news_bulletin.config.normalize_enabled"}
→ settings_snapshot["news_bulletin.config.normalize_enabled"] == True
  → included=True, reason_code="included_by_setting"
  → reason_text="news_bulletin.config.normalize_enabled=true oldugu icin eklendi"
→ settings_snapshot[key] == False veya key yok
  → included=False, reason_code="skipped_by_setting"
  → reason_text="news_bulletin.config.normalize_enabled=false oldugu icin atlandi"
```

**data_presence:**
```
condition_config_json: {"data_key": "selected_news_summary"}
→ data_snapshot.get("selected_news_summary") truthy
  → included=True, reason_code="included_by_data_presence"
  → reason_text="selected_news_summary verisi mevcut, blok eklendi"
→ data_snapshot.get(key) falsy
  → included=False, reason_code="skipped_missing_data"
  → reason_text="selected_news_summary verisi bos/yok, blok atlandi"
```

**settings_value_equals:**
```
condition_config_json: {"settings_key": "narration_mode", "expected_value": "broadcast"}
→ settings_snapshot[key] == "broadcast"
  → included=True, reason_code="included_by_value_match"
→ else
  → included=False, reason_code="skipped_value_mismatch"
```

**module_match:**
```
condition_config_json: {"module": "news_bulletin"}
→ module_scope == "news_bulletin"
  → included=True, reason_code="included_by_module_match"
→ else
  → included=False, reason_code="skipped_module_mismatch"
```

**provider_match:**
```
condition_config_json: {"provider": "kie_ai"}
→ provider_name starts with "kie_ai"
  → included=True, reason_code="included_by_provider_match"
→ else
  → included=False, reason_code="skipped_provider_mismatch"
```

### 6.3 enabled_by_default ile Etkilesim

`enabled_by_default` blogun varsayilan durumunu belirler:
- `enabled_by_default=True` + `condition_type="always"` → her zaman dahil
- `enabled_by_default=True` + `condition_type="settings_boolean"` → setting true ise dahil, false ise skip
- `enabled_by_default=False` + `condition_type="settings_boolean"` → setting acikca true yapilmadikca skip
- `enabled_by_default=False` + `condition_type="always"` → blok disabled kabul edilir (reason: skipped_disabled_block)

Trace'te her zaman gorunur:
- default neydi
- hangi condition son karari verdi

## 7. Template Rendering Detayi

### 7.1 TemplateRenderer

```python
class TemplateRenderer:
    def render(
        self,
        template: str,
        data: dict,
        critical_keys: list[str] | None = None
    ) -> RenderResult:
        # Returns: rendered_text, used_variables, missing_variables,
        #          is_empty, has_critical_missing
```

### 7.2 Rendering Kurallari

1. `{{variable_name}}` pattern'i bul
2. `data` dict'ten degeri al
3. Deger varsa yerlestir
4. Deger yoksa:
   - `critical_keys` listesinde mi?
   - Evet → `has_critical_missing=True` (block skip edilecek)
   - Hayir → bos string yerlestir + `missing_variables`'a ekle
5. Final text bosmu kontrol et → `is_empty`

### 7.3 Block-Level Critical Data

Her block kendi critical data key'lerini tanimlar:

```python
# Block tanim ornegi:
{
    "key": "nb.selected_news_summary",
    "content_template": "Secilen haberler:\n{{selected_news_summary}}",
    "condition_type": "data_presence",
    "condition_config_json": {"data_key": "selected_news_summary"},
    # Bu block'un ana verisi selected_news_summary
    # Condition zaten data_presence kontrol ediyor
    # Eger condition pass edip ama render sirasinda bos cikarsa → skipped_empty_render
}
```

## 8. KIE.ai Provider Integration

### 8.1 Katmanlar

```
Module Executor (script step, metadata step)
    │
    ▼
PromptAssemblyService.assemble(...)
    │ → block selection, condition eval, rendering, final prompt
    │ → PromptAssemblyRun + BlockTrace persist
    │
    ▼
ProviderPayloadBuilder.build(provider_name, final_prompt_text, extra_params)
    │ → provider-specific payload olustur
    │
    ▼
KieAiProvider.invoke(payload)
    │ → HTTP request → response
    │
    ▼
PromptTraceService.record_provider_result(assembly_run_id, response/error)
    │ → provider_response_json veya provider_error_json kaydet
```

### 8.2 Akis Detayi

```
1. Executor, assembly icin gerekli veriler toplar:
   - module_scope
   - provider_name (registry'den primary provider)
   - settings_snapshot (job.input_data_json._settings_snapshot'tan)
   - data_snapshot (executor'un topladigi context verisi)

2. PromptAssemblyService.assemble() cagirilir
   - Block'lar secilir, condition'lar evaluate edilir
   - Template'ler renderlanir
   - Final prompt olusturulur
   - PromptAssemblyRun + BlockTrace DB'ye yazilir
   - final_payload_json olusturulur (provider format)

3. Executor, provider'i cagirir:
   resolve_and_invoke(registry, capability, final_payload)

4. Sonuc gelince:
   PromptTraceService.record_provider_result(
       assembly_run_id=run.id,
       response_json=output.result,
       trace=output.trace
   )
   - assembly_run.provider_response_json guncellenir
   - Hata durumunda assembly_run.provider_error_json guncellenir

5. Step'in provider_trace_json'ina assembly_run_id referansi eklenir
```

### 8.3 Provider Payload Builder

Provider-specific logic burada kalir, assembly katmanina sizmaz.

```python
class ProviderPayloadBuilder:
    def build_kie_ai_payload(
        self,
        final_prompt_text: str,
        model: str,
        temperature: float,
        max_tokens: int | None
    ) -> dict:
        return {
            "messages": [
                {"role": "system", "content": final_prompt_text},
                {"role": "user", "content": user_content}
            ],
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
```

**System vs User message ayrimi:**
- System prompt = assembled prompt (block'lardan olusan)
- User message = module-specific input data (haber listesi, topic, vb.)
- User message icerigi executor tarafindan hazirlanir, assembly engine'e girmez
- ProviderPayloadBuilder her ikisini birlestirerek final payload olusturur
- Her iki kisim da `final_payload_json`'da tam gorunur olacak

### 8.5 Secret Redaction Policy

`final_payload_json` ve `provider_response_json` trace'e yazilirken zorunlu redaction uygulanir:

**Asla trace'e raw dusemeyecek alanlar:**
- `Authorization` header degeri
- `api_key`, `api-key`, `x-api-key` header/param degerleri
- `token`, `bearer`, `secret` iceren field degerleri
- Provider credential string'leri

**Redaction kurallari:**
1. ProviderPayloadBuilder, payload olustururken auth/credential alanlarini dahil ETMEZ (payload = body only, headers ayri)
2. `final_payload_json`'a yalnizca request body yazilir; HTTP headers, auth tokenlari dahil edilmez
3. Provider response trace'te model cevabi + metadata saklanir; session/auth bilgisi redact edilir
4. Redaction servisi `PromptTraceService.sanitize_for_storage()` fonksiyonu ile yapilir
5. Sanitize fonksiyonu bilinen secret pattern'lari `[REDACTED]` ile degistirir

**Kural:** Trace her zaman "exact ne gitti" sorusunu yanıtlar, ama credential/auth bilgisi asla gorunmez.

### 8.4 Mevcut prompt_builder.py Gecisi

Mevcut `build_bulletin_script_prompt()`, `build_script_prompt()` vb. fonksiyonlar kademeli olarak PromptAssemblyService'e devredilecek:

1. Yeni block-tabanli assembly kurulur
2. Mevcut fonksiyonlar adapter olarak kalir (gecis sureci)
3. Executor'lar yeni assembly service'e gecis yapar
4. Eski fonksiyonlar kaldirilir

## 9. Admin Surfaces

### 9.1 Prompt Editor Genisletmesi

Mevcut `PromptEditorPage.tsx` genisletilir. Yeni sayfa acilmaz — mevcut yapiya block yonetimi eklenir.

**Yeni gorunum yapisi:**

```
Prompt Yonetimi (mevcut sayfa genisletilmis)
├── Module Filtresi (news_bulletin | standard_video | tumu)
├── Provider Filtresi (kie_ai | tumu)
│
├── PROMPT BLOKLARI
│   ├── Block Listesi (siralama: order_index)
│   │   ├── Block Karti
│   │   │   ├── key + title
│   │   │   ├── kind badge (core_system, behavior_block, ...)
│   │   │   ├── order_index
│   │   │   ├── condition ozeti ("normalize_enabled=true ise aktif")
│   │   │   ├── status badge (active/disabled)
│   │   │   ├── Effective text preview (ilk 2-3 satir)
│   │   │   ├── source_kind badge (builtin / admin_override)
│   │   │   └── [Duzenle] [Reset] aksiyonlari
│   │   └── ...
│   └── Block Detay Panel (yana acilir Sheet)
│       ├── Tam content_template / admin_override_template
│       ├── Condition detayi
│       ├── Help text
│       ├── Version
│       └── Save / Reset / Disable aksiyonlari
│
├── ILISKILI KURALLAR
│   ├── normalize_enabled
│   ├── humanize_enabled
│   ├── tts_enhance_enabled
│   ├── anti_clickbait_enabled
│   ├── category_guidance_enabled
│   ├── narration_mode
│   └── (diger assembly-etkileyen settings)
│
└── PROMPT PREVIEW (inline)
    ├── [Preview Olustur] butonu
    ├── Module + sample data secimi
    ├── Assembled Prompt sonucu
    ├── Block Breakdown
    └── Included/Skipped listesi
```

### 9.2 Neden Ayri Sayfa Acilmiyor

- Mevcut PromptEditorPage zaten prompt yonetiminin ana yuzeyi
- Block mantigini buraya eklemek dogal genisleme
- Operator tek yerde hem block'lari hem iliskili ayarlari hem preview'u gorebilir
- Gereksiz sayfa cogaltma yerine mevcut sayfayi zenginlestirme

### 9.3 Related Rules Section

Block'lardan ayri, ama ayni sayfada gorunen bolum:

```
Iliskili Kurallar
├── news_bulletin.config.normalize_enabled: true ✅
├── news_bulletin.config.humanize_enabled: false ❌
├── news_bulletin.config.tts_enhance_enabled: true ✅
├── news_bulletin.config.anti_clickbait_enabled: true ✅
├── news_bulletin.config.category_guidance_enabled: true ✅
└── news_bulletin.config.narration_mode: "broadcast"
```

Her satir:
- Setting key
- Current effective value
- Block'lara nasil etki ettigi (hover/tooltip)
- Duzenle linki (Settings Registry'ye yonlendirir)

## 10. Dry Run / Prompt Preview

### 10.1 Endpoint

```
POST /api/v1/prompt-assembly/preview
Body:
{
    "module_scope": "news_bulletin",
    "provider_name": "kie_ai_gemini_flash",  // optional, default primary
    "data_overrides": {                       // optional sample data
        "selected_news_summary": "...",
        "category_name": "gundem"
    },
    "settings_overrides": {                   // optional, test different configs
        "news_bulletin.config.normalize_enabled": false
    }
}

Response:
{
    "assembly_run_id": "...",
    "is_dry_run": true,
    "final_prompt_text": "...",
    "final_payload": {...},
    "included_blocks": [
        {
            "block_key": "narration_system",
            "block_title": "Narration System Prompt",
            "kind": "core_system",
            "order_index": 0,
            "reason_code": "included_always",
            "reason_text": "Blok her zaman dahil edilir",
            "rendered_text": "Sen profesyonel bir TV haber spikerisin..."
        }
    ],
    "skipped_blocks": [
        {
            "block_key": "humanizer",
            "block_title": "Humanizer Block",
            "kind": "behavior_block",
            "order_index": 30,
            "reason_code": "skipped_by_setting",
            "reason_text": "news_bulletin.config.humanize_enabled=false oldugu icin atlandi"
        }
    ],
    "settings_snapshot_summary": {...},
    "data_snapshot_summary": {...}
}
```

### 10.2 UI

Preview, Prompt Editor sayfasinin alt bolumunde inline olarak gorunur.

```
PROMPT PREVIEW
┌────────────────────────────────────────────────────┐
│ Module: [news_bulletin ▼]  Provider: [kie_ai ▼]    │
│ [+ Sample Data Ekle]  [+ Setting Override Ekle]     │
│                                                     │
│ [Preview Olustur]                                   │
├────────────────────────────────────────────────────┤
│                                                     │
│ ┌─ Assembled Prompt ─────────────────────────────┐ │
│ │ Sen profesyonel bir TV haber spikerisin...      │ │
│ │ ...                                             │ │
│ │ [Kopyala]                                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Block Breakdown ──────────────────────────────┐ │
│ │ ✅ #0 narration_system (core_system)            │ │
│ │    → "Sen profesyonel bir TV haber spiker..."   │ │
│ │ ✅ #10 anti_clickbait (behavior_block)          │ │
│ │    → "Clickbait dili kullanma. Yasak..."        │ │
│ │ ❌ #30 humanizer (behavior_block)               │ │
│ │    → humanize_enabled=false — ATLANDI           │ │
│ │ ✅ #40 selected_news_summary (context_block)    │ │
│ │    → "Secilen haberler: ..."                    │ │
│ │ ✅ #100 output_contract (output_contract)       │ │
│ │    → "JSON: {items: [{headline, narration}]}"   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Provider Payload ─────────────────────────────┐ │
│ │ {"messages": [...], "model": "...", ...}        │ │
│ │ [Kopyala]                                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Inputs ───────────────────────────────────────┐ │
│ │ Settings: normalize=true, humanize=false, ...   │ │
│ │ Data: selected_news_summary=✅, category=✅     │ │
│ └─────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### 10.3 Data Source Ayrimi

Dry run iki farkli kaynak ile calisabilir. Bu ayrım UI'da acikca gosterilmelidir:

**A) Gercek job context'inden preview:**
- Mevcut bir module record'unun (news_bulletin, standard_video) verileri kullanilir
- `data_source: "job_context"` olarak isretlenir
- Dogruluk seviyesi: YUKSEK — gercek verilere dayanir
- UI'da: "Gercek veri ile preview" etiketi

**B) Admin sample input ile preview:**
- Admin, `data_overrides` ile ornek veri girer
- `data_source: "sample_input"` olarak isaretlenir
- Dogruluk seviyesi: ORTA — ornek veriye dayanir, gercek uretimden farkli olabilir
- UI'da: "Ornek veri ile preview — gercek uretimde farklilik olabilir" uyarisi

Response'a `data_source` alani eklenir:
```json
{
    "data_source": "sample_input",  // veya "job_context"
    ...
}
```

### 10.4 Onemli Kurallar

- Preview fake degil — gercek assembly mekanizmasini kullanir
- Tek fark: provider call yapilmaz
- `is_dry_run=true` olarak trace'e kaydedilir
- Preview net olarak "Assembly Preview" etiketi tasir
- Son urun gibi gosterilmez
- CLAUDE.md kurali: "previews must be clearly distinguished from final outputs" burada da gecerli

## 11. Job Detail Prompt Trace Sekmesi

### 11.1 Yerlestirme

Mevcut Job Detail sekmelerine eklenir:

```
Job Detail
├── Overview (mevcut)
├── Timeline (mevcut)
├── Logs (mevcut)
├── Artifacts (mevcut)
├── Provider Trace (mevcut — kisa referans karti eklenir)
├── Prompt Trace (YENİ — birinci sinif sekme)
├── Decision Trail (mevcut)
├── Retry History (mevcut)
├── Review State (mevcut)
├── Publish Linkage (mevcut)
└── Actions (mevcut)
```

### 11.2 Provider Trace Referans Karti

Mevcut Provider Trace sekmesine kucuk bir bilgi karti eklenir:

```
┌─ Prompt Assembly Bilgisi ────────────────────────┐
│ Assembly Run: abc123...                           │
│ Dahil Blok: 5  |  Atlanan Blok: 2                │
│ Final Prompt: 847 karakter                        │
│ [Prompt Trace Sekmesine Git →]                    │
└───────────────────────────────────────────────────┘
```

### 11.3 Prompt Trace Sekmesi Icerigi

```
Prompt Trace
├── Ozet Karti
│   ├── Assembly Run ID
│   ├── Module: news_bulletin
│   ├── Provider: kie_ai_gemini_flash
│   ├── Dahil Blok: 5  |  Atlanan: 2
│   ├── Final Prompt Uzunlugu: 847 karakter
│   └── Olusturulma: 07.04.2026 12:34:56
│
├── Final Assembled Prompt (collapsible, kopyalanabilir)
│   └── Tam metin
│
├── Block Breakdown
│   ├── ✅ Dahil Edilen Bloklar
│   │   ├── #0 narration_system (core_system)
│   │   │   ├── Rendered Text (collapsible)
│   │   │   ├── Neden: included_always
│   │   │   └── Kullanilan Degiskenler: —
│   │   ├── #10 anti_clickbait (behavior_block)
│   │   │   ├── Rendered Text
│   │   │   ├── Neden: included_by_setting
│   │   │   ├── Setting: anti_clickbait_enabled=true
│   │   │   └── Kullanilan Degiskenler: —
│   │   └── ...
│   │
│   └── ❌ Atlanan Bloklar
│       ├── #30 humanizer (behavior_block)
│       │   ├── Neden: skipped_by_setting
│       │   └── Setting: humanize_enabled=false
│       └── ...
│
├── Snapshot Detaylari (collapsible JSON drawers)
│   ├── Settings Snapshot
│   ├── Data Snapshot
│   └── Block Snapshot
│
├── Provider Request (collapsible, kopyalanabilir)
│   └── Exact payload JSON
│
└── Provider Response (collapsible)
    ├── Response JSON
    ├── Tokens: input=523, output=1204
    ├── Latency: 2341ms
    └── Hata: — (yoksa)
```

## 12. Snapshot Locking + Reproducibility

### 12.1 Job Baslangicinda Freeze

Job olusturulurken (dispatch aninda):

```python
# 1. Effective settings snapshot
settings_snapshot = await settings_resolver.resolve_all_for_module(db, module_scope)

# 2. Effective prompt block snapshot
block_snapshot = await prompt_block_service.get_effective_blocks(db, module_scope)

# 3. Data snapshot
data_snapshot = executor.build_data_snapshot(module_record, selected_items, ...)

# 4. Hepsi job.input_data_json icine yazilir
job.input_data_json = json.dumps({
    "module_id": "...",
    "_settings_snapshot": settings_snapshot,
    "_prompt_block_snapshot": [block.to_snapshot_dict() for block in block_snapshot],
    "_data_snapshot": data_snapshot,
    ...
})
```

### 12.2 Running Job Izolasyonu

- Executor her zaman `_settings_snapshot` ve `_prompt_block_snapshot`'tan okur
- DB'den canli veri cekmez
- Admin arada prompt duzenlese bile calisan job etkilenmez

### 12.3 Rerun Senaryolari

**Rerun Same Snapshot:**
- Job'un `input_data_json`'indan snapshot'lar okunur
- Ayni assembly input'lariyla yeniden calistirilir
- Ayni final prompt uretilir (determinism garantisi)

**Rerun Current Config:**
- Yeni settings snapshot alinir
- Yeni block snapshot alinir
- Data snapshot korunur (veya yeniden toplanir)
- Farkli final prompt uretilir (admin degisiklikleri yansir)

Her iki durumda da yeni PromptAssemblyRun olusturulur — eski trace korunur.

## 13. Pilot Rollout

### 13.1 news_bulletin (Ilk)

Block seti:

| Block Key | Kind | Order | Condition | Aciklama |
|-----------|------|-------|-----------|----------|
| `nb.narration_system` | core_system | 0 | always | Ana sistem talimatı |
| `nb.narration_style` | module_instruction | 10 | always | Stil ve dil kurallari |
| `nb.anti_clickbait` | behavior_block | 20 | settings_boolean: `anti_clickbait_enabled` | Clickbait engelleme |
| `nb.normalize` | behavior_block | 30 | settings_boolean: `normalize_enabled` | Baslik/icerik normalizasyonu |
| `nb.humanizer` | behavior_block | 40 | settings_boolean: `humanize_enabled` | Insansi dil zenginlestirme |
| `nb.tts_enhance` | behavior_block | 50 | settings_boolean: `tts_enhance_enabled` | TTS uyumluluk talimatlari |
| `nb.category_guidance` | context_block | 60 | data_presence: `dominant_category` | Kategori bazli yonlendirme |
| `nb.selected_news_summary` | context_block | 70 | data_presence: `selected_news_items` | Secilen haberler |
| `nb.output_contract` | output_contract | 100 | always | JSON cikti formati |

Ek: metadata step icin ayri block seti:

| Block Key | Kind | Order | Condition |
|-----------|------|-------|-----------|
| `nb.metadata_system` | core_system | 0 | always |
| `nb.metadata_title_rules` | module_instruction | 10 | always |
| `nb.metadata_seo` | behavior_block | 20 | settings_boolean: `seo_enhance_enabled` |
| `nb.metadata_output_contract` | output_contract | 100 | always |

### 13.2 standard_video (Ikinci)

Block seti:

| Block Key | Kind | Order | Condition |
|-----------|------|-------|-----------|
| `sv.script_system` | core_system | 0 | always |
| `sv.opening_hooks` | module_instruction | 10 | settings_boolean: `opening_hooks_enabled` |
| `sv.narrative_arc` | module_instruction | 20 | always |
| `sv.category_guidance` | context_block | 30 | data_presence: `category_name` |
| `sv.humanizer` | behavior_block | 40 | settings_boolean: `humanize_enabled` |
| `sv.tts_enhance` | behavior_block | 50 | settings_boolean: `tts_enhance_enabled` |
| `sv.output_contract` | output_contract | 100 | always |

Ek: metadata step icin:

| Block Key | Kind | Order | Condition |
|-----------|------|-------|-----------|
| `sv.metadata_system` | core_system | 0 | always |
| `sv.metadata_output_contract` | output_contract | 100 | always |

### 13.3 Block Ownership ve Koruma Kurallari

Her block icin net ownership ve koruma kurali:

| Block Key | Seed ile gelir | Admin override edilebilir | Disable edilebilir | Aciklama |
|-----------|---------------|--------------------------|-------------------|----------|
| `nb.narration_system` | Evet | Evet | HAYIR (core_system) | Sistem talimati |
| `nb.narration_style` | Evet | Evet | Evet | Stil kurallari |
| `nb.anti_clickbait` | Evet | Evet | Evet | Clickbait engel |
| `nb.normalize` | Evet | Evet | Evet | Normalizasyon |
| `nb.humanizer` | Evet | Evet | Evet | Insansi dil |
| `nb.tts_enhance` | Evet | Evet | Evet | TTS uyum |
| `nb.category_guidance` | Evet | Evet | Evet | Kategori baglami |
| `nb.selected_news_summary` | Evet | Evet | Evet | Haber baglami |
| `nb.output_contract` | Evet | Evet | HAYIR (output_contract) | Cikti formati |

Ayni kurallar `sv.*` block'lari icin de gecerli. `core_system` ve `output_contract` kind'li block'lar:
- `block_seed.py` ile gelir
- Admin icerigini override edebilir (content_template degisebilir)
- Ama disable veya delete EDEMEZ
- UI'da disable butonu pasif, tooltip: "Bu blok sistem butunlugu icin gereklidir"
- Backend'de `status` degisikligi icin kind kontrolu yapilir

### 13.4 Architecture Esnekligi

Her iki modul ayni PromptAssemblyService'i, ayni ConditionEvaluator'i, ayni TemplateRenderer'i kullanir. Yeni modul eklemek = yeni block tanimlari seed etmek.

## 14. Test Stratejisi

### A) Domain / Persistence
- PromptBlock CRUD
- Assembly run persistence
- Block trace persistence
- Cascade delete (run silinince trace'ler de silinsin)

### B) Condition Evaluation
- Her 6 condition turu icin: included ve skipped senaryolari
- enabled_by_default etkilesimi
- Edge case: settings key yok, data key yok

### C) Rendering
- Normal substitution
- Missing non-critical variable → bos string + warning
- Missing critical variable → block skip
- Bos render → skip
- Ozel karakterler, Unicode

### D) Deterministic Assembly
- Ayni snapshot → ayni final prompt (3x tekrar)
- Order stability
- Included/skipped consistency

### E) Provider Integration
- Payload dogru olusturuyor
- Request trace yaziliyor
- Response trace yaziliyor
- Error trace yaziliyor
- assembly_run_id step'e baglanıyor

### F) Admin UI
- Block listesi geliyor ve siralaniyor
- Condition ozeti dogru gorunuyor
- Related rules bolumu dogru
- Reset/default calisiyor
- Override state badge dogru
- Module/provider filtre calisiyor

### G) Dry Run
- Preview endpoint dogru sonuc donuyor
- Block breakdown dogru
- No provider call
- is_dry_run=true trace'e dusyor
- Settings/data override calisiyor

### H) Job Detail
- Prompt Trace sekmesi gorunuyor
- Final prompt dogru
- Included/skipped block listesi dogru
- Rendered text goruntuleniyor
- Provider request/response gorunuyor
- Provider Trace'te referans karti var

### I) Snapshot Locking
- Running job canli degisiklikten etkilenmiyor
- Rerun same snapshot → ayni prompt
- Rerun current config → farkli prompt

## 15. Riskler

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| Mevcut prompt_builder.py gecisi sirasında regression | Orta | Yuksek | Paralel calisan eski/yeni karsilastirma testi |
| Block sayisi artinca assembly performansi | Dusuk | Dusuk | Block sayisi < 20 olacak, in-memory islem |
| Admin yanlis block disable ederse prompt bozulur | Orta | Orta | core_system ve output_contract block'lari disable edilemez (UI uyarisi) |
| Snapshot JSON buyuklugu disk alani | Dusuk | Dusuk | Snapshot compress edilebilir, eski dry-run trace'leri temizlenebilir |

## 16. Bilincli Ertelenenler

1. **Block versiyonlama history** — v1'de `admin_override_template` yalnizca current effective override'i tutar. Full version history (diff goruntuleme, rollback, override timeline) bilincli olarak ertelenmistir. `version` alani her update'te artar ama eski degerler saklanmaz
2. **Coklu condition expression** — v1'de tek condition_type yeterli; AND/OR zinciri ileride
3. **A/B prompt testi** — Ayni job icin farkli assembly ile karsilastirma ileride
4. **Block dependency graph** — Block'lar arasi bagimlilik (B, A'dan sonra gelmeli) ileride; order_index yeterli
5. **Automatic block suggestion** — AI-assisted block onerisi ileride
6. **Cost prediction** — Token sayisi tahmini dry run'da gosterilebilir ama provider-level; ileride
7. **Multi-provider payload diff** — Ayni prompt farkli provider formatlarinda nasil gozukur; ileride

## 17. Dosya Yapisi (Beklenen)

### Backend
```
backend/app/prompt_assembly/
├── __init__.py
├── models.py              # PromptBlock, PromptAssemblyRun, PromptAssemblyBlockTrace
├── schemas.py             # Pydantic schemas
├── service.py             # PromptAssemblyService
├── condition_evaluator.py # ConditionEvaluator
├── template_renderer.py   # TemplateRenderer
├── trace_service.py       # PromptTraceService
├── payload_builder.py     # ProviderPayloadBuilder
├── block_seed.py          # Seed data for builtin blocks
└── router.py              # API endpoints (CRUD, preview, traces)

backend/alembic/versions/
└── xxxx_add_prompt_assembly_tables.py
```

### Frontend
```
frontend/src/
├── api/promptAssemblyApi.ts
├── hooks/
│   ├── usePromptBlocks.ts
│   ├── usePromptAssemblyPreview.ts
│   └── usePromptTrace.ts
├── pages/admin/
│   └── PromptEditorPage.tsx          # Genisletilmis
├── components/
│   ├── prompt-assembly/
│   │   ├── PromptBlockList.tsx
│   │   ├── PromptBlockCard.tsx
│   │   ├── PromptBlockDetailPanel.tsx
│   │   ├── RelatedRulesSection.tsx
│   │   ├── PromptPreviewSection.tsx
│   │   ├── BlockBreakdownView.tsx
│   │   └── PayloadPreview.tsx
│   └── jobs/
│       └── JobPromptTracePanel.tsx    # Job Detail'e eklenen yeni panel
```
