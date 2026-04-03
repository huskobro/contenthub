"""
Execution Contract — State Machines (Phase 1.1)

Enforces legal state transitions for Job and JobStep lifecycles.
Any code that changes a Job.status or JobStep.status MUST go through
these machines. Direct DB writes that bypass transition validation are
a contract violation.

Usage (Phase 1.2+ executor will call this):

    from app.contracts.state_machine import JobStateMachine, StepStateMachine
    from app.contracts.enums import JobStatus, JobStepStatus

    # Validate before writing to DB:
    JobStateMachine.validate(current="queued", next_status="running")
    StepStateMachine.validate(current="pending", next_status="running")

    # Or use the raise-on-failure helper:
    JobStateMachine.transition("queued", "running")   # returns next_status string
    JobStateMachine.transition("queued", "completed") # raises ValueError

Design notes:
- The transition tables are the single authoritative source for allowed moves.
- Adding a new state requires updating BOTH the enum in enums.py AND the
  transition table here. Do not add states to one without the other.
- "Rerun/clone" of a completed/failed job is a separate operation that
  creates a NEW Job record — it does not recycle the terminal state.
"""

from typing import Dict, FrozenSet
from app.contracts.enums import JobStatus, JobStepStatus


# ---------------------------------------------------------------------------
# Job transition matrix
#
# Key   : current state
# Value : set of states that are legal next states from the current state
#
# Terminal states (completed, failed, cancelled) have empty sets — no
# further transitions are allowed on the same Job record.
# ---------------------------------------------------------------------------

_JOB_TRANSITIONS: Dict[JobStatus, FrozenSet[JobStatus]] = {
    JobStatus.QUEUED: frozenset({
        JobStatus.RUNNING,
        JobStatus.CANCELLED,
    }),
    JobStatus.RUNNING: frozenset({
        JobStatus.WAITING,
        JobStatus.RETRYING,
        JobStatus.COMPLETED,
        JobStatus.FAILED,
        JobStatus.CANCELLED,
    }),
    JobStatus.WAITING: frozenset({
        JobStatus.RUNNING,      # Review approved / async response received
        JobStatus.RETRYING,
        JobStatus.FAILED,
        JobStatus.CANCELLED,
    }),
    JobStatus.RETRYING: frozenset({
        JobStatus.RUNNING,      # Retry started
        JobStatus.FAILED,       # Retry also failed / retries exhausted
        JobStatus.CANCELLED,
    }),
    # Terminal states — no outgoing transitions
    JobStatus.COMPLETED: frozenset(),
    JobStatus.FAILED: frozenset(),
    JobStatus.CANCELLED: frozenset(),
}


# ---------------------------------------------------------------------------
# Step transition matrix
# ---------------------------------------------------------------------------

_STEP_TRANSITIONS: Dict[JobStepStatus, FrozenSet[JobStepStatus]] = {
    JobStepStatus.PENDING: frozenset({
        JobStepStatus.RUNNING,
        JobStepStatus.SKIPPED,   # Settings/module config may skip a step
    }),
    JobStepStatus.RUNNING: frozenset({
        JobStepStatus.COMPLETED,
        JobStepStatus.FAILED,
        JobStepStatus.RETRYING,
    }),
    JobStepStatus.RETRYING: frozenset({
        JobStepStatus.RUNNING,   # Retry attempt begins
        JobStepStatus.FAILED,    # Retries exhausted
    }),
    # Terminal states
    JobStepStatus.COMPLETED: frozenset(),
    JobStepStatus.FAILED: frozenset(),
    JobStepStatus.SKIPPED: frozenset(),
}


# ---------------------------------------------------------------------------
# State machine implementations
# ---------------------------------------------------------------------------

class JobStateMachine:
    """Enforces legal Job lifecycle transitions."""

    @staticmethod
    def validate(current: str, next_status: str) -> None:
        """
        Validate that transitioning from `current` to `next_status` is legal.

        Raises ValueError if the transition is not allowed.
        Does NOT write to the database — call this before updating Job.status.

        Args:
            current     : The current Job.status string value.
            next_status : The proposed next Job.status string value.

        Raises:
            ValueError: Unknown status value, or illegal transition.
        """
        try:
            current_enum = JobStatus(current)
        except ValueError:
            raise ValueError(
                f"JobStateMachine: unknown current status '{current}'. "
                f"Valid values: {[s.value for s in JobStatus]}"
            )
        try:
            next_enum = JobStatus(next_status)
        except ValueError:
            raise ValueError(
                f"JobStateMachine: unknown next status '{next_status}'. "
                f"Valid values: {[s.value for s in JobStatus]}"
            )

        allowed = _JOB_TRANSITIONS[current_enum]
        if next_enum not in allowed:
            allowed_strs = sorted(s.value for s in allowed) if allowed else []
            raise ValueError(
                f"JobStateMachine: transition '{current}' → '{next_status}' is not allowed. "
                f"Allowed from '{current}': {allowed_strs}"
            )

    @staticmethod
    def transition(current: str, next_status: str) -> str:
        """
        Validate and return the next status string.

        Convenience wrapper — validates then returns next_status unchanged,
        so callers can write: job.status = JobStateMachine.transition(job.status, "running")

        Raises ValueError on illegal transition (same as validate).
        """
        JobStateMachine.validate(current, next_status)
        return next_status

    @staticmethod
    def allowed_next(current: str) -> list:
        """Return a list of legal next status strings from `current`."""
        try:
            current_enum = JobStatus(current)
        except ValueError:
            return []
        return sorted(s.value for s in _JOB_TRANSITIONS[current_enum])

    @staticmethod
    def is_terminal(status: str) -> bool:
        """Return True if the given status has no outgoing transitions."""
        try:
            s = JobStatus(status)
        except ValueError:
            return False
        return len(_JOB_TRANSITIONS[s]) == 0


class StepStateMachine:
    """Enforces legal JobStep lifecycle transitions."""

    @staticmethod
    def validate(current: str, next_status: str) -> None:
        """
        Validate that transitioning from `current` to `next_status` is legal.

        Raises ValueError if the transition is not allowed.

        Args:
            current     : The current JobStep.status string value.
            next_status : The proposed next JobStep.status string value.

        Raises:
            ValueError: Unknown status value, or illegal transition.
        """
        try:
            current_enum = JobStepStatus(current)
        except ValueError:
            raise ValueError(
                f"StepStateMachine: unknown current status '{current}'. "
                f"Valid values: {[s.value for s in JobStepStatus]}"
            )
        try:
            next_enum = JobStepStatus(next_status)
        except ValueError:
            raise ValueError(
                f"StepStateMachine: unknown next status '{next_status}'. "
                f"Valid values: {[s.value for s in JobStepStatus]}"
            )

        allowed = _STEP_TRANSITIONS[current_enum]
        if next_enum not in allowed:
            allowed_strs = sorted(s.value for s in allowed) if allowed else []
            raise ValueError(
                f"StepStateMachine: transition '{current}' → '{next_status}' is not allowed. "
                f"Allowed from '{current}': {allowed_strs}"
            )

    @staticmethod
    def transition(current: str, next_status: str) -> str:
        """Validate and return the next status string."""
        StepStateMachine.validate(current, next_status)
        return next_status

    @staticmethod
    def allowed_next(current: str) -> list:
        """Return a list of legal next status strings from `current`."""
        try:
            current_enum = JobStepStatus(current)
        except ValueError:
            return []
        return sorted(s.value for s in _STEP_TRANSITIONS[current_enum])

    @staticmethod
    def is_terminal(status: str) -> bool:
        """Return True if the given step status has no outgoing transitions."""
        try:
            s = JobStepStatus(status)
        except ValueError:
            return False
        return len(_STEP_TRANSITIONS[s]) == 0
