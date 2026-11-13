import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  FRAME_COLORS,
  NOTE_COLORS,
  type BoardItem,
  type BoardPageProps,
} from '@/lib/board-types';
import './BoardPage.css';

type Composer = 'choice' | 'note' | 'photo' | null;

const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'A little while ago';
  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BoardPage({
  items,
  isConfigured,
  configMessage,
  isLoading,
  isBusy,
  error,
  onRetry,
  onCreateNote,
  onUploadPhoto,
  onUpdateItem,
}: BoardPageProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoCaptionRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; baseX: number; baseY: number; latestX: number; latestY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [composer, setComposer] = useState<Composer>(null);
  const [activeItem, setActiveItem] = useState<BoardItem | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState<string>(NOTE_COLORS[0].value);
  const [photoCaption, setPhotoCaption] = useState('');
  const [frameColor, setFrameColor] = useState<string>(FRAME_COLORS[0].value);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [editingText, setEditingText] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (!activeItem) return;
    const latest = items.find(item => item.id === activeItem.id);
    if (latest) setActiveItem(latest);
  }, [items, activeItem?.id]);

  useEffect(() => {
    const caption = photoCaptionRef.current;
    if (!caption || activeItem?.kind !== 'photo') return;
    caption.style.height = 'auto';
    caption.style.height = `${caption.scrollHeight}px`;
  }, [editingText, activeItem?.id, activeItem?.kind]);

  const openComposer = (kind: Composer) => {
    setActionError('');
    setComposer(kind);
    setNoteText('');
    setPhotoCaption('');
    setNoteColor(NOTE_COLORS[0].value);
    setFrameColor(FRAME_COLORS[0].value);
    setPhotoFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const closeComposer = () => {
    if (saving || isBusy) return;
    setComposer(null);
    setPhotoFile(null);
    setActionError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const suggestedPosition = () => {
    const count = items.length;
    const offsets = [
      { x: 0.5, y: 0.48 },
      { x: 0.28, y: 0.32 },
      { x: 0.72, y: 0.34 },
      { x: 0.32, y: 0.7 },
      { x: 0.7, y: 0.68 },
    ];
    return offsets[count % offsets.length];
  };

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!noteText.trim()) {
      setActionError('Write a little something before pinning it up.');
      return;
    }
    const point = suggestedPosition();
    setSaving(true);
    setActionError('');
    try {
      const success = await onCreateNote({ noteText: noteText.trim(), noteColor, ...point });
      if (success) setComposer(null);
      else setActionError('That note did not stick. Please try again.');
    } catch {
      setActionError('That note did not stick. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitPhoto = async (event: FormEvent) => {
    event.preventDefault();
    if (!photoFile) {
      setActionError('Choose a photo to add to your board.');
      return;
    }
    if (!photoTypes.includes(photoFile.type)) {
      setActionError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const success = await onUploadPhoto({
        file: photoFile,
        photoCaption: photoCaption.trim(),
        frameColor,
        ...suggestedPosition(),
      });
      if (success) {
        setComposer(null);
        setPhotoFile(null);
        if (fileRef.current) fileRef.current.value = '';
      } else setActionError('The photo could not be added. Please try again.');
    } catch {
      setActionError('The photo could not be added. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openItem = (item: BoardItem) => {
    setActiveItem(item);
    setEditingText(item.kind === 'note' ? item.noteText || '' : item.photoCaption || '');
    setEditingColor(item.kind === 'note' ? item.noteColor : item.frameColor);
    setActionError('');
  };

  const saveItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeItem) return;
    if (activeItem.kind === 'note' && !editingText.trim()) {
      setActionError('A sticky note needs a little text.');
      return;
    }
    setSaving(true);
    setActionError('');
    const update = activeItem.kind === 'note'
      ? { noteText: editingText.trim(), noteColor: editingColor }
      : { photoCaption: editingText.trim(), frameColor: editingColor };
    try {
      const success = await onUpdateItem(activeItem.id, update);
      if (success) setActiveItem(null);
      else setActionError('Your changes could not be saved. Please try again.');
    } catch {
      setActionError('Your changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>, item: BoardItem) => {
    if ((event.target as HTMLElement).closest('button, input, textarea, a')) return;
    if (!boardRef.current || isBusy || saving) return;
    dragRef.current = {
      id: item.id,
      startX: event.clientX,
      startY: event.clientY,
      baseX: positions[item.id]?.x ?? item.x,
      baseY: positions[item.id]?.y ?? item.y,
      latestX: positions[item.id]?.x ?? item.x,
      latestY: positions[item.id]?.y ?? item.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;
    const bounds = board.getBoundingClientRect();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (!drag.moved) return;
    const itemBounds = event.currentTarget.getBoundingClientRect();
    const minX = Math.min(0.5, itemBounds.width / (2 * bounds.width));
    const minY = Math.min(0.5, itemBounds.height / (2 * bounds.height));
    drag.latestX = Math.max(minX, Math.min(1 - minX, drag.baseX + dx / bounds.width));
    drag.latestY = Math.max(minY, Math.min(1 - minY, drag.baseY + dy / bounds.height));
    setPositions(previous => ({
      ...previous,
      [drag.id]: {
        x: drag.latestX,
        y: drag.latestY,
      },
    }));
  };

  const handlePointerUp = async () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.moved) return;
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 150);
    const position = { x: drag.latestX, y: drag.latestY };
    try {
      const success = await onUpdateItem(drag.id, position);
      if (!success) {
        setPositions(previous => {
          const next = { ...previous };
          delete next[drag.id];
          return next;
        });
        setActionError('Position could not be saved. Please try again.');
      }
    } catch {
      setActionError('Position could not be saved. Please try again.');
    }
  };

  const busy = isBusy || saving;
  const activeIsNote = activeItem?.kind === 'note';
  const totalItems = items.length;

  return (
    <main className="keepsake-page" data-testid="page-board">
      <header className="keepsake-header">
        <div className="keepsake-brand">
          <span className="keepsake-brand-mark" aria-hidden="true"><span /></span>
          <div>
            <p className="keepsake-kicker">zeze time <span>·</span> together</p>
            <h1>Our little board</h1>
          </div>
        </div>
        <div className="keepsake-header-note">
          <span className="keepsake-live-dot" aria-hidden="true" />
          <span>A place for the bits we want to keep</span>
        </div>
      </header>

      <section className="board-intro" aria-label="Board introduction">
        <div>
          <p className="board-eyebrow">A shared corner of the internet</p>
          <h2>Little moments, <em>kept close.</em></h2>
        </div>
        <p className="board-count" data-testid="text-board-count">
          <span>{String(totalItems).padStart(2, '0')}</span> {totalItems === 1 ? 'keepsake' : 'keepsakes'}
        </p>
      </section>

      {!isConfigured && (
        <aside className="board-banner board-banner-setup" role="status" data-testid="status-board-setup">
          <span className="banner-stamp" aria-hidden="true">i</span>
          <div><strong>One tiny setup step</strong><p>{configMessage || 'The shared board is not connected yet.'}</p></div>
        </aside>
      )}
      {!!error && (
        <aside className="board-banner board-banner-error" role="alert" data-testid="status-board-error">
          <div><strong>We lost our place for a moment.</strong><p>{error}</p></div>
          <button className="board-text-button" onClick={onRetry} disabled={busy} data-testid="button-retry-board">
            <RotateCcw size={15} /> Try again
          </button>
        </aside>
      )}
      {!!actionError && !composer && (
        <div className="board-action-notice" role="alert" data-testid="status-board-action-error">{actionError}</div>
      )}

      <section className="board-wrap" aria-label="Shared keepsake board">
        <div className="board-top-edge">
          <span className="board-edge-label"><span className="edge-dash" /> PINNED WITH LOVE <span className="edge-dash" /></span>
          <span className="board-edge-date">EST. TOGETHER</span>
        </div>
        <div className="board-surface" ref={boardRef} data-testid="board-surface">
          <div className="board-fleck board-fleck-one" aria-hidden="true" />
          <div className="board-fleck board-fleck-two" aria-hidden="true" />
          <div className="board-fleck board-fleck-three" aria-hidden="true" />
          {isLoading ? (
            <div className="board-loading" role="status" data-testid="status-board-loading">
              <div className="skeleton-paper" /><div className="skeleton-paper small" />
              <span>Gathering your little moments…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="board-empty" data-testid="empty-board">
              <span className="empty-scribble" aria-hidden="true"><MessageCircle size={25} /></span>
              <p className="empty-overline">A fresh little beginning</p>
              <h3>Nothing pinned up<br />just yet.</h3>
              <p className="empty-copy">Add the first note or photo you’d like to keep close.</p>
              <button className="empty-add-button" onClick={() => openComposer('choice')} disabled={busy || !isConfigured} data-testid="button-empty-add">
                <Plus size={17} /> Make the first memory
              </button>
            </div>
          ) : items.map(item => {
            const position = positions[item.id] || { x: item.x, y: item.y };
            const isNote = item.kind === 'note';
            return (
              <article
                key={item.id}
                className={`keepsake-item ${isNote ? 'keepsake-note' : 'keepsake-photo'}`}
                style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%`, backgroundColor: isNote ? item.noteColor : item.frameColor }}
                onPointerDown={event => handlePointerDown(event, item)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onClick={() => {
                  if (suppressClickRef.current) return;
                  openItem(item);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openItem(item);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${isNote ? 'Open note' : 'Open photo'}: ${isNote ? item.noteText || 'Untitled note' : item.photoCaption || 'Photo'}`}
                data-testid={`item-board-${item.id}`}
              >
                {isNote ? (
                  <>
                    <span className="note-pin" aria-hidden="true" />
                    <span className="note-corner" aria-hidden="true" />
                    <p className="note-copy">{item.noteText || 'A note waiting to be written…'}</p>
                    <span className="item-date">{formatDate(item.createdAt)}</span>
                  </>
                ) : (
                  <>
                    <span className="photo-pin" aria-hidden="true" />
                    <span className="photo-image-wrap">
                      {item.photoUrl
                        ? <img src={item.photoUrl} alt={item.photoCaption ? `Keepsake photo: ${item.photoCaption}` : 'A shared keepsake'} draggable={false} />
                        : <span className="photo-missing"><Camera size={28} /><span>Photo keepsake</span></span>}
                    </span>
                    <span className="photo-caption">{item.photoCaption || 'A moment worth keeping'}</span>
                    <span className="item-date">{formatDate(item.createdAt)}</span>
                  </>
                )}
              </article>
            );
          })}
          <div className="board-bottom-mark" aria-hidden="true">ours · always</div>
        </div>
      </section>

      <div className="board-footer">
        <p>Made of little things that mean a lot.</p>
        <button className="board-add-button" onClick={() => openComposer('choice')} disabled={busy || !isConfigured} aria-label="Add a keepsake" data-testid="button-add-keepsake">
          <Plus size={21} strokeWidth={2.3} /><span>Add to our board</span>
        </button>
      </div>

      {composer && (
        <div className="board-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeComposer(); }} data-testid="modal-compose">
          <section className="board-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title">
            <button className="modal-close" onClick={closeComposer} aria-label="Close" disabled={busy} data-testid="button-close-compose"><X size={19} /></button>
            {composer === 'choice' ? (
              <>
                <div className="modal-kicker">ADD A LITTLE SOMETHING</div>
                <h2 id="compose-title" className="modal-title">What should we pin up?</h2>
                <p className="modal-subtitle">A small note or a photo can make this corner feel more like ours.</p>
                <div className="compose-choices">
                  <button onClick={() => setComposer('photo')} className="compose-choice choice-photo" data-testid="button-choose-photo">
                    <span className="choice-icon"><ImagePlus size={21} /></span>
                    <span><strong>Add a photo</strong><small>Keep a moment in a paper frame</small></span>
                    <ChevronLeft size={17} className="choice-arrow" />
                  </button>
                  <button onClick={() => setComposer('note')} className="compose-choice choice-note" data-testid="button-choose-note">
                    <span className="choice-icon"><MessageCircle size={21} /></span>
                    <span><strong>Write a note</strong><small>Leave a little something to find</small></span>
                    <ChevronLeft size={17} className="choice-arrow" />
                  </button>
                </div>
              </>
            ) : composer === 'note' ? (
              <form onSubmit={submitNote}>
                <button type="button" className="modal-back" onClick={() => setComposer('choice')} data-testid="button-back-compose"><ChevronLeft size={15} /> Back</button>
                <div className="modal-kicker">A NOTE FOR YOUR PERSON</div>
                <h2 id="compose-title" className="modal-title">Put it into words.</h2>
                <label className="field-label" htmlFor="new-note-text">Your note</label>
                <textarea id="new-note-text" className="board-textarea" value={noteText} onChange={event => setNoteText(event.target.value)} maxLength={500} placeholder="A thought, a thank you, a tiny reminder…" autoFocus data-testid="input-note-text" />
                <div className="field-meta"><span>It can be a small thing.</span><span>{noteText.length}/500</span></div>
                <ColorPicker label="Choose a sticky-note color" colors={NOTE_COLORS} value={noteColor} onChange={setNoteColor} testId="note-color" />
                {actionError && <p className="modal-error" role="alert" data-testid="status-compose-error">{actionError}</p>}
                <button className="modal-submit" type="submit" disabled={busy || !isConfigured} data-testid="button-save-note">{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Pin this note</button>
              </form>
            ) : (
              <form onSubmit={submitPhoto}>
                <button type="button" className="modal-back" onClick={() => setComposer('choice')} data-testid="button-back-compose"><ChevronLeft size={15} /> Back</button>
                <div className="modal-kicker">SAVE A MOMENT</div>
                <h2 id="compose-title" className="modal-title">One for the board.</h2>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={event => {
                  const file = event.target.files?.[0] ?? null;
                  setPhotoFile(file);
                  setActionError(file && !photoTypes.includes(file.type) ? 'Choose a JPEG, PNG, or WebP image.' : '');
                }} data-testid="input-photo-file" />
                <button type="button" className={`photo-dropzone ${photoPreview ? 'has-preview' : ''}`} onClick={() => fileRef.current?.click()} data-testid="button-select-photo">
                  {photoPreview ? <img src={photoPreview} alt="Local preview of the selected photo" /> : <><span className="upload-icon"><ImagePlus size={22} /></span><strong>Choose a photo</strong><small>JPEG, PNG or WebP · this preview stays on this device</small></>}
                  {photoPreview && <span className="change-photo">Choose a different photo</span>}
                </button>
                <label className="field-label" htmlFor="new-photo-caption">A few words underneath <span className="optional-label">optional</span></label>
                <textarea id="new-photo-caption" className="board-textarea caption-input" value={photoCaption} onChange={event => setPhotoCaption(event.target.value)} maxLength={300} placeholder="Where we were, what we laughed about…" data-testid="input-photo-caption" />
                <ColorPicker label="Choose a paper frame" colors={FRAME_COLORS} value={frameColor} onChange={setFrameColor} testId="frame-color" />
                {actionError && <p className="modal-error" role="alert" data-testid="status-compose-error">{actionError}</p>}
                <button className="modal-submit" type="submit" disabled={busy || !isConfigured} data-testid="button-save-photo">{busy ? <LoaderCircle className="spin" size={17} /> : <Camera size={17} />} Pin this photo</button>
              </form>
            )}
          </section>
        </div>
      )}

      {activeItem && (
        <div className="board-modal-backdrop detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setActiveItem(null); }} data-testid="modal-item-detail">
          <section className={`board-modal detail-modal ${activeIsNote ? 'detail-note' : 'detail-photo'}`} role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <button className="modal-close" onClick={() => setActiveItem(null)} aria-label="Close details" disabled={busy} data-testid="button-close-detail"><X size={19} /></button>
            <div className="modal-kicker">{activeIsNote ? 'A LITTLE NOTE' : 'A PHOTO TO KEEP'}</div>
            <h2 id="detail-title" className="modal-title">{activeIsNote ? 'Keep this close.' : 'Remember this one.'}</h2>
            {activeIsNote ? (
              <div className="detail-note-preview" style={{ backgroundColor: editingColor }}>
                <span className="note-pin" aria-hidden="true" />
                <p>{activeItem.noteText || 'A note waiting to be written…'}</p>
              </div>
            ) : (
              <div className="detail-photo-preview" style={{ backgroundColor: editingColor }}>
                {activeItem.photoUrl ? <img src={activeItem.photoUrl} alt={activeItem.photoCaption ? `Keepsake photo: ${activeItem.photoCaption}` : 'A shared keepsake'} /> : <div className="photo-missing"><Camera size={28} /><span>Photo keepsake</span></div>}
                <label className="visually-hidden" htmlFor="detail-text">Photo caption</label>
                <textarea
                  ref={photoCaptionRef}
                  id="detail-text"
                  className="photo-caption-editor"
                  value={editingText}
                  onChange={event => setEditingText(event.target.value)}
                  maxLength={300}
                  placeholder="A few words underneath…"
                  rows={1}
                  data-testid="input-detail-text"
                />
              </div>
            )}
            <p className="detail-created">{formatDate(activeItem.createdAt)}</p>
            <form onSubmit={saveItem}>
              {activeIsNote && <>
                <label className="field-label" htmlFor="detail-text">Note text</label>
                <textarea id="detail-text" className="board-textarea" value={editingText} onChange={event => setEditingText(event.target.value)} maxLength={500} data-testid="input-detail-text" />
              </>}
              <ColorPicker label={activeIsNote ? 'Sticky-note color' : 'Photo-frame color'} colors={activeIsNote ? NOTE_COLORS : FRAME_COLORS} value={editingColor} onChange={setEditingColor} testId="detail-color" />
              {actionError && <p className="modal-error" role="alert" data-testid="status-detail-error">{actionError}</p>}
              <div className="detail-actions">
                <button className="modal-submit detail-save" type="submit" disabled={busy || !isConfigured} data-testid="button-save-item">{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save changes</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function ColorPicker({
  label,
  colors,
  value,
  onChange,
  testId,
}: {
  label: string;
  colors: readonly { readonly value: string; readonly label: string }[];
  value: string;
  onChange: (color: string) => void;
  testId: string;
}) {
  return (
    <fieldset className="color-field">
      <legend className="field-label">{label}</legend>
      <div className="color-options">
        {colors.map(color => (
          <button
            key={color.value}
            type="button"
            className={`color-swatch ${value === color.value ? 'selected' : ''}`}
            style={{ backgroundColor: color.value }}
            aria-label={color.label}
            aria-pressed={value === color.value}
            onClick={() => onChange(color.value)}
            data-testid={`${testId}-${color.label.toLowerCase().replaceAll(' ', '-')}`}
          >
            {value === color.value && <Check size={13} />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
