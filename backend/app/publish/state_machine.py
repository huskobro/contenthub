"""
Publish Center Durum Makinesi — M7-C1.

PublishRecord durum geçişlerini ve izin verilen hareketleri tanımlar.
Her geçiş bu modülden geçmek zorundadır — doğrudan ORM atama yasaktır.

Durum tanımları:
  draft           : Kullanıcı publish kaydı oluşturdu, henüz review başlatılmadı.
                    Gerekli: job_id, content_ref
                    Opsiyonel: tüm platform alanları

  pending_review  : Review gate açıldı; operatör onayı bekleniyor.
                    İlk transit: draft → pending_review
                    Bu durumdaki kayıt YAYINLANAMAZ.

  review_rejected : Operatör kaydı reddetti.
                    Terminal değil — düzeltme sonrası draft'a dönebilir.
                    Yayınlama: yasak.

  approved        : Operatör onayladı; publish işlemi başlatılabilir.
                    Bu durum "publish yetkisi verildi" anlamına gelir.
                    Yayınlama: henüz başlamadı.

  scheduled       : Publish ilerleyen bir zamana planlandı.
                    Yayınlama başlamadı; iptal edilebilir.

  publishing      : Platform'a upload/activate zinciri aktif.
                    Bu durum sırasında iptal: platform'a bağlı.

  published       : Tüm platform adımları (upload + activate) başarıyla tamamlandı.
                    Terminal durum.

  failed          : Publish girişimi başarısız oldu.
                    Terminal değil — retry yeni bir girişim başlatır.

  cancelled       : Kullanıcı veya admin iptal etti.
                    Terminal durum.

Publish gate kuralı (M7):
  Yayınlama yalnızca approved veya scheduled durumundan başlayabilir.
  pending_review veya draft durumundan doğrudan yayınlama YASAK.
  Bu kural bu modülde zorlandığı için servis/router katmanı ayrıca
  kontrol etmek zorunda değildir.

Kısmi başarısızlık semantiği (M7):
  publishing → failed   : platform upload/activate zinciri kırıldı
  failed → publishing   : retry; aynı PublishRecord yeniden kullanılır,
                          her deneme PublishLog'a kaydedilir
  Maksimum retry sayısı servis katmanında uygulanır; durum makinesi
  sayı sınırı koymaz.
"""

from typing import Dict, FrozenSet

from app.publish.enums import PublishStatus


# ---------------------------------------------------------------------------
# Publish geçiş matrisi
#
# Anahtar  : mevcut durum
# Değer    : bu durumdan geçilebilecek yasal sonraki durumlar
# ---------------------------------------------------------------------------

_PUBLISH_TRANSITIONS: Dict[PublishStatus, FrozenSet[PublishStatus]] = {
    PublishStatus.DRAFT: frozenset({
        PublishStatus.PENDING_REVIEW,
        PublishStatus.APPROVED,       # Doğrudan onay (review gate atlanabilir)
        PublishStatus.SCHEDULED,      # Doğrudan zamanlama (review atlanmış sayılır)
        PublishStatus.CANCELLED,
    }),
    PublishStatus.PENDING_REVIEW: frozenset({
        PublishStatus.APPROVED,
        PublishStatus.REVIEW_REJECTED,
        PublishStatus.CANCELLED,
    }),
    PublishStatus.REVIEW_REJECTED: frozenset({
        PublishStatus.DRAFT,          # Düzenleme sonrası yeniden review'a alınabilir
        PublishStatus.CANCELLED,
    }),
    PublishStatus.APPROVED: frozenset({
        PublishStatus.PUBLISHING,
        PublishStatus.SCHEDULED,
        PublishStatus.CANCELLED,
    }),
    PublishStatus.SCHEDULED: frozenset({
        PublishStatus.PUBLISHING,
        PublishStatus.CANCELLED,
    }),
    PublishStatus.PUBLISHING: frozenset({
        PublishStatus.PUBLISHED,
        PublishStatus.FAILED,
    }),
    PublishStatus.FAILED: frozenset({
        PublishStatus.PUBLISHING,     # Retry: yeni deneme
        PublishStatus.CANCELLED,
    }),
    # Terminal durumlar — bu kayıt üzerinde daha fazla geçiş yok
    PublishStatus.PUBLISHED: frozenset(),
    PublishStatus.CANCELLED: frozenset(),
}

# Yayınlamanın başlatılabileceği yasal kaynak durumlar (M7 publish gate kuralı)
_PUBLISHABLE_STATES: FrozenSet[PublishStatus] = frozenset({
    PublishStatus.APPROVED,
    PublishStatus.SCHEDULED,
    PublishStatus.FAILED,  # Retry senaryosu
})


class PublishStateMachine:
    """PublishRecord durum geçişlerini zorlar."""

    @staticmethod
    def validate(current: str, next_status: str) -> None:
        """
        `current`'tan `next_status`'a geçişin yasal olduğunu doğrular.

        Geçiş yasal değilse ValueError fırlatır.
        Veritabanına yazmaz — Job.status güncellemesinden ÖNCE çağrılmalıdır.

        Args:
            current     : Mevcut PublishRecord.status değeri.
            next_status : Önerilen sonraki PublishRecord.status değeri.

        Raises:
            ValueError: Bilinmeyen durum değeri veya yasak geçiş.
        """
        try:
            current_enum = PublishStatus(current)
        except ValueError:
            raise ValueError(
                f"PublishStateMachine: bilinmeyen mevcut durum '{current}'. "
                f"Geçerli değerler: {[s.value for s in PublishStatus]}"
            )
        try:
            next_enum = PublishStatus(next_status)
        except ValueError:
            raise ValueError(
                f"PublishStateMachine: bilinmeyen sonraki durum '{next_status}'. "
                f"Geçerli değerler: {[s.value for s in PublishStatus]}"
            )

        allowed = _PUBLISH_TRANSITIONS[current_enum]
        if next_enum not in allowed:
            allowed_strs = sorted(s.value for s in allowed) if allowed else []
            raise ValueError(
                f"PublishStateMachine: '{current}' → '{next_status}' geçişi yasak. "
                f"'{current}' durumundan izin verilen geçişler: {allowed_strs}"
            )

    @staticmethod
    def transition(current: str, next_status: str) -> str:
        """
        Geçişi doğrula ve sonraki durum dizesini döndür.

        Kullanım:
            record.status = PublishStateMachine.transition(record.status, "publishing")

        Yasak geçişte ValueError fırlatır.
        """
        PublishStateMachine.validate(current, next_status)
        return next_status

    @staticmethod
    def allowed_next(current: str) -> list:
        """Mevcut durumdan geçilebilecek yasal durumların listesini döndür."""
        try:
            current_enum = PublishStatus(current)
        except ValueError:
            return []
        return sorted(s.value for s in _PUBLISH_TRANSITIONS[current_enum])

    @staticmethod
    def is_terminal(status: str) -> bool:
        """Verilen durumun terminal (çıkan geçiş yok) olup olmadığını döndür."""
        try:
            s = PublishStatus(status)
        except ValueError:
            return False
        return len(_PUBLISH_TRANSITIONS[s]) == 0

    @staticmethod
    def can_publish(status: str) -> bool:
        """
        Publish işleminin başlatılabileceği bir durumda olup olmadığını döndür.

        Publish gate kuralı: yalnızca approved, scheduled, veya failed (retry)
        durumundan yayınlama başlatılabilir. draft veya pending_review
        durumundan doğrudan yayınlama YASAK.
        """
        try:
            s = PublishStatus(status)
        except ValueError:
            return False
        return s in _PUBLISHABLE_STATES
