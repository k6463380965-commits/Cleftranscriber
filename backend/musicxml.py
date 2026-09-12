from copy import deepcopy
from xml.etree import ElementTree as ET

from .models import ClefName

MUSICXML_NS = "http://www.musicxml.org/xsd"
ET.register_namespace("", MUSICXML_NS)

CLEF_DEFINITIONS: dict[ClefName, tuple[str, int]] = {
    ClefName.TREBLE: ("G", 2),
    ClefName.ALTO: ("C", 3),
    ClefName.TENOR: ("C", 4),
    ClefName.BASS: ("F", 4),
}


def _tag(name: str) -> str:
    return f"{{{MUSICXML_NS}}}{name}"


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def validate_musicxml(content: bytes) -> ET.Element:
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid MusicXML: {exc}") from exc
    if _local_name(root.tag) not in {"score-partwise", "score-timewise"}:
        raise ValueError("Invalid MusicXML: document must contain a score-partwise or score-timewise root")
    return root


def convert_clef(content: bytes, target_clef: ClefName, source_clef: ClefName | None = None) -> bytes:
    """Change written clefs while preserving every note's sounding pitch.

    MusicXML stores sounding pitch as step/alter/octave. Those elements are
    deliberately never rewritten. Renderers derive the new staff position from
    that pitch and the target clef, which is the musically correct conversion.
    """
    root = validate_musicxml(content)
    converted = deepcopy(root)
    clef_nodes = converted.findall(f".//{_tag('clef')}")
    if not clef_nodes:
        raise ValueError("MusicXML contains no clef element to convert")

    sign, line = CLEF_DEFINITIONS[target_clef]
    for clef in clef_nodes:
        sign_node = clef.find(_tag("sign"))
        line_node = clef.find(_tag("line"))
        if sign_node is None:
            sign_node = ET.SubElement(clef, _tag("sign"))
        if line_node is None:
            line_node = ET.SubElement(clef, _tag("line"))
        sign_node.text = sign
        line_node.text = str(line)

    return ET.tostring(converted, encoding="utf-8", xml_declaration=True)


def extract_pitch_tokens(content: bytes) -> list[tuple[str, str, str, str | None]]:
    """Return pitch data for tests and audit tooling, without altering it."""
    root = validate_musicxml(content)
    pitches: list[tuple[str, str, str, str | None]] = []
    for note in root.findall(f".//{_tag('note')}"):
        pitch = note.find(_tag("pitch"))
        if pitch is None:
            continue
        step = pitch.findtext(_tag("step"), "")
        alter = pitch.findtext(_tag("alter"), "0")
        octave = pitch.findtext(_tag("octave"), "")
        duration = note.findtext(_tag("duration"))
        pitches.append((step, alter, octave, duration))
    return pitches