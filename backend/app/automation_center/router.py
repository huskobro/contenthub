"""
Automation Center — aggregate HTTP router.

One project resource, six write endpoints + one GET. Mounted under:
  /api/v1/automation-center/content-projects/{project_id}

Ownership:
  - Non-admin can only operate on their own ContentProject.
  - Admin bypasses ownership; daily cap force still requires admin.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.automation_center import service
from app.automation_center.schemas import (
    AutomationCenterResponse,
    AutomationFlowPatch,
    AutomationNodePatch,
    EvaluateResponse,
    NodeTestRequest,
    NodeTestResponse,
    RunNowRequest,
    RunNowResponse,
)
from app.db.models import ContentProject
from app.db.session import get_db

router = APIRouter(
    prefix="/automation-center/content-projects",
    tags=["Automation Center"],
)


async def _load_project_or_404(
    db: AsyncSession, project_id: str
) -> ContentProject:
    project = await db.get(ContentProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    return project


@router.get(
    "/{project_id}", response_model=AutomationCenterResponse
)
async def get_automation_center(
    project_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project_or_404(db, project_id)
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")
    return await service.get_automation_center(db, project=project)


@router.patch(
    "/{project_id}/flow", response_model=AutomationCenterResponse
)
async def patch_flow(
    project_id: str,
    payload: AutomationFlowPatch,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project_or_404(db, project_id)
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")
    try:
        return await service.patch_flow(db, ctx=ctx, project=project, payload=payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        )


@router.patch(
    "/{project_id}/nodes/{node_id}", response_model=AutomationCenterResponse
)
async def patch_node(
    project_id: str,
    node_id: str,
    payload: AutomationNodePatch,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project_or_404(db, project_id)
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")
    try:
        return await service.patch_node(
            db, ctx=ctx, project=project, node_id=node_id, payload=payload
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        )


@router.post(
    "/{project_id}/evaluate", response_model=EvaluateResponse
)
async def evaluate(
    project_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project_or_404(db, project_id)
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")
    return await service.evaluate(db, project=project)


@router.post(
    "/{project_id}/run-now", response_model=RunNowResponse
)
async def run_now(
    project_id: str,
    payload: RunNowRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project_or_404(db, project_id)
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")
    if payload.force and not ctx.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sadece admin gunluk siniri zorlayabilir.",
        )
    return await service.run_now(db, ctx=ctx, project=project, payload=payload)


@router.post(
    "/{project_id}/nodes/{node_id}/test", response_model=NodeTestResponse
)
async def test_node(
    project_id: str,
    node_id: str,
    payload: NodeTestRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project_or_404(db, project_id)
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")
    return await service.test_node(
        db, ctx=ctx, project=project, node_id=node_id, payload=payload
    )
