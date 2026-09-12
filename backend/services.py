from pathlib import Path

from .models import MusicRecognitionService, RecognitionResult

SUPPORTED_MUSICXML = {".musicxml", ".xml", ".mxl"}
SUPPORTED_IMAGE = {".png", ".jpg", ".jpeg"}
SUPPORTED_DOCUMENT = {".pdf"}


class UnsupportedOmrError(ValueError):
    pass


class LocalMusicRecognitionService(MusicRecognitionService):
    async def recognize_music(self, filename: str, content: bytes) -> RecognitionResult:
        suffix = Path(filename).suffix.lower()
        if suffix in SUPPORTED_MUSICXML:
            from .musicxml import validate_musicxml

            validate_musicxml(content)
            return RecognitionResult(musicxml=content.decode("utf-8"))
        if suffix in SUPPORTED_IMAGE | SUPPORTED_DOCUMENT:
            raise UnsupportedOmrError(
                "PDF/image upload was accepted, but no OMR engine is configured. "
                "Set an OMR provider behind MusicRecognitionService before conversion."
            )
        raise ValueError("Unsupported file type. Use PDF, PNG, JPG, JPEG, XML, or MusicXML.")