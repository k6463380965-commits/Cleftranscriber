from pathlib import Path

import pytest

from backend.models import ClefName
from backend.musicxml import convert_clef, extract_pitch_tokens

SAMPLE = Path(__file__).parent / "fixtures" / "sample.musicxml"


@pytest.mark.parametrize("target", list(ClefName))
def test_conversion_preserves_pitch_rhythm_and_notations(target: ClefName) -> None:
    source = SAMPLE.read_bytes()
    converted = convert_clef(source, target)

    assert extract_pitch_tokens(converted) == extract_pitch_tokens(source)
    assert b"<duration>2</duration>" in converted
    assert b"<staccato" in converted
    assert b"<slur" in converted
    expected = {ClefName.TREBLE: (b"<sign>G</sign>", b"<line>2</line>"), ClefName.ALTO: (b"<sign>C</sign>", b"<line>3</line>"), ClefName.TENOR: (b"<sign>C</sign>", b"<line>4</line>"), ClefName.BASS: (b"<sign>F</sign>", b"<line>4</line>")}[target]
    assert expected[0] in converted and expected[1] in converted


def test_invalid_xml_is_rejected() -> None:
    with pytest.raises(ValueError, match="Invalid MusicXML"):
        convert_clef(b"<not-a-score />", ClefName.BASS)
