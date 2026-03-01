import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Link, ImageIcon, Code,
  AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, Minus, Type,
  Lock, Unlock,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder = 'Start writing...' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const dragState = useRef<{ startX: number; startY: number; startW: number; startH: number; aspect: number; handle: string } | null>(null);

  // Sync external value to editor on mount or when value changes externally
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const deselectImage = useCallback(() => setSelectedImage(null), []);

  const selectImage = useCallback((img: HTMLImageElement) => {
    setSelectedImage(img);
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    setImgDims({ w, h });
  }, []);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.preventDefault();
      selectImage(target as HTMLImageElement);
    } else {
      deselectImage();
    }
  }, [selectImage, deselectImage]);

  const handleEditorKeyDown = useCallback(() => {
    if (selectedImage) deselectImage();
  }, [selectedImage, deselectImage]);

  // Drag-to-resize logic
  const handleCornerMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImage) return;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: selectedImage.offsetWidth,
      startH: selectedImage.offsetHeight,
      aspect: selectedImage.offsetWidth / (selectedImage.offsetHeight || 1),
      handle,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current || !selectedImage) return;
      const { startX, startY, startW, startH, aspect, handle: h } = dragState.current;
      let dx = ev.clientX - startX;
      let dy = ev.clientY - startY;

      // Flip deltas for left-side handles
      if (h === 'tl' || h === 'bl') dx = -dx;
      // Flip deltas for top-side handles
      if (h === 'tl' || h === 'tr') dy = -dy;

      let newW = Math.max(50, startW + dx);
      let newH = Math.max(50, startH + dy);

      if (aspectLocked) {
        // Use whichever axis moved more
        if (Math.abs(dx) >= Math.abs(dy)) {
          newH = Math.round(newW / aspect);
        } else {
          newW = Math.round(newH * aspect);
        }
      }

      selectedImage.style.width = newW + 'px';
      selectedImage.style.height = newH + 'px';
      setImgDims({ w: newW, h: newH });
    };

    const onMouseUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      handleInput();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [selectedImage, aspectLocked, handleInput]);

  // Dimension input handlers
  const setWidth = useCallback((w: number) => {
    if (!selectedImage || w < 1) return;
    const aspect = selectedImage.offsetWidth / (selectedImage.offsetHeight || 1);
    selectedImage.style.width = w + 'px';
    if (aspectLocked) {
      const h = Math.round(w / aspect);
      selectedImage.style.height = h + 'px';
      setImgDims({ w, h });
    } else {
      setImgDims(prev => ({ ...prev, w }));
    }
    handleInput();
  }, [selectedImage, aspectLocked, handleInput]);

  const setHeight = useCallback((h: number) => {
    if (!selectedImage || h < 1) return;
    const aspect = selectedImage.offsetWidth / (selectedImage.offsetHeight || 1);
    selectedImage.style.height = h + 'px';
    if (aspectLocked) {
      const w = Math.round(h * aspect);
      selectedImage.style.width = w + 'px';
      setImgDims({ w, h });
    } else {
      setImgDims(prev => ({ ...prev, h }));
    }
    handleInput();
  }, [selectedImage, aspectLocked, handleInput]);

  // Deselect if selected image is removed from DOM
  useEffect(() => {
    if (selectedImage && !editorRef.current?.contains(selectedImage)) {
      deselectImage();
    }
  }, [value, selectedImage, deselectImage]);

  // Compute overlay position
  const getOverlayStyle = (): React.CSSProperties | null => {
    if (!selectedImage || !containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();
    const imgRect = selectedImage.getBoundingClientRect();
    return {
      position: 'absolute',
      top: imgRect.top - containerRect.top,
      left: imgRect.left - containerRect.left,
      width: imgRect.width,
      height: imgRect.height,
      pointerEvents: 'none',
    };
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const formatBlock = (tag: string) => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
    handleInput();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      exec('createLink', url);
    }
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      exec('insertImage', url);
    }
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    active?: boolean;
  }> = ({ onClick, title, children, active }) => (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-lg transition-all hover:bg-slate-200 ${
        active ? 'bg-primary/10 text-primary' : 'text-slate-500'
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-slate-200 mx-1" />;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-0.5">
        {/* Undo / Redo */}
        <ToolbarButton onClick={() => exec('undo')} title="Undo">
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('redo')} title="Redo">
          <Redo2 size={15} />
        </ToolbarButton>

        <Divider />

        {/* Block formatting */}
        <ToolbarButton onClick={() => formatBlock('p')} title="Paragraph">
          <Type size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => formatBlock('h1')} title="Heading 1">
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => formatBlock('h2')} title="Heading 2">
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => formatBlock('h3')} title="Heading 3">
          <Heading3 size={15} />
        </ToolbarButton>

        <Divider />

        {/* Inline formatting */}
        <ToolbarButton onClick={() => exec('bold')} title="Bold">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Italic">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="Underline">
          <Underline size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('strikeThrough')} title="Strikethrough">
          <Strikethrough size={15} />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet List">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numbered List">
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => formatBlock('blockquote')} title="Quote">
          <Quote size={15} />
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => exec('justifyLeft')} title="Align Left">
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyCenter')} title="Align Center">
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyRight')} title="Align Right">
          <AlignRight size={15} />
        </ToolbarButton>

        <Divider />

        {/* Insert */}
        <ToolbarButton onClick={insertLink} title="Insert Link">
          <Link size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} title="Insert Image">
          <ImageIcon size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertHorizontalRule')} title="Horizontal Rule">
          <Minus size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const code = document.createElement('code');
            code.className = 'bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600';
            range.surroundContents(code);
            handleInput();
          }
        }} title="Inline Code">
          <Code size={15} />
        </ToolbarButton>
      </div>

      {/* Editor Area */}
      <div ref={containerRef} className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={(e) => {
            handleInput();
            // Deselect if focus moves outside the container
            if (!containerRef.current?.contains(e.relatedTarget as Node)) {
              deselectImage();
            }
          }}
          onClick={handleEditorClick}
          onKeyDown={handleEditorKeyDown}
          data-placeholder={placeholder}
          className="min-h-[320px] max-h-[600px] overflow-y-auto px-6 py-4 prose prose-slate prose-sm max-w-none focus:outline-none
            prose-headings:font-bold prose-a:text-primary prose-img:rounded-xl prose-blockquote:border-l-primary
            empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        />

        {/* Image resize overlay */}
        {selectedImage && (() => {
          const style = getOverlayStyle();
          if (!style) return null;
          const handleSize = 10;
          const corners = [
            { key: 'tl', top: -handleSize / 2, left: -handleSize / 2, cursor: 'nwse-resize' },
            { key: 'tr', top: -handleSize / 2, right: -handleSize / 2, cursor: 'nesw-resize' },
            { key: 'bl', bottom: -handleSize / 2, left: -handleSize / 2, cursor: 'nesw-resize' },
            { key: 'br', bottom: -handleSize / 2, right: -handleSize / 2, cursor: 'nwse-resize' },
          ];
          return (
            <>
              {/* Selection border */}
              <div style={style}>
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '2px dashed #3b82f6',
                  borderRadius: 4,
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Corner handles */}
              {corners.map(({ key, cursor, ...pos }) => (
                <div
                  key={key}
                  onMouseDown={(e) => handleCornerMouseDown(e, key)}
                  style={{
                    position: 'absolute',
                    width: handleSize,
                    height: handleSize,
                    background: '#3b82f6',
                    border: '1px solid white',
                    cursor,
                    pointerEvents: 'auto',
                    zIndex: 10,
                    top: pos.top !== undefined
                      ? (style.top as number) + (pos.top as number)
                      : (style.top as number) + (style.height as number) - handleSize / 2,
                    left: pos.left !== undefined
                      ? (style.left as number) + (pos.left as number)
                      : (style.left as number) + (style.width as number) - handleSize / 2,
                  }}
                />
              ))}

              {/* Floating dimension toolbar */}
              <div
                style={{
                  position: 'absolute',
                  top: (style.top as number) + (style.height as number) + 8,
                  left: style.left as number,
                  zIndex: 10,
                  pointerEvents: 'auto',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg shadow-lg px-2 py-1.5 text-xs">
                  <label className="text-slate-500">W</label>
                  <input
                    type="number"
                    min={1}
                    value={imgDims.w}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setAspectLocked(!aspectLocked)}
                    title={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                    className={`p-1 rounded transition-colors ${aspectLocked ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {aspectLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <label className="text-slate-500">H</label>
                  <input
                    type="number"
                    min={1}
                    value={imgDims.h}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-slate-400">px</span>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default RichTextEditor;
