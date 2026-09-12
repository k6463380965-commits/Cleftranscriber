import os
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

from .models import ClefName, ConversionResponse
from .musicxml import convert_clef
from .services import LocalMusicRecognitionService, UnsupportedOmrError

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg", ".xml", ".musicxml", ".mxl"}
recognition_service = LocalMusicRecognitionService()

app = FastAPI(title="Clef Converter API", version="0.1.0")
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/convert", response_model=ConversionResponse)
async def convert_upload(
    file: UploadFile = File(...),
    target_clef: ClefName = Form(ClefName.BASS),
    source_clef: ClefName | None = Form(None),
) -> ConversionResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 25 MB")

    try:
        recognition = await recognition_service.recognize_music(file.filename or "upload", content)
        converted = convert_clef(recognition.musicxml.encode("utf-8"), target_clef, source_clef)
    except UnsupportedOmrError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    output_name = f"{Path(file.filename or 'score').stem}-{target_clef.value}.musicxml"
    return ConversionResponse(
        filename=output_name,
        target_clef=target_clef,
        musicxml=converted.decode("utf-8"),
        warnings=[
            "Please review the converted score. Optical music recognition can make mistakes, especially with low-quality scans, handwritten music, complex notation, or overlapping voices."
        ],
    )


@app.post("/api/convert-musicxml")
async def convert_musicxml_direct(
    musicxml: str,
    target_clef: ClefName = ClefName.BASS,
    source_clef: ClefName | None = None,
) -> Response:
    try:
        converted = convert_clef(musicxml.encode("utf-8"), target_clef, source_clef)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return Response(content=converted, media_type="application/vnd.recordare.musicxml+xml")


@app.get("/{requested_path:path}", include_in_schema=False)
async def serve_frontend(requested_path: str = "") -> FileResponse:
    """Serve the built React app so Render only needs one web service."""
    requested_file = (FRONTEND_DIST / requested_path).resolve()
    if requested_file.is_file() and FRONTEND_DIST in requested_file.parents:
        return FileResponse(requested_file)
    index_file = FRONTEND_DIST / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Frontend build not found")