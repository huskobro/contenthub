"""
Step Executor Base (Phase M1-C2)

Defines the abstract base class for all step executors.
Each step type gets exactly one StepExecutor subclass.

Contract:
- execute() must be idempotent per the step's idempotency_type
- execute() returns a result dict stored as provider_trace_json on the step
- raise StepExecutionError on failure — never swallow errors silently

Usage:
    class ScriptStepExecutor(StepExecutor):
        def step_key(self) -> str:
            return "script"

        async def execute(self, job: Job, step: JobStep) -> dict:
            ...
            return {"status": "ok", "artifact": "script.txt"}
"""

from abc import ABC, abstractmethod

from app.db.models import Job, JobStep
from app.jobs.exceptions import StepExecutionError  # noqa: F401 — re-exported for convenience


class StepExecutor(ABC):
    """Base class for all step executors. One executor per step type."""

    @abstractmethod
    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Execute the step.

        Returns a result dict that will be stored as provider_trace_json on
        the completed step. The dict must be JSON-serialisable.

        Must be idempotent per the step's idempotency_type:
          - RE_EXECUTABLE  : safe to run from scratch unconditionally
          - ARTIFACT_CHECK : check whether output artifact already exists first
          - OPERATOR_CONFIRM : must not run without explicit operator action

        Raise StepExecutionError on failure. Do not raise bare Exception —
        the pipeline runner catches StepExecutionError specifically.
        """
        ...

    @abstractmethod
    def step_key(self) -> str:
        """Return the step_key string this executor handles (e.g. 'script').

        This must match the step_key value stored on JobStep rows that this
        executor is responsible for. PipelineRunner uses this value as the
        lookup key when building the executors registry.
        """
        ...
