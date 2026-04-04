"""
M2-C6 Dispatcher Integration Testleri

Kapsamı:
  1. dispatch() executor'ları doğru provider ile oluşturuyor mu
  2. dispatch() PipelineRunner ve asyncio.create_task ile çalışıyor mu
  3. Job yaratılırken adımlar oluşturuluyor mu (step_key, step_order, idempotency_type)
  4. Job yaratılırken workspace init ediliyor mu
  5. POST /jobs → geçerli payload → job + adımlar yaratılıyor
  6. POST /jobs → geçersiz language → 422
  7. GET /jobs/{id} → steps listesi döndürüyor
  8. GET /jobs/{id}/artifacts → artifact listesi döndürüyor
  9. InputNormalizer geçersiz module_id → hata
"""

import asyncio
import json
import os
import tempfile
from pathlib import Path
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.models import Job, JobStep
from app.jobs import service
from app.jobs.dispatcher import JobDispatcher
from app.jobs.schemas import JobCreateRequest
from app.jobs import workspace as ws
from app.modules.registry import ModuleRegistry
from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE
from app.modules.input_normalizer import InputNormalizer
from app.modules.exceptions import ModuleNotFoundError
from app.providers.capability import ProviderCapability
from app.providers.registry import ProviderRegistry


# ---------------------------------------------------------------------------
# In-memory SQLite test veritabanı kurulumu
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Her test fonksiyonu için temiz in-memory SQLite motoru."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Her test için bağımsız AsyncSession."""
    session_factory = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def db_session_factory(db_engine):
    """Dispatcher testleri için session factory döner."""
    return async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)


# ---------------------------------------------------------------------------
# Test modül kayıt defteri ve workspace geçici dizini
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def test_registry():
    """Her test için standart video modülünü içeren temiz registry."""
    reg = ModuleRegistry()
    reg.register(STANDARD_VIDEO_MODULE)
    return reg


@pytest.fixture(scope="function", autouse=True)
def isolated_workspace(tmp_path):
    """
    Her test için workspace root'u geçici dizine yönlendirir.
    Test sonrası otomatik temizlenir.
    """
    ws.set_workspace_root(tmp_path / "workspace")
    yield tmp_path / "workspace"
    # Workspace root'u varsayılan değere sıfırla
    ws.set_workspace_root(ws._DEFAULT_WORKSPACE_ROOT)


# ---------------------------------------------------------------------------
# Mock provider fabrikası
# ---------------------------------------------------------------------------

def _make_providers():
    """Dispatcher testleri için minimal mock provider dict (geriye dönük uyumluluk için korunur)."""
    return {
        "llm": MagicMock(name="llm_provider"),
        "tts": MagicMock(name="tts_provider"),
        "visuals_primary": MagicMock(name="pexels_provider"),
        "visuals_fallback": MagicMock(name="pixabay_provider"),
    }


def _make_registry() -> tuple[ProviderRegistry, dict]:
    """
    Dispatcher testleri için ProviderRegistry ve mock provider'ları döner.
    Tuple: (registry, providers_dict) — providers_dict assertion'lar için.
    """
    providers = _make_providers()
    registry = ProviderRegistry()

    llm_mock = providers["llm"]
    llm_mock.provider_id = MagicMock(return_value="llm_mock")
    llm_mock.capability = MagicMock(return_value=ProviderCapability.LLM)

    tts_mock = providers["tts"]
    tts_mock.provider_id = MagicMock(return_value="tts_mock")
    tts_mock.capability = MagicMock(return_value=ProviderCapability.TTS)

    pexels_mock = providers["visuals_primary"]
    pexels_mock.provider_id = MagicMock(return_value="pexels_mock")
    pexels_mock.capability = MagicMock(return_value=ProviderCapability.VISUALS)

    pixabay_mock = providers["visuals_fallback"]
    pixabay_mock.provider_id = MagicMock(return_value="pixabay_mock")
    pixabay_mock.capability = MagicMock(return_value=ProviderCapability.VISUALS)

    registry.register(llm_mock, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(tts_mock, ProviderCapability.TTS, is_primary=True, priority=0)
    registry.register(pexels_mock, ProviderCapability.VISUALS, is_primary=True, priority=0)
    registry.register(pixabay_mock, ProviderCapability.VISUALS, is_primary=False, priority=1)

    return registry, providers


# ===========================================================================
# Test 1: dispatch() executor'ları doğru provider ile oluşturuyor mu
# ===========================================================================

@pytest.mark.asyncio
async def test_dispatch_builds_executors_with_correct_providers(
    db_session, db_session_factory, test_registry
):
    """
    dispatch() çağrısında ScriptStepExecutor llm_provider ile,
    TTSStepExecutor tts_provider ile, VisualsStepExecutor provider zinciri ile
    oluşturulmalı. asyncio.create_task tetiklenmeli.
    """
    registry, providers = _make_registry()
    event_bus = MagicMock()

    # Job oluştur
    from app.jobs.schemas import JobCreate
    job = await service.create_job(
        db_session,
        JobCreate(
            module_type="standard_video",
            input_data_json=json.dumps({"topic": "Test konusu"}),
        ),
    )

    # Adımları manuel olarak oluştur (create_job henüz bunu yapmıyor olabilir)
    steps = test_registry.get_steps("standard_video")
    for step_def in steps:
        step = JobStep(
            job_id=job.id,
            step_key=step_def.step_key,
            step_order=step_def.step_order,
            status="pending",
            idempotency_type=step_def.idempotency_type,
        )
        db_session.add(step)
    await db_session.commit()

    # Dispatcher'ı kur
    dispatcher = JobDispatcher(
        db_session_factory=db_session_factory,
        module_registry=test_registry,
        event_bus=event_bus,
        registry=registry,
    )

    async def fake_run(job_id: str) -> None:
        """Pipeline run'ı yakalamak için stub."""
        pass

    with patch("app.jobs.dispatcher.PipelineRunner") as MockRunner:
        mock_runner_instance = MagicMock()
        mock_runner_instance.run = AsyncMock(return_value=None)
        MockRunner.return_value = mock_runner_instance

        with patch("asyncio.create_task") as mock_create_task:
            await dispatcher.dispatch(job.id)

        # PipelineRunner() çağrıldı mı?
        assert MockRunner.called, "PipelineRunner() oluşturulmadı"

        # Executor dict'ini yakala
        _, kwargs = MockRunner.call_args
        executors = kwargs.get("executors") or MockRunner.call_args[0][1]

    # Executor anahtarları doğru mu?
    assert "script" in executors, "script executor eksik"
    assert "tts" in executors, "tts executor eksik"
    assert "visuals" in executors, "visuals executor eksik"
    assert "metadata" in executors, "metadata executor eksik"
    assert "subtitle" in executors, "subtitle executor eksik"
    assert "composition" in executors, "composition executor eksik"

    # Provider inject kontrolü — registry üzerinden
    # M3-C2: script/metadata/tts executor'ları artık _llm/_tts değil _registry tutuyor
    assert executors["script"]._registry is registry, "script executor yanlış registry aldı"
    assert executors["metadata"]._registry is registry, "metadata executor yanlış registry aldı"
    assert executors["tts"]._registry is registry, "tts executor yanlış registry aldı"
    assert executors["visuals"]._providers[0] is providers["visuals_primary"], "visuals executor yanlış primary aldı"
    assert executors["visuals"]._providers[1] is providers["visuals_fallback"], "visuals executor yanlış fallback aldı"


# ===========================================================================
# Test 2: dispatch() asyncio.create_task çağrılıyor mu
# ===========================================================================

@pytest.mark.asyncio
async def test_dispatch_creates_background_task(
    db_session, db_session_factory, test_registry
):
    """
    dispatch() PipelineRunner.run'ı asyncio.create_task ile arka planda çalıştırmalı.
    """
    registry, providers = _make_registry()
    event_bus = MagicMock()

    from app.jobs.schemas import JobCreate
    job = await service.create_job(
        db_session,
        JobCreate(
            module_type="standard_video",
            input_data_json=json.dumps({"topic": "Test konusu"}),
        ),
    )
    # Adımları ekle
    for step_def in test_registry.get_steps("standard_video"):
        step = JobStep(
            job_id=job.id,
            step_key=step_def.step_key,
            step_order=step_def.step_order,
            status="pending",
            idempotency_type=step_def.idempotency_type,
        )
        db_session.add(step)
    await db_session.commit()

    dispatcher = JobDispatcher(
        db_session_factory=db_session_factory,
        module_registry=test_registry,
        event_bus=event_bus,
        registry=registry,
    )

    with patch("app.jobs.dispatcher.PipelineRunner") as MockRunner:
        import asyncio as _asyncio
        mock_runner_instance = MagicMock()
        mock_runner_instance.run = AsyncMock(return_value=None)
        MockRunner.return_value = mock_runner_instance

        # dispatch() sonrası task referansını yakalamak için create_task'ı spy'lıyoruz.
        # Gerçek create_task çağrılır — coroutine await edilir, warning oluşmaz.
        created_tasks: list = []
        real_create_task = _asyncio.create_task

        def spy_create_task(coro, **kwargs):
            task = real_create_task(coro, **kwargs)
            created_tasks.append(task)
            return task

        with patch("asyncio.create_task", side_effect=spy_create_task):
            await dispatcher.dispatch(job.id)

        # Tüm oluşturulan task'ların tamamlanmasını bekle
        if created_tasks:
            await _asyncio.gather(*created_tasks, return_exceptions=True)

        assert len(created_tasks) >= 1, "asyncio.create_task() hiç çağrılmadı"
        assert MockRunner.called, "PipelineRunner() oluşturulmadı"
        assert mock_runner_instance.run.called, "PipelineRunner.run() çağrılmadı"


# ===========================================================================
# Test 3: Job yaratılırken adımlar oluşturuluyor mu
# ===========================================================================

@pytest.mark.asyncio
async def test_create_job_initializes_steps(db_session, test_registry):
    """
    initialize_job_steps() çağrıldığında modülün tüm adımları JobStep olarak
    DB'ye yazılmalı — step_key, step_order ve idempotency_type doğru olmalı.
    """
    from app.jobs.schemas import JobCreate
    from app.jobs.step_initializer import initialize_job_steps

    job = await service.create_job(
        db_session,
        JobCreate(
            module_type="standard_video",
            input_data_json=json.dumps({"topic": "Test konusu"}),
        ),
    )

    await initialize_job_steps(db_session, job.id, "standard_video", test_registry)

    steps = await service.get_job_steps(db_session, job.id)
    assert len(steps) == 7, f"7 adım bekleniyor, {len(steps)} bulundu"

    step_map = {s.step_key: s for s in steps}
    expected = [
        ("script", 1, "re_executable"),
        ("metadata", 2, "re_executable"),
        ("tts", 3, "artifact_check"),
        ("visuals", 4, "artifact_check"),
        ("subtitle", 5, "re_executable"),
        ("composition", 6, "artifact_check"),
    ]
    for step_key, step_order, idempotency_type in expected:
        assert step_key in step_map, f"{step_key!r} adımı oluşturulmadı"
        step = step_map[step_key]
        assert step.step_order == step_order, (
            f"{step_key!r}: beklenen step_order={step_order}, bulunan={step.step_order}"
        )
        assert step.idempotency_type == idempotency_type, (
            f"{step_key!r}: beklenen idempotency_type={idempotency_type!r}, "
            f"bulunan={step.idempotency_type!r}"
        )
        assert step.status == "pending", (
            f"{step_key!r}: başlangıç statüsü 'pending' olmalı, bulunan={step.status!r}"
        )


# ===========================================================================
# Test 4: Job yaratılırken workspace init ediliyor mu
# ===========================================================================

@pytest.mark.asyncio
async def test_create_job_initializes_workspace(db_session, test_registry, isolated_workspace):
    """
    initialize_job_steps() çağrıldığında workspace dizini ve alt dizinleri
    (artifacts/, preview/, tmp/) oluşturulmalı.
    """
    from app.jobs.schemas import JobCreate
    from app.jobs.step_initializer import initialize_job_steps

    job = await service.create_job(
        db_session,
        JobCreate(
            module_type="standard_video",
            input_data_json=json.dumps({"topic": "Test konusu"}),
        ),
    )

    await initialize_job_steps(db_session, job.id, "standard_video", test_registry)

    workspace_path = ws.get_workspace_path(job.id)
    assert workspace_path.exists(), "Workspace dizini oluşturulmadı"
    assert (workspace_path / "artifacts").exists(), "artifacts/ dizini oluşturulmadı"
    assert (workspace_path / "preview").exists(), "preview/ dizini oluşturulmadı"
    assert (workspace_path / "tmp").exists(), "tmp/ dizini oluşturulmadı"


# ===========================================================================
# HTTP integration testleri için app fixture
# ===========================================================================

@pytest_asyncio.fixture(scope="function")
async def http_client(isolated_workspace):
    """
    Lifespan'ı çalıştıran (modül kayıt defteri + dispatcher kurulu) HTTP test client'ı.
    Her test için temiz bir client döner.
    """
    from app.main import create_app
    # Lifespan event'lerin tetiklenmesi için AsyncClient'a app'i geç
    test_app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
        # ASGI lifespan olaylarını tetikle
    ) as client:
        # Lifespan'ı manuel tetikle
        await test_app.router.startup()
        yield client
        await test_app.router.shutdown()


# ===========================================================================
# Test 5: POST /jobs → geçerli payload → job + adımlar yaratılıyor
# ===========================================================================

@pytest.mark.asyncio
async def test_post_jobs_valid_payload_creates_job_and_steps(isolated_workspace):
    """
    POST /api/v1/jobs geçerli payload ile job + 6 adım oluşturmalı.
    Response'da job id ve status=queued dönmeli.
    """
    from app.main import create_app
    from app.modules.registry import module_registry
    from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE

    # Global registry'e modülü kaydet (lifespan çalışmadığında test ortamında)
    module_registry.register(STANDARD_VIDEO_MODULE)

    test_app = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/v1/jobs",
            json={
                "module_id": "standard_video",
                "topic": "Yapay zeka ve geleceği",
                "language": "tr",
                "duration_seconds": 60,
            },
        )

    assert response.status_code == 201, f"Beklenen 201, gelen: {response.status_code}. Body: {response.text}"
    data = response.json()
    assert data["status"] == "queued", f"Beklenen status=queued, gelen: {data['status']}"
    assert data["module_type"] == "standard_video"
    assert len(data.get("steps", [])) == 7, f"7 adım bekleniyor, gelen: {len(data.get('steps', []))}"


# ===========================================================================
# Test 6: POST /jobs → geçersiz language → 422
# ===========================================================================

@pytest.mark.asyncio
async def test_post_jobs_invalid_language_returns_422():
    """
    POST /api/v1/jobs desteklenmeyen dil kodu ile 422 döndürmeli.
    """
    from app.main import create_app

    test_app = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/v1/jobs",
            json={
                "module_id": "standard_video",
                "topic": "Test konusu",
                "language": "xx",  # Geçersiz dil kodu
                "duration_seconds": 60,
            },
        )

    assert response.status_code == 422, f"Beklenen 422, gelen: {response.status_code}"


# ===========================================================================
# Test 7: GET /jobs/{id} → steps listesi döndürüyor
# ===========================================================================

@pytest.mark.asyncio
async def test_get_job_returns_steps(isolated_workspace):
    """
    GET /api/v1/jobs/{job_id} çağrısında steps dizisi dolu dönmeli.
    """
    from app.main import create_app
    from app.modules.registry import module_registry
    from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE

    module_registry.register(STANDARD_VIDEO_MODULE)
    test_app = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as client:
        # Önce job oluştur
        create_resp = await client.post(
            "/api/v1/jobs",
            json={
                "module_id": "standard_video",
                "topic": "Adım listesi testi",
                "language": "tr",
                "duration_seconds": 60,
            },
        )
        assert create_resp.status_code == 201, create_resp.text
        job_id = create_resp.json()["id"]

        # Job detail getir
        get_resp = await client.get(f"/api/v1/jobs/{job_id}")

    assert get_resp.status_code == 200, get_resp.text
    data = get_resp.json()
    assert "steps" in data, "steps alanı eksik"
    assert len(data["steps"]) == 7, f"7 adım bekleniyor, gelen: {len(data['steps'])}"

    # step_key'leri doğrula
    step_keys = {s["step_key"] for s in data["steps"]}
    expected_keys = {"script", "metadata", "tts", "visuals", "subtitle", "composition", "publish"}
    assert step_keys == expected_keys, f"Beklenen adım anahtarları: {expected_keys}, gelen: {step_keys}"


# ===========================================================================
# Test 8: GET /jobs/{id}/artifacts → artifact listesi döndürüyor
# ===========================================================================

@pytest.mark.asyncio
async def test_get_job_artifacts_endpoint(isolated_workspace):
    """
    GET /api/v1/jobs/{job_id}/artifacts workspace'de bulunan artifact dosyalarını listeler.
    Henüz dosya yoksa boş liste döner.
    """
    from app.main import create_app
    from app.modules.registry import module_registry
    from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE

    module_registry.register(STANDARD_VIDEO_MODULE)
    test_app = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as client:
        # Job oluştur
        create_resp = await client.post(
            "/api/v1/jobs",
            json={
                "module_id": "standard_video",
                "topic": "Artifact endpoint testi",
                "language": "tr",
                "duration_seconds": 60,
            },
        )
        assert create_resp.status_code == 201, create_resp.text
        job_id = create_resp.json()["id"]

        # Artifact listesini al
        artifacts_resp = await client.get(f"/api/v1/jobs/{job_id}/artifacts")

    assert artifacts_resp.status_code == 200, artifacts_resp.text
    data = artifacts_resp.json()
    assert data["job_id"] == job_id
    assert "artifacts" in data
    assert isinstance(data["artifacts"], list)


@pytest.mark.asyncio
async def test_get_job_artifacts_lists_existing_files(isolated_workspace):
    """
    Workspace'de artifact dosyası varsa artifacts listesinde görünmeli.
    """
    from app.main import create_app
    from app.modules.registry import module_registry
    from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE

    module_registry.register(STANDARD_VIDEO_MODULE)
    test_app = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as client:
        # Job oluştur
        create_resp = await client.post(
            "/api/v1/jobs",
            json={
                "module_id": "standard_video",
                "topic": "Artifact dosya testi",
                "language": "tr",
                "duration_seconds": 60,
            },
        )
        assert create_resp.status_code == 201, create_resp.text
        job_id = create_resp.json()["id"]

    # Workspace'e bir artifact dosyası ekle
    artifact_dir = ws.get_workspace_path(job_id) / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    test_file = artifact_dir / "script.json"
    test_file.write_text('{"test": true}', encoding="utf-8")

    # Tekrar artifact listesini al (yeni client ile)
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as client:
        artifacts_resp = await client.get(f"/api/v1/jobs/{job_id}/artifacts")

    assert artifacts_resp.status_code == 200, artifacts_resp.text
    data = artifacts_resp.json()
    names = [a["name"] for a in data["artifacts"]]
    assert "script.json" in names, f"script.json bulunamadı. Mevcut: {names}"


# ===========================================================================
# Test 9: InputNormalizer geçersiz module_id → ModuleNotFoundError
# ===========================================================================

def test_input_normalizer_invalid_module_id(test_registry):
    """
    InputNormalizer bilinmeyen module_id ile çağrılınca ModuleNotFoundError fırlatmalı.
    """
    normalizer = InputNormalizer(test_registry)
    with pytest.raises(ModuleNotFoundError):
        normalizer.normalize("bilinmeyen_modul", {"topic": "test"})


def test_input_normalizer_valid_module_id(test_registry):
    """
    InputNormalizer geçerli module_id ve topic ile normalize etmeli;
    varsayılan language ve duration_seconds eklenmeli.
    """
    normalizer = InputNormalizer(test_registry)
    result = normalizer.normalize("standard_video", {"topic": "Geçerli konu"})
    assert result["topic"] == "Geçerli konu"
    assert result["language"] == "tr"  # Şema varsayılanı
    assert result["duration_seconds"] == 60  # Şema varsayılanı
