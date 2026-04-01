"""Job Engine API router — Phase 7.

Endpoints:
  GET  /api/v1/jobs              — list jobs (optional status/module_type filter)
  GET  /api/v1/jobs/{job_id}     — single job with steps
  POST /api/v1/jobs              — create a new job
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.jobs import service
from app.jobs.schemas import JobCreate, JobResponse, JobStepResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    status: Optional[str] = Query(None),
    module_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    jobs = await service.list_jobs(db, status=status, module_type=module_type)
    result = []
    for job in jobs:
        steps = await service.get_job_steps(db, job.id)
        job_data = JobResponse.model_validate(job)
        job_data.steps = [JobStepResponse.model_validate(s) for s in steps]
        result.append(job_data)
    return result


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    steps = await service.get_job_steps(db, job_id)
    job_data = JobResponse.model_validate(job)
    job_data.steps = [JobStepResponse.model_validate(s) for s in steps]
    return job_data


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(payload: JobCreate, db: AsyncSession = Depends(get_db)):
    job = await service.create_job(db, payload)
    job_data = JobResponse.model_validate(job)
    job_data.steps = []
    return job_data
