"""
PHASE AA — Preview artifact surface.

Mevcut ArtifactScope / ArtifactKind contract'ini (app/contracts/enums.py) yuzeye
cikaran ince bir servis katmani. Paralel bir artifact sistemi DEGIL:
  - Executor'lar artifact'leri workspace/{job_id}/artifacts/ altina yazmaya
    devam eder (mevcut davranis korunur).
  - Bu modul dosya adlari uzerinden deterministik bir classifier uygular ve
    her dosyayi (kind, scope, source_step) ile etiketler.
  - Final / preview ayrimini API yuzeyine cikarir — frontend "onizleme"
    badge'ini bu yuzeyden okur.

Ownership:
  Tum endpoint'ler jobs/router.py ile ayni _enforce_job_ownership kontratini
  kullanir; admin global, user kendi verisi, orphan job user'a 403.

Preview vs final ayrimi:
  Classifier, mevcut dosya isimlendirmelerinden scope cikarir:
    *preview_frame.jpg / preview_*.mp4 / preview_*.json  -> PREVIEW
    final.mp4 / render.mp4 / thumbnail.jpg / composition_props.json -> FINAL
    tmp_*.*                                             -> TEMP (listede gizli)
  Belirsiz kalanlar GENERIC + FINAL kabul edilir (dürüst default).
"""
