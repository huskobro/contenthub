# M12 Visibility Enforcement Raporu

## Genel Bakis
M12'de require_visible() guard'i 9 admin router'a uygulandi. Artik visibility rule'lar backend'de gercek 403 donuyor.

## Guard Uygulanan Router'lar (9 adet)
| Router | Dosya | Guard target_key | Kapsam |
|--------|-------|-----------------|--------|
| Settings | settings/router.py | panel:settings | Router seviyesi -- tum endpoint'ler |
| Visibility Rules | visibility/router.py | panel:visibility | Endpoint seviyesi -- 4 CRUD, /resolve acik |
| Sources | sources/router.py | panel:sources | Router seviyesi |
| Source Scans | source_scans/router.py | panel:source-scans | Router seviyesi |
| Publish | publish/router.py | panel:publish | Router seviyesi |
| Providers | providers/router.py | panel:providers | Router seviyesi |
| Analytics | analytics/router.py | panel:analytics | Router seviyesi |
| Templates | modules/templates/router.py | panel:templates | Router seviyesi |
| Style Blueprints | modules/style_blueprints/router.py | panel:style-blueprints | Router seviyesi |

## Guard Uygulanmayan Router'lar ve Nedenleri
- Jobs: Kullanici icerigi -- her kullanici kendi job'larini gorebilmeli
- News Items: Icerik havuzu -- tarama sonuclari herkes tarafindan erisilebilir
- Used News: Icerik takibi
- Standard Video Module: Kullanici uretim akisi
- News Bulletin Module: Kullanici uretim akisi
- SSE: Gercek zamanli stream
- Health: Saglik kontrolu
- Onboarding: Tek seferlik kurulum

## Teknik Detay
- Router seviyesinde: `APIRouter(dependencies=[Depends(require_visible("panel:xxx"))])`
- Endpoint seviyesinde (visibility router): `@router.get("...", dependencies=[Depends(require_visible("panel:visibility"))])`
- /resolve endpoint'i acik birakildi -- client visibility sorgusu yapabilsin

## Varsayilan Davranis
- Eger veritabaninda ilgili target_key icin VisibilityRule yoksa: visible=True (permissive default)
- Yani guard eklemek mevcut davranisi bozmaz -- rule eklendiginde devreye girer
