"""
Modül Sistemi Temel Yapıları (M2-C1)

İçerik modüllerinin pluggable yapısını tanımlayan dataclass'lar.

P-011 kuralı gereği her modül, pipeline runner veya workspace mantığını
kopyalamadan yalnızca kendi yapılandırmasını (adım tanımları, girdi şeması,
kapı varsayılanları) bildirir.
"""

from dataclasses import dataclass, field


@dataclass
class StepDefinition:
    """
    Bir pipeline adımının yapılandırma tanımı.

    Alanlar:
        step_key        : Adımın benzersiz string anahtarı (örn: 'script', 'tts').
                          JobStep.step_key ile eşleşmelidir.
        step_order      : Adımın pipeline içindeki sırası (1'den başlar).
        idempotency_type: StepIdempotencyType enum değerlerinden biri
                          ('re_executable', 'artifact_check', 'operator_confirm').
        executor_class  : Bu adımı çalıştıracak StepExecutor alt sınıfı.
        display_name    : Kullanıcıya gösterilecek adım adı (opsiyonel).
        description     : Adımın kısa açıklaması (opsiyonel).
    """

    step_key: str
    step_order: int
    idempotency_type: str
    executor_class: type
    display_name: str = ""
    description: str = ""


@dataclass
class ModuleDefinition:
    """
    Bir içerik modülünün tam yapılandırma tanımı.

    Her modül bu yapı aracılığıyla module_registry'ye kaydedilir.
    Pipeline runner, executor ve workspace mantığı tüm modüller için ortaktır;
    burada yalnızca modüle özgü yapılandırma bildirilir.

    Alanlar:
        module_id      : Modülün benzersiz kimliği (örn: 'standard_video').
        display_name   : Kullanıcıya gösterilecek modül adı.
        steps          : Adım tanımlarının sıralı listesi.
        input_schema   : JSON Schema — job oluşturulurken girdi doğrulaması için.
        gate_defaults  : Review kapısı varsayılanları (örn: {'script_review': False}).
        template_compat: Bu modülle uyumlu şablon kimliklerinin listesi.
    """

    module_id: str
    display_name: str
    steps: list[StepDefinition] = field(default_factory=list)
    input_schema: dict = field(default_factory=dict)
    gate_defaults: dict = field(default_factory=dict)
    template_compat: list[str] = field(default_factory=list)
