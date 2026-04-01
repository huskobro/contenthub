"""Job Engine service layer."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep
from app.jobs.schemas import JobCreate


async def list_jobs(
    db: AsyncSession,
    status: Optional[str] = None,
    module_type: Optional[str] = None,
) -> list[Job]:
    stmt = select(Job).order_by(Job.created_at.desc())
    if status:
        stmt = stmt.where(Job.status == status)
    if module_type:
        stmt = stmt.where(Job.module_type == module_type)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_job(db: AsyncSession, job_id: str) -> Optional[Job]:
    result = await db.execute(select(Job).where(Job.id == job_id))
    return result.scalar_one_or_none()


async def get_job_steps(db: AsyncSession, job_id: str) -> list[JobStep]:
    result = await db.execute(
        select(JobStep)
        .where(JobStep.job_id == job_id)
        .order_by(JobStep.step_order)
    )
    return list(result.scalars().all())


async def create_job(db: AsyncSession, payload: JobCreate) -> Job:
    job = Job(
        module_type=payload.module_type,
        owner_id=payload.owner_id,
        template_id=payload.template_id,
        source_context_json=payload.source_context_json,
        workspace_path=payload.workspace_path,
        status="queued",
        retry_count=0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job
