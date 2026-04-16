import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Link, ImageIcon, Code,
  AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, Minus, Type,
  Lock, Unlock, Link2, Unlink,
  Upload, Loader2,
} from 'lucide-react';
import { superAdminService } from '../../services/superadmin.service';
import { sanitizeHtml } from '../../utils/sanitize';
import { useToast } from '../../context/ToastContext';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder = 'Start writing...' }) => {
  const { showToast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [imgAlign, setImgAlign] = useState<'left' | 'center' | 'right'>('left');
  const [imgLink, setImgLink] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLink, setSelectedLink] = useState<HTMLAnchorElement | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkEditing, setLinkEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkToolbarRef = useRef<HTMLDivElement>(null);
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

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    const content = html || plain;
    if (content) {
      const clean = html
        ? sanitizeHtml(html)
        : plain.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, clean);
      handleInput();
    }
  }, [handleInput]);

  const deselectImage = useCallback(() => setSelectedImage(null), []);

  const selectImage = useCallback((img: HTMLImageElement) => {
    setSelectedImage(img);
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    setImgDims({ w, h });

    // Detect current alignment from inline styles
    const ml = img.style.marginLeft;
    const mr = img.style.marginRight;
    if (ml === 'auto' && mr === 'auto') setImgAlign('center');
    else if (ml === 'auto' && mr === '0px') setImgAlign('right');
    else setImgAlign('left');

    // Detect existing link wrapper
    const parent = img.parentElement;
    if (parent && parent.tagName === 'A') {
      setImgLink((parent as HTMLAnchorElement).href);
    } else {
      setImgLink('');
    }
  }, []);

  const deselectLink = useCallback(() => {
    setSelectedLink(null);
    setLinkUrl('');
    setLinkEditing(false);
  }, []);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.preventDefault();
      selectImage(target as HTMLImageElement);
      deselectLink();
    } else if (target.tagName === 'A' || target.closest?.('a')) {
      e.preventDefault();
      const anchor = (target.tagName === 'A' ? target : target.closest('a')) as HTMLAnchorElement;
      // Don't select image-wrapper links (those are handled by the image toolbar)
      if (anchor.querySelector('img')) {
        selectImage(anchor.querySelector('img') as HTMLImageElement);
        deselectLink();
      } else {
        setSelectedLink(anchor);
        setLinkUrl(anchor.href);
        setLinkEditing(false);
        deselectImage();
      }
    } else {
      deselectImage();
      deselectLink();
    }
  }, [selectImage, deselectImage, deselectLink]);

  const handleEditorKeyDown = useCallback(() => {
    if (selectedImage) deselectImage();
    if (selectedLink) deselectLink();
  }, [selectedImage, deselectImage, selectedLink, deselectLink]);

  const updateLinkUrl = useCallback((newUrl: string) => {
    if (!selectedLink || !newUrl.trim()) return;
    selectedLink.href = newUrl.trim();
    setLinkUrl(newUrl.trim());
    setLinkEditing(false);
    handleInput();
  }, [selectedLink, handleInput]);

  const removeLink = useCallback(() => {
    if (!selectedLink) return;
    // Replace the <a> with its text content
    const text = document.createTextNode(selectedLink.textContent || '');
    selectedLink.replaceWith(text);
    deselectLink();
    handleInput();
  }, [selectedLink, deselectLink, handleInput]);

  // Compute link toolbar position
  const getLinkOverlayStyle = useCallback((): React.CSSProperties | null => {
    if (!selectedLink || !containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();
    const linkRect = selectedLink.getBoundingClientRect();
    return {
      position: 'absolute',
      top: linkRect.bottom - containerRect.top + 6,
      left: Math.max(0, linkRect.left - containerRect.left),
      zIndex: 20,
      pointerEvents: 'auto',
    };
  }, [selectedLink]);

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

  // Image alignment handler
  const alignImage = useCallback((align: 'left' | 'center' | 'right') => {
    if (!selectedImage) return;
    selectedImage.style.display = 'block';
    switch (align) {
      case 'left':
        selectedImage.style.marginLeft = '0';
        selectedImage.style.marginRight = 'auto';
        break;
      case 'center':
        selectedImage.style.marginLeft = 'auto';
        selectedImage.style.marginRight = 'auto';
        break;
      case 'right':
        selectedImage.style.marginLeft = 'auto';
        selectedImage.style.marginRight = '0';
        break;
    }
    setImgAlign(align);
    handleInput();
  }, [selectedImage, handleInput]);

  // Image link handler
  const toggleImageLink = useCallback(() => {
    if (!selectedImage) return;
    const parent = selectedImage.parentElement;

    if (parent && parent.tagName === 'A') {
      // Unwrap: move img out of the <a>, then remove the <a>
      parent.replaceWith(selectedImage);
      setImgLink('');
    } else {
      const url = prompt('Enter link URL for this image:');
      if (url) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        selectedImage.replaceWith(anchor);
        anchor.appendChild(selectedImage);
        setImgLink(url);
      }
    }
    handleInput();
  }, [selectedImage, handleInput]);

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
    // If a link is already selected, switch to edit mode
    if (selectedLink) {
      setLinkEditing(true);
      return;
    }
    const url = prompt('Enter URL:');
    if (url) {
      exec('createLink', url);
    }
  };

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = '';

    setIsUploading(true);
    try {
      const url = await superAdminService.uploadContentImage(file);
      editorRef.current?.focus();
      document.execCommand('insertImage', false, url);
      handleInput();
    } catch (err) {
      console.error('[RichTextEditor] Image upload failed:', err);
      showToast('Image upload failed. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  }, [handleInput]);

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
      {/* Link visibility styles for contentEditable */}
      <style>{`
        [contenteditable] a { color: #3b82f6 !important; text-decoration: underline !important; cursor: pointer; }
        [contenteditable] a:hover { color: #2563eb !important; background-color: rgba(59, 130, 246, 0.08); border-radius: 2px; }
      `}</style>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
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
        <ToolbarButton onClick={insertImage} title="Upload Image">
          {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
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
          onPaste={handlePaste}
          onBlur={(e) => {
            handleInput();
            // Deselect if focus moves outside the container (but not into the link toolbar)
            if (!containerRef.current?.contains(e.relatedTarget as Node) && !linkToolbarRef.current?.contains(e.relatedTarget as Node)) {
              deselectImage();
              deselectLink();
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

              {/* Floating image toolbar */}
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
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-lg px-2 py-1.5 text-xs">
                  {/* Alignment buttons */}
                  <button
                    type="button"
                    onClick={() => alignImage('left')}
                    title="Align left"
                    className={`p-1 rounded transition-colors ${imgAlign === 'left' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <AlignLeft size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignImage('center')}
                    title="Align center"
                    className={`p-1 rounded transition-colors ${imgAlign === 'center' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <AlignCenter size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignImage('right')}
                    title="Align right"
                    className={`p-1 rounded transition-colors ${imgAlign === 'right' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <AlignRight size={12} />
                  </button>

                  <div className="w-px h-4 bg-slate-200 mx-0.5" />

                  {/* Link button */}
                  <button
                    type="button"
                    onClick={toggleImageLink}
                    title={imgLink ? 'Remove link' : 'Add link'}
                    className={`p-1 rounded transition-colors ${imgLink ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {imgLink ? <Unlink size={12} /> : <Link2 size={12} />}
                  </button>

                  <div className="w-px h-4 bg-slate-200 mx-0.5" />

                  {/* Dimension inputs */}
                  <label className="text-slate-500">W</label>
                  <input
                    type="number"
                    min={1}
                    value={imgDims.w}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-14 border border-slate-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-14 border border-slate-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-slate-400">px</span>
                </div>
              </div>
            </>
          );
        })()}

        {/* Link editing toolbar */}
        {selectedLink && (() => {
          const pos = getLinkOverlayStyle();
          if (!pos) return null;
          return (
            <div ref={linkToolbarRef} style={pos} onMouseDown={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg shadow-lg px-2.5 py-1.5 text-xs max-w-md">
                {linkEditing ? (
                  <>
                    <input
                      type="url"
                      autoFocus
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); updateLinkUrl(linkUrl); }
                        if (e.key === 'Escape') { e.preventDefault(); setLinkEditing(false); }
                      }}
                      placeholder="https://..."
                      className="flex-1 min-w-[200px] border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => updateLinkUrl(linkUrl)}
                      className="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-primary/90 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkEditing(false)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <Link size={12} className="text-blue-500 flex-shrink-0" />
                    <span
                      className="text-blue-600 underline truncate max-w-[200px] cursor-pointer"
                      title={linkUrl}
                      onClick={() => setLinkEditing(true)}
                    >
                      {linkUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLinkEditing(true)}
                      title="Edit link"
                      className="p-1 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Code size={12} />
                    </button>
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open link"
                      className="p-1 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={removeLink}
                      title="Remove link"
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Unlink size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default RichTextEditor;
