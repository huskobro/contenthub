from typing import Optional, Literal, List
from pydantic import BaseModel, field_validator
from datetime import datetime


# Gate Sources Closure — scan_mode literal (curated removed)
ScanModeLiteral = Literal["manual", "auto"]


class ScanCreate(BaseModel):
    source_id: str
    scan_mode: ScanModeLiteral
    status: Optional[str] = "queued"
    requested_by: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    result_count: Optional[int] = None
    error_summary: Optional[str] = None
    raw_result_preview_json: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("result_count")
    @classmethod
    def result_count_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("result_count must be non-negative")
        return v


class ScanUpdate(BaseModel):
    status: Optional[str] = None
    requested_by: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    result_count: Optional[int] = None
    error_summary: Optional[str] = None
    raw_result_preview_json: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def status_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("status must not be blank")
        return v

    @field_validator("result_count")
    @classmethod
    def result_count_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("result_count must be non-negative")
        return v


class ScanResponse(BaseModel):
    id: str
    source_id: str
    scan_mode: str
    status: str
    requested_by: Optional[str]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    result_count: Optional[int]
    error_summary: Optional[str]
    raw_result_preview_json: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    source_name: Optional[str] = None
    source_status: Optional[str] = None
    linked_news_count_from_scan: int = 0
    used_news_count_from_scan: int = 0

    model_config = {"from_attributes": True}


class ScanListResponse(BaseModel):
    items: List[ScanResponse]
    total: int
    offset: int
    limit: int


class ScanDedupeDetail(BaseModel):
    """
    Tek bir dedupe kararının açıklanabilir kaydı.

    Semantik: Bu nesne yalnızca scan yanıtında yaşar.
    NewsItem.status değiştirilmez; "deduped" kalıcı bir durum değildir.

    reason          : "hard_url_match" | "soft_title_match" | "accepted"
    is_suppressed   : True → bu entry veritabanına yazılmadı
    followup_override: True → soft eşleşme vardı ama allow_followup ile geçildi
    matched_item_id : eşleşen NewsItem.id (suppressed ise)
    similarity_score: 0.0–1.0 (soft için Jaccard skoru; hard için 1.0)
    """
    reason: str
    is_suppressed: bool
    followup_override: bool
    entry_url: str
    entry_title: str
    matched_item_id: Optional[str] = None
    similarity_score: float = 0.0


class ScanExecuteResponse(BaseModel):
    """
    POST /source-scans/{scan_id}/execute yanıt şeması — M5-C2 genişletmesi.

    fetched_count    : feed'den gelen toplam entry sayısı
    new_count        : veritabanına yazılan yeni NewsItem sayısı
    skipped_dedupe   : hard + soft toplam bastırılan
    skipped_hard     : yalnızca hard dedupe (URL eşleşmesi) bastırılan
    skipped_soft     : yalnızca soft dedupe (başlık benzerliği) bastırılan
    followup_accepted: soft eşleşme vardı ama allow_followup ile yazıldı
    skipped_invalid  : url veya title eksik nedeniyle atlanan entry sayısı
    error_summary    : başarısız olursa kısa hata özeti, başarılı ise None
    dedupe_details   : bastırılan ve followup_override kararların açıklanabilir listesi
    """

    scan_id: str
    status: str
    fetched_count: int
    new_count: int
    skipped_dedupe: int
    skipped_hard: int = 0
    skipped_soft: int = 0
    followup_accepted: int = 0
    skipped_invalid: int
    error_summary: Optional[str] = None
    dedupe_details: list[ScanDedupeDetail] = []
