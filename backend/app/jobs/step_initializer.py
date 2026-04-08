"""
Job Adım Başlatıcı (M2-C6, M42 user-scoped workspace)

Job yaratıldıktan sonra modüle ait JobStep kayıtlarını oluşturur ve
workspace dizin yapısını hazırlar.

Sorumluluğu:
  - Modül tanımındaki her StepDefinition için JobStep DB satırı yazar
  - User-scoped veya global workspace dizinlerini oluşturur
  - job.workspace_path DB alanını günceller

Bu helper service.py'den ayrı tutulur; service.py'nin veri katmanı
sorumluluğu şişmesini önler.

M42: user_slug varsa workspace/users/{slug}/jobs/{job_id}/ altında oluşturulur.
     Yoksa eski layout (workspace/{job_id}/) korunur (backward compat).
     Her durumda job.workspace_path DB'ye yazılır.
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from app.db.models import Job, JobStep
from app.jobs import workspace
from app.modules.registry import ModuleRegistry

logger = logging.getLogger(__name__)


async def initialize_job_steps(
    db: AsyncSession,
    job_id: str,
    module_id: str,
    registry: ModuleRegistry,
    user_slug: Optional[str] = None,
) -> str:
    """
    Modül tanımındaki her adım için JobStep DB satırı oluşturur.
    Workspace dizin yapısını başlatır ve job.workspace_path'i günceller.

    Args:
        db        : Async DB session.
        job_id    : Adımların bağlanacağı job kimliği.
        module_id : Adım tanımları alınacak modülün kimliği.
        registry  : ModuleRegistry örneği (global singleton veya test registry).
        user_slug : Kullanıcı slug'ı (opsiyonel). Varsa user-scoped workspace oluşturulur.

    Returns:
        Oluşturulan workspace'in absolute path string'i.

    Notlar:
        - Modül kayıtlı değilse adım oluşturulmaz, sessizce geçer.
        - Workspace dizini idempotent biçimde oluşturulur (varsa hata vermez).
    """
    steps = registry.get_steps(module_id)
    if not steps:
        return ""

    for step_def in steps:
        step = JobStep(
            job_id=job_id,
            step_key=step_def.step_key,
            step_order=step_def.step_order,
            status="pending",
            idempotency_type=step_def.idempotency_type,
        )
        db.add(step)

    # Workspace dizinini başlat — user-scoped veya global
    if user_slug:
        ws_path = workspace.create_user_job_workspace(user_slug, job_id)
        logger.info("User-scoped workspace oluşturuldu: %s (user=%s job=%s)", ws_path, user_slug, job_id)
    else:
        ws_path = workspace.create_job_workspace(job_id)
        logger.info("Global workspace oluşturuldu: %s (job=%s)", ws_path, job_id)

    # job.workspace_path DB'ye yaz
    await db.execute(
        update(Job).where(Job.id == job_id).values(workspace_path=str(ws_path))
    )
    await db.commit()

    return str(ws_path)
