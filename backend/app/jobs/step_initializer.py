"""
Job Adım Başlatıcı (M2-C6)

Job yaratıldıktan sonra modüle ait JobStep kayıtlarını oluşturur ve
workspace dizin yapısını hazırlar.

Sorumluluğu:
  - Modül tanımındaki her StepDefinition için JobStep DB satırı yazar
  - Workspace dizinlerini (artifacts/, preview/, tmp/) oluşturur

Bu helper service.py'den ayrı tutulur; service.py'nin veri katmanı
sorumluluğu şişmesini önler.

SONRAKİ CHUNK NOTU:
  M3 kapsamında workspace_path job.workspace_path alanına yazılmalı;
  bu aşamada workspace path sadece disk'te oluşturuluyor, ORM alanı güncellenmez.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import JobStep
from app.jobs import workspace
from app.modules.registry import ModuleRegistry


async def initialize_job_steps(
    db: AsyncSession,
    job_id: str,
    module_id: str,
    registry: ModuleRegistry,
) -> None:
    """
    Modül tanımındaki her adım için JobStep DB satırı oluşturur.
    Workspace dizin yapısını başlatır.

    Args:
        db        : Async DB session.
        job_id    : Adımların bağlanacağı job kimliği.
        module_id : Adım tanımları alınacak modülün kimliği.
        registry  : ModuleRegistry örneği (global singleton veya test registry).

    Notlar:
        - Modül kayıtlı değilse adım oluşturulmaz, sessizce geçer.
        - Workspace dizini idempotent biçimde oluşturulur (varsa hata vermez).
    """
    steps = registry.get_steps(module_id)
    if not steps:
        return

    for step_def in steps:
        step = JobStep(
            job_id=job_id,
            step_key=step_def.step_key,
            step_order=step_def.step_order,
            status="pending",
            idempotency_type=step_def.idempotency_type,
        )
        db.add(step)

    await db.commit()

    # Workspace dizinini başlat (artifacts/, preview/, tmp/)
    workspace.create_job_workspace(job_id)
