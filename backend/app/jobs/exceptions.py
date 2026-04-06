"""
Job Engine — Exception Model (Phase 1.2)

Provides distinct exception types for different failure modes in the job
and step lifecycle. Callers should catch specific types rather than bare
Exception so that routers can map errors to correct HTTP status codes.

Exception hierarchy:

    JobEngineError (base)
    ├── JobNotFoundError          → HTTP 404
    ├── StepNotFoundError         → HTTP 404
    └── InvalidTransitionError    → HTTP 409 (Conflict)

Usage in routers:
    try:
        await service.transition_job_status(db, job_id, "running")
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="Job not found")
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

Usage in services / executor:
    # validate only — don't write yet
    validate_job_transition(current_status, next_status)  # raises InvalidTransitionError

    # validate + write
    await transition_job_status(db, job, "running")       # raises both types
"""


class JobEngineError(Exception):
    """Base class for all job engine errors."""


class JobNotFoundError(JobEngineError):
    """Raised when a job_id cannot be found in the database."""

    def __init__(self, job_id: str) -> None:
        self.job_id = job_id
        super().__init__(f"Job not found: {job_id!r}")


class StepNotFoundError(JobEngineError):
    """Raised when a step_id or (job_id, step_key) cannot be found."""

    def __init__(self, identifier: str) -> None:
        self.identifier = identifier
        super().__init__(f"JobStep not found: {identifier!r}")


class StepExecutionError(JobEngineError):
    """
    Raised by a StepExecutor when a step fails during execution.

    Attributes:
        step_key  : the step that failed
        reason    : human-readable failure description
        retryable : True if the error is transient and a retry may succeed.
                    False if operator intervention is required (e.g. auth error).
                    Default: True (conservative — unknown errors assumed transient).
    """

    def __init__(self, step_key: str, reason: str, retryable: bool = True) -> None:
        self.step_key = step_key
        self.reason = reason
        self.retryable = retryable
        super().__init__(f"Step execution failed [{step_key!r}]: {reason}")


class ModuleDisabledError(JobEngineError):
    """Raised when attempting to create a job for a disabled module."""

    def __init__(self, module_id: str) -> None:
        self.module_id = module_id
        super().__init__(f"Modül devre dışı: {module_id!r}. Yeni üretim başlatılamaz.")


class InvalidTransitionError(JobEngineError):
    """
    Raised when a requested state transition is not permitted by the
    state machine (either JobStateMachine or StepStateMachine).

    Attributes:
        entity       : 'job' or 'step'
        entity_id    : the job_id or step_id that was being transitioned
        from_status  : the current status string
        to_status    : the rejected next status string
    """

    def __init__(
        self,
        entity: str,
        entity_id: str,
        from_status: str,
        to_status: str,
    ) -> None:
        self.entity = entity
        self.entity_id = entity_id
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(
            f"Invalid {entity} transition for {entity_id!r}: "
            f"{from_status!r} → {to_status!r}"
        )
