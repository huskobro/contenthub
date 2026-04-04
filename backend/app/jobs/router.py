"""
Job Engine API router (M2-C6 güncelleme).

Endpointler:
  GET  /api/v1/jobs                    — iş listesi (opsiyonel filtre)
  GET  /api/v1/jobs/{job_id}           — tek iş + adımları
  POST /api/v1/jobs                    — yeni iş yarat + pipeline başlat
  GET  /api/v1/jobs/{job_id}/artifacts — workspace artifact listesi

Sorumlulukları:
  - HTTP request/response yönetimi
  - Request payload'ı doğrulama (Pydantic)
  - service ve dispatcher çağrısı

Bu dosyada YOKTUR:
  - İş mantığı (service.py)
  - Pipeline orchestration (dispatcher.py)
  - Adım başlatma (step_initializer.py)
"""

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.jobs import service
from app.jobs.schemas import JobCreate, JobCreateRequest, JobResponse, JobStepResponse
from app.jobs.step_initializer import initialize_job_steps
from app.modules.exceptions import ModuleNotFoundError, InputValidationError
from app.modules.input_normalizer import InputNormalizer
from app.modules.registry import module_registry
from app.jobs import workspace as ws

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    status: Optional[str] = Query(None),
    module_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """İş listesini döndürür. status ve module_type ile filtrelenebilir."""
    jobs = await service.list_jobs(db, status=status, module_type=module_type)
    result = []
    for job in jobs:
        steps = await service.get_job_steps(db, job.id)
        job_data = JobResponse.model_validate(job)
        job_data.steps = [JobStepResponse.model_validate(s) for s in steps]
        result.append(job_data)
    return result


@router.get("/{job_id}/artifacts")
async def get_job_artifacts(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    Belirtilen iş için workspace/artifacts/ dizinindeki dosyaları listeler.

    Dönen yapı:
        {
            "job_id": "...",
            "artifacts": [
                {"name": "script.json", "path": "artifacts/script.json", "type": "json"},
                ...
            ]
        }
    """
    job = await service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")

    artifacts_dir: Path = ws.get_workspace_path(job_id) / "artifacts"
    artifacts = []

    if artifacts_dir.exists():
        for file_path in sorted(artifacts_dir.iterdir()):
            if file_path.is_file():
                suffix = file_path.suffix.lstrip(".") or "bin"
                artifacts.append({
                    "name": file_path.name,
                    "path": f"artifacts/{file_path.name}",
                    "type": suffix,
                })

    return {"job_id": job_id, "artifacts": artifacts}


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Belirtilen işi adımlarıyla birlikte döndürür."""
    job = await service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    steps = await service.get_job_steps(db, job_id)
    job_data = JobResponse.model_validate(job)
    job_data.steps = [JobStepResponse.model_validate(s) for s in steps]
    return job_data


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    payload: JobCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Yeni bir iş yarat, adımları başlat ve pipeline'ı tetikle.

    İşlem sırası:
      1. InputNormalizer ile modül varlığını ve zorunlu alanları doğrula.
      2. Normalize edilmiş input'u JSON'a serileştir.
      3. JobCreate ile DB'ye job kaydet.
      4. initialize_job_steps ile adımları ve workspace'i hazırla.
      5. JobDispatcher aracılığıyla pipeline'ı arka planda başlat.
      6. Job + adımlarla birlikte 201 dön.

    Hatalar:
      - 422: Geçersiz dil kodu (Pydantic doğrulaması)
      - 422: Modül bulunamadı veya zorunlu alan eksik
    """
    # Modül varlığı ve zorunlu alan doğrulaması
    normalizer = InputNormalizer(module_registry)
    raw_input = {"topic": payload.topic, "language": payload.language, "duration_seconds": payload.duration_seconds}

    try:
        normalized = normalizer.normalize(payload.module_id, raw_input)
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Modül bulunamadı: {exc.module_id!r}",
        )
    except InputValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Girdi doğrulama hatası [{exc.field!r}]: {exc.reason}",
        )

    # Job DB kaydı oluştur
    job_create = JobCreate(
        module_type=payload.module_id,
        input_data_json=json.dumps(normalized),
    )
    job = await service.create_job(db, job_create)

    # Adımları ve workspace'i başlat
    await initialize_job_steps(db, job.id, payload.module_id, module_registry)

    # Pipeline'ı dispatcher üzerinden arka planda başlat
    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is not None:
        await dispatcher.dispatch(job.id)
    else:
        # Dispatcher app.state'e bağlanmamışsa (örn. test ortamı) sessizce geç
        import logging
        logging.getLogger(__name__).warning(
            "JobDispatcher app.state'de bulunamadı, pipeline başlatılmadı. job_id=%s", job.id
        )

    # Güncel adımları al ve response oluştur
    steps = await service.get_job_steps(db, job.id)
    job_data = JobResponse.model_validate(job)
    job_data.steps = [JobStepResponse.model_validate(s) for s in steps]
    return job_data
