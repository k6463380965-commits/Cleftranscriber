import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Check, FileText, Info, Music2, Upload } from 'lucide-react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

type Clef = 'treble' | 'alto' | 'tenor' | 'bass';
type Phase = 'idle' | 'uploading' | 'success' | 'error';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const clefs: { value: Clef; label: string; symbol: string; range: string }[] = [
  { value: 'treble', label: 'Treble', symbol: 'G', range: 'G4 on the second line' },
  { value: 'alto', label: 'Alto', symbol: 'C', range: 'C4 on the middle line' },
  { value: 'tenor', label: 'Tenor', symbol: 'C', range: 'C4 on the fourth line' },
  { value: 'bass', label: 'Bass', symbol: 'F', range: 'F3 on the fourth line' },
];

function ScorePreview({ musicxml }: { musicxml: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !musicxml) return;
    const renderer = new OpenSheetMusicDisplay(container.current, { backend: 'svg', autoResize: true, drawTitle: false });
    renderer.load(musicxml).then(() => renderer.render());
    return () => { if (container.current) container.current.innerHTML = ''; };
  }, [musicxml]);

  return <div className="score-preview" ref={container} />;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [targetClef, setTargetClef] = useState<Clef>('bass');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [musicxml, setMusicxml] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    const supported = ['application/pdf', 'image/png', 'image/jpeg', 'application/xml', 'text/xml'];
    const extensionOk = /\.(pdf|png|jpe?g|xml|musicxml|mxl)$/i.test(nextFile.name);
    if (!supported.includes(nextFile.type) && !extensionOk) {
      setPhase('error'); setMessage('Please choose a PDF, PNG, JPG, or MusicXML file.'); return;
    }
    if (nextFile.size > 25 * 1024 * 1024) {
      setPhase('error'); setMessage('Files must be smaller than 25 MB.'); return;
    }
    setFile(nextFile); setPhase('idle'); setMessage(''); setMusicxml('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(nextFile.type === 'application/pdf' || nextFile.type.startsWith('image/') ? URL.createObjectURL(nextFile) : '');
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0]);
  const onDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); };

  const convert = async () => {
    if (!file) { setPhase('error'); setMessage('Upload a score before converting.'); return; }
    setPhase('uploading'); setMessage('Reading notation and preserving every sounding pitch…');
    const body = new FormData(); body.append('file', file); body.append('target_clef', targetClef);
    try {
      const response = await fetch(`${API_URL}/api/convert`, { method: 'POST', body });
      const result = await response.json() as { musicxml?: string; filename?: string; detail?: string; warnings?: string[] };
      if (!response.ok) throw new Error(result.detail ?? 'Conversion failed.');
      setMusicxml(result.musicxml ?? ''); setPhase('success'); setMessage(result.warnings?.[0] ?? 'Conversion complete. Review the result before downloading.');
    } catch (error) {
      setPhase('error'); setMessage(error instanceof Error ? error.message : 'Conversion failed. Is the API running?');
    }
  };

  const download = () => {
    if (!musicxml) return;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([musicxml], { type: 'application/vnd.recordare.musicxml+xml' })); link.download = `${file?.name.replace(/\.[^.]+$/, '') ?? 'converted'}-${targetClef}.musicxml`; link.click(); URL.revokeObjectURL(link.href);
  };

  return <div className="app">
    <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><Music2 size={17} /></span>clef <small>converter</small></a><div className="top-links"><span className="status-dot"><i /> API ready</span><a href="#how-it-works">How it works</a><a className="github-link" href="https://github.com" target="_blank" rel="noreferrer">Open source ↗</a></div></header>
    <main>
      <section className="hero"><div className="hero-copy"><p className="kicker">Pitch-preserving notation conversion</p><h1>Make the music<br /><em>sit where you play.</em></h1><p className="hero-text">Convert sheet music into the clef you need, without changing a single sounding note.</p></div><div className="hero-note" aria-hidden="true"><span>♩</span><span>♪</span><span>♫</span><span>♬</span></div></section>
      <section className="workspace">
        <div className="step-heading"><span className="step-number">01</span><div><h2>Upload your score</h2><p>PDF, image, or an existing MusicXML file</p></div></div>
        <label className={`dropzone ${file ? 'has-file' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><input type="file" accept=".pdf,.png,.jpg,.jpeg,.xml,.musicxml,.mxl" onChange={onInput} />{file ? <><div className="file-badge"><Check size={19} /></div><div className="file-name">{file.name}</div><div className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB · ready to convert</div><button type="button" className="change-file" onClick={(event) => { event.preventDefault(); setFile(null); setPreviewUrl(''); }}>Change file</button></> : <><div className="upload-badge"><Upload size={21} /></div><strong>Drop sheet music here</strong><span>or <u>browse your files</u></span><small>Maximum 25 MB · PDF, PNG, JPG, MusicXML</small></>}</label>
        <div className="step-heading clef-heading"><span className="step-number">02</span><div><h2>Choose a target clef</h2><p>Written positions change. Sounding pitches stay exactly the same.</p></div><span className="cello-pill"><Music2 size={14} /> Cello mode</span></div>
        <div className="clef-grid">{clefs.map((clef) => <button key={clef.value} className={`clef-option ${targetClef === clef.value ? 'selected' : ''}`} onClick={() => setTargetClef(clef.value)}><span className="clef-symbol">{clef.symbol}</span><span><strong>{clef.label}</strong><small>{clef.range}</small></span>{targetClef === clef.value && <Check className="selected-check" size={16} />}</button>)}</div>
        <div className="action-row"><button className="convert-button" onClick={convert} disabled={phase === 'uploading'}>{phase === 'uploading' ? <><span className="spinner" /> Analyzing notation…</> : <><Music2 size={17} /> Convert to {clefs.find((clef) => clef.value === targetClef)?.label}</>}</button>{message && <div className={`feedback ${phase}`}><Info size={16} />{message}</div>}</div>
      </section>
      {(file || musicxml) && <section className="results" id="results"><div className="result-header"><div><p className="kicker">Review before export</p><h2>Your score, re-written</h2></div>{musicxml && <button className="download-button" onClick={download}><ArrowDownToLine size={16} /> Download MusicXML</button>}</div><div className="preview-grid"><div className="preview-card"><div className="preview-label"><span>Original</span><span>{file?.name}</span></div>{previewUrl ? <iframe title="Original score preview" src={previewUrl} /> : <div className="empty-preview"><FileText size={28} /><span>MusicXML source uploaded</span></div>}</div><div className="preview-card converted-preview"><div className="preview-label"><span>Converted · {clefs.find((clef) => clef.value === targetClef)?.label}</span><span className="ready-label">● Ready to review</span></div>{musicxml ? <ScorePreview musicxml={musicxml} /> : <div className="empty-preview"><Music2 size={28} /><span>Convert to generate a review copy</span></div>}</div></div><div className="review-note"><Info size={17} /><span><strong>Review matters.</strong> Optical music recognition can make mistakes with low-quality scans, handwriting, complex notation, or overlapping voices. This MVP accepts MusicXML for reliable conversion; PDF/image OMR is ready for a provider integration.</span></div></section>}
      <section className="how" id="how-it-works"><div><p className="kicker">The promise</p><h2>Same music.<br /><em>Different doorway.</em></h2></div><div className="how-copy"><p>Clefs are instructions for reading staff positions, not transposition commands. Clef Converter keeps the MusicXML pitch, rhythm, dynamics, articulations, rests, and measures intact while changing the reading context around them.</p><div className="how-points"><span><Check size={15} /> Pitch never silently moves</span><span><Check size={15} /> Cello-first defaults</span><span><Check size={15} /> Open MusicXML export</span></div></div></section>
    </main><footer><span>clef converter · 2026</span><span>Built for the in-between ideas.</span><a href="mailto:hello@example.com">Feedback ↗</a></footer>
  </div>;
}

export default App;