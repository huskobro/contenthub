"""
SSE Event Bus (Phase M1-C3)

In-process async event bus for Server-Sent Events.

Architecture:
  - One asyncio.Queue per subscriber (never a shared queue).
  - Subscribers are keyed by client_id (str).
  - publish() enqueues a message to every active subscriber.
  - subscribe() yields SSE-formatted strings until the client disconnects.
  - unsubscribe() removes the subscriber and signals the generator to stop.

This bus is single-process only (asyncio, not threading).
It is not safe to share across multiple OS processes or workers.

Global singleton:
  from app.sse.bus import event_bus
"""

import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_SENTINEL = object()  # signals the subscriber generator to stop


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class EventBus:
    """
    In-process asyncio event bus for SSE delivery.

    Each connected client owns a private asyncio.Queue.
    publish() enqueues to every queue; subscribe() drains a single queue.
    """

    def __init__(self) -> None:
        # client_id → asyncio.Queue
        self._subscribers: dict[str, asyncio.Queue] = {}

    # ------------------------------------------------------------------
    # Core pub/sub
    # ------------------------------------------------------------------

    def publish(self, event_type: str, payload: dict) -> None:
        """
        Broadcast an event to every active subscriber.

        Formats each message as a standard SSE string:
            data: {json}\\n\\n

        Runs synchronously (no await) so it can be called from regular
        async code without extra ceremony.
        """
        message = _format_sse(event_type, payload)
        dead_clients: list[str] = []
        for client_id, queue in self._subscribers.items():
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                logger.warning(
                    "SSE queue full for client %s — dropping event %s",
                    client_id, event_type,
                )
            except Exception:
                dead_clients.append(client_id)
        for cid in dead_clients:
            self._subscribers.pop(cid, None)

    async def subscribe(
        self,
        client_id: str,
        heartbeat_interval: float = 25.0,
    ) -> AsyncGenerator[str, None]:
        """
        Async generator that yields SSE-formatted strings for this client.

        Creates a per-subscriber queue. Yields messages until:
          - the sentinel value is received (unsubscribe was called), or
          - the generator is garbage-collected / closed by the caller.

        Heartbeat: idle bağlantıların browser/proxy tarafından kesilmesini
        engellemek için her heartbeat_interval saniyede bir SSE comment
        mesajı (": heartbeat") gönderir. SSE spec'e göre comment satırları
        istemci tarafından sessizce yok sayılır.

        Cleans up the queue on exit (normal or exceptional).
        """
        queue: asyncio.Queue = asyncio.Queue(maxsize=256)
        self._subscribers[client_id] = queue
        logger.debug("SSE subscriber registered: %s", client_id)
        try:
            while True:
                try:
                    item = await asyncio.wait_for(
                        queue.get(), timeout=heartbeat_interval,
                    )
                except asyncio.TimeoutError:
                    # Heartbeat — SSE comment line (istemci tarafından ignore edilir)
                    yield ": heartbeat\n\n"
                    continue
                if item is _SENTINEL:
                    break
                yield item
        finally:
            self._subscribers.pop(client_id, None)
            logger.debug("SSE subscriber removed: %s", client_id)

    def unsubscribe(self, client_id: str) -> None:
        """
        Signal the subscriber's generator to stop and remove the client.

        Safe to call multiple times or for unknown client_ids.
        """
        queue = self._subscribers.get(client_id)
        if queue is not None:
            try:
                queue.put_nowait(_SENTINEL)
            except asyncio.QueueFull:
                # Queue full — forcibly remove so the subscriber exits on next poll
                self._subscribers.pop(client_id, None)

    # ------------------------------------------------------------------
    # Convenience helpers for pipeline events
    # ------------------------------------------------------------------

    def publish_job_update(
        self,
        job_id: str,
        status: str,
        step_key: Optional[str],
    ) -> None:
        """
        Publish a job status change event.

        Maps to SSEEventType.JOB_STATUS_CHANGED.
        Payload keys match JobStatusChangedPayload (lightweight subset for bus).
        """
        payload = {
            "job_id": job_id,
            "status": status,
            "step_key": step_key,
            "emitted_at": _now_iso(),
        }
        self.publish("job:status_changed", payload)

    def publish_step_update(
        self,
        job_id: str,
        step_key: str,
        status: str,
    ) -> None:
        """
        Publish a step status change event.

        Maps to SSEEventType.JOB_STEP_CHANGED.
        """
        payload = {
            "job_id": job_id,
            "step_key": step_key,
            "status": status,
            "emitted_at": _now_iso(),
        }
        self.publish("job:step_changed", payload)

    # ------------------------------------------------------------------
    # Introspection (tests / admin)
    # ------------------------------------------------------------------

    def subscriber_count(self) -> int:
        """Return the number of active subscribers."""
        return len(self._subscribers)


# ---------------------------------------------------------------------------
# SSE formatting
# ---------------------------------------------------------------------------

def _format_sse(event_type: str, payload: dict) -> str:
    """
    Format an event as a standard SSE string.

    Output:
        event: {event_type}
        data: {json_payload}

        (two trailing newlines terminate the message per SSE spec)
    """
    data = json.dumps(payload, default=str)
    return f"event: {event_type}\ndata: {data}\n\n"


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------

event_bus: EventBus = EventBus()
