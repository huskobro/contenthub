"""
Publish Center İstisnaları — M7-C1.

Tüm publish subsystem hataları bu modülden import edilmelidir.
Servis katmanı bu istisnaları fırlatır; router katmanı HTTP yanıtlarına dönüştürür.
"""


class PublishRecordNotFoundError(Exception):
    """Belirtilen ID'ye sahip PublishRecord bulunamadı."""


class InvalidPublishTransitionError(Exception):
    """Yasak durum geçişi girişimi."""


class PublishGateViolationError(Exception):
    """
    Publish gate kuralı ihlali.

    draft veya pending_review durumundan doğrudan yayınlama girişimi
    yapıldığında fırlatılır. Servis katmanı PublishStateMachine.can_publish()
    doğrulaması başarısız olduğunda bu istisnayı kullanır.
    """


class ReviewGateViolationError(Exception):
    """
    Review gate kuralı ihlali.

    Henüz onaylanmamış bir kaydı publish etmeye çalışırken fırlatılır.
    """


class PublishAlreadyTerminalError(Exception):
    """
    Terminal durumdaki kayıt üzerinde geçiş girişimi.

    published veya cancelled durumundaki kayıtlara ek işlem uygulanamaz.
    """
