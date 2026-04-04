"""
Güvenli composition kimlik eşleştirmesi.

AI tarafından dinamik render kodu üretilemez (CLAUDE.md C-07).
Composition ID'ler burada açık olarak tanımlanır.
Yeni bir modül eklendiğinde bu dosya güncellenmeli ve kod incelemesinden geçmelidir.
"""

# Modül kimliği → Remotion composition kimliği eşleştirmesi
# Yeni modül eklemek için bu sözlüğe açık kayıt yapılmalıdır.
COMPOSITION_MAP: dict[str, str] = {
    "standard_video": "StandardVideo",
}


def get_composition_id(module_id: str) -> str:
    """
    module_id için Remotion composition ID'sini döner.

    Bilinmeyen modül kimliği → ValueError fırlatır.
    Dinamik veya AI üretimli composition ID'lere izin verilmez.

    Args:
        module_id: İçerik modülünün kimliği (örn. 'standard_video').

    Returns:
        Remotion composition kimliği (örn. 'StandardVideo').

    Raises:
        ValueError: module_id COMPOSITION_MAP içinde tanımlı değilse.
    """
    if module_id not in COMPOSITION_MAP:
        raise ValueError(
            f"Bilinmeyen modül için composition tanımlı değil: {module_id}. "
            f"Desteklenen modüller: {list(COMPOSITION_MAP.keys())}"
        )
    return COMPOSITION_MAP[module_id]
