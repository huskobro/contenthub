"""
SSE Router (Phase M1-C3)

Provides the Server-Sent Events streaming endpoint.

Endpoint:
    GET /sse/jobs/{job_id}

The client connects and receives a stream of SSE events scoped to
the given job_id. The server streams until the client disconnects.

Uses FastAPI StreamingResponse with text/event-stream content type
(no sse-starlette dependency required).

No auth for MVP (localhost-only).
"""

import uuid
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.sse.bus import event_bus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sse", tags=["sse"])


@router.get("/jobs/{job_id}")
async def stream_job_events(job_id: str) -> StreamingResponse:
    """
    Stream SSE events for a specific job.

    The client receives all events published to the global bus while
    connected. The job_id is embedded in the stream_scope field of
    each event payload — clients should filter by job_id if needed.

    Client disconnect is detected when the generator raises
    GeneratorExit or the response is closed, at which point the
    subscriber is unsubscribed from the bus.
    """
    client_id = f"{job_id}:{uuid.uuid4()}"
    logger.debug("SSE stream opened: client=%s job=%s", client_id, job_id)

    async def event_stream():
        try:
            async for message in event_bus.subscribe(client_id):
                yield message
        except GeneratorExit:
            pass
        finally:
            event_bus.unsubscribe(client_id)
            logger.debug("SSE stream closed: client=%s job=%s", client_id, job_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
