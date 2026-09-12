from enum import Enum

from pydantic import BaseModel, Field


class ClefName(str, Enum):
    TREBLE = "treble"
    ALTO = "alto"
    TENOR = "tenor"
    BASS = "bass"


class ConvertRequest(BaseModel):
    target_clef: ClefName = Field(default=ClefName.BASS)
    source_clef: ClefName | None = None


class ConversionResponse(BaseModel):
    filename: str
    target_clef: ClefName
    musicxml: str
    warnings: list[str] = []


class RecognitionResult(BaseModel):
    musicxml: str
    warnings: list[str] = []


class MusicRecognitionService:
    """Boundary for a replaceable OMR provider.

    A production deployment can implement this interface with Audiveris or a
    hosted OMR service without changing the HTTP or conversion layers.
    """

    async def recognize_music(self, filename: str, content: bytes) -> RecognitionResult:
        raise NotImplementedError