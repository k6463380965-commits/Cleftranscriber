
Also set `CORS_ORIGINS` on the API service to the public frontend URL, for example `https://clef-converter-frontend.onrender.com`. For multiple origins, separate URLs with commas.
# Clef Converter

Clef Converter is a full-stack MVP for rewriting sheet music into a target clef while preserving the underlying sounding pitches. It is designed around cello players who often receive music in treble clef and need a readable bass, tenor, or alto clef version.

## What works now

- React + TypeScript upload and conversion workflow.
- FastAPI API with file type and 25 MB size validation.
- Reliable MusicXML clef conversion for treble, alto, tenor, and bass.
- Pitch, duration, rests, key/time signatures, dynamics, ties, slurs, articulations, voices, and other MusicXML content remain untouched.
- MusicXML download and PDF/image browser preview.
- Unit tests covering all four target clefs, accidentals, rests, rhythms, multiple measures, and multiple voices.

## OMR limitation

PDF and image uploads are accepted and validated by the API, but this repository does not pretend that generic OCR can understand music notation. When no OMR provider is configured, those uploads return a clear `422` response instead of generating a potentially wrong score. The `MusicRecognitionService` abstraction in `backend/models.py` is the integration boundary for Audiveris, a hosted OMR provider, or another MusicXML-producing engine.

For an OMR integration, implement `recognize_music(filename, content)` in that interface and return validated MusicXML. Keep provider credentials in server environment variables; never expose them in the frontend.

## Run in Codespaces

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# terminal 1
uvicorn backend.main:app --reload --port 8000

# terminal 2
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Open the forwarded Vite port. To run the conversion tests:

```bash
pytest
```

To test the frontend production build:

```bash
cd frontend
npm run build
```

## API

`POST /api/convert` accepts multipart fields `file`, `target_clef`, and optional `source_clef`. MusicXML files are converted immediately. PDF/image files return an explicit OMR-not-configured response until a recognition provider is installed.

`GET /health` returns `{ "status": "ok" }`.

## Render deployment

`render.yaml` defines a static frontend and a Python API service. Deploy the repository as a Blueprint. Render builds the frontend with Vite and runs FastAPI with Uvicorn. Set `VITE_API_URL` on the frontend service to the public URL of the API service.