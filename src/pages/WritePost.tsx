import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  Plus, ImagePlus, X, Loader2, Globe, Type, Image as ImageIcon,
  BookOpen, GripVertical, Trash2, ArrowLeft, Gamepad2,
  Undo2, Redo2, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link, Video, Type as TypeIcon, ChevronDown, History as HistoryIcon, Clock,
  Heading1, Heading2, Heading3, ListTree, BookmarkPlus, ChevronLeft, ChevronRight,
  ChevronUp, AlertTriangle, FileVideo
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCreatePost, useUploadPostImage } from "@/hooks/use-news";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const FONTS = [
  { label: "Display (Bold)", value: "font-display", stack: '"Inter", sans-serif', match: ["inter"] },
  { label: "Sans (Modern)", value: "font-sans", stack: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', match: ["sans-serif", "system-ui"] },
  { label: "Mono (Data)", value: "font-mono", stack: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', match: ["monospace", "mono"] },
  { label: "Serif (Story)", value: "font-serif", stack: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', match: ["serif", "georgia", "times"] }
];

const SIZES = ["14px", "16px", "18px", "20px", "24px", "32px", "48px", "64px"];

interface HistoryEntry {
  title: string;
  content: string;
  label: string;
  time: string;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
  collapsed?: boolean;
}

interface PendingMedia {
  id: string;
  file: File;
  type: 'image' | 'video';
  localUrl: string;
}

const Ruler = ({ 
  baseIndent, firstLineIndent, onBaseIndentChange, onFirstLineIndentChange, active 
}: { 
  baseIndent: number, firstLineIndent: number, onBaseIndentChange: (val: number) => void, onFirstLineIndentChange: (val: number) => void, active: boolean 
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragType, setDragType] = useState<"base" | "first" | null>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragType || !rulerRef.current || !active) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(40, (x / rect.width) * 100));
    if (dragType === "base") onBaseIndentChange(Math.round(percentage));
    else onFirstLineIndentChange(Math.round(percentage));
  };

  useEffect(() => {
    if (dragType) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', () => setDragType(null));
    }
    return () => { window.removeEventListener('mousemove', handleMouseMove); };
  }, [dragType]);

  return (
    <div className="w-full flex justify-center select-none" onMouseDown={(e) => e.preventDefault()}>
      <div className={cn("w-full max-w-[850px] h-10 border-x border-border/10 relative flex items-center px-16 transition-all", !active ? "opacity-20 grayscale brightness-50" : "opacity-100")}>
        <div ref={rulerRef} className="relative w-full h-8 flex flex-col justify-center">
          <div className="absolute inset-0 flex items-center pointer-events-none">
            {Array.from({ length: 41 }).map((_, i) => (
              <div key={i} className={cn("absolute bg-primary/20", i % 10 === 0 ? "h-3 w-[1.5px] bg-primary/40" : i % 5 === 0 ? "h-1.5 w-[1px]" : "h-0.5 w-[1px]")} style={{ left: `${(i / 40) * 100}%` }} />
            ))}
          </div>
          {active && (
            <>
              <motion.div className="absolute top-0 w-3 h-3 bg-primary cursor-col-resize z-50 rounded-b-full shadow-lg border border-background" style={{ left: `calc(${firstLineIndent}% - 6px)` }} onMouseDown={(e) => { e.preventDefault(); setDragType("first"); }}>
                 <AnimatePresence>
                  {dragType === "first" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-3 left-1/2 -translate-x-1/2 w-[1.5px] h-[200vh] bg-primary/30 pointer-events-none" />}
                </AnimatePresence>
              </motion.div>
              <motion.div className="absolute bottom-0 w-3 h-3 bg-primary cursor-col-resize z-50 rounded-t-full shadow-lg border border-background" style={{ left: `calc(${baseIndent}% - 6px)` }} onMouseDown={(e) => { e.preventDefault(); setDragType("base"); }}>
                 <AnimatePresence>
                  {dragType === "base" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-0 left-1/2 -translate-x-1/2 w-[1.5px] h-[200vh] bg-primary/30 pointer-events-none" />}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const WritePost = () => {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastRangeRef = useRef<Range | null>(null);
  const lastActiveContainerRef = useRef<HTMLElement | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const STORAGE_KEY = "tm_post_draft";

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return [{ title: parsed.title || "", content: parsed.content || "<p><br></p>", label: "Recovered Draft", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
      } catch (e) { console.error(e); }
    }
    return [{ title: "", content: "<p><br></p>", label: "Started Writing", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
  });
  
  const [historyIndex, setHistoryIndex] = useState(0);
  const [game, setGame] = useState(() => localStorage.getItem(STORAGE_KEY + "_game") || "");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [baseIndent, setBaseIndent] = useState(0);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [toc, setToc] = useState<TOCItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + "_toc");
    return saved ? JSON.parse(saved) : [];
  });

  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{ key: string, range: Range, tocId: string } | null>(null);

  const [currentDNA, setCurrentDNA] = useState({
    fontFamily: "",
    fontSize: "",
    bold: false,
    italic: false,
    isLink: false
  });

  const createPost = useCreatePost();
  const uploadImage = useUploadPostImage();

  const { data: games } = useQuery({
    queryKey: ["supported_games"],
    queryFn: async () => {
      const { data } = await supabase.from("supported_games").select("name").order("name");
      return data || [];
    },
  });

  useEffect(() => {
    if (titleRef.current && editorRef.current) {
      const entry = history[historyIndex];
      if (entry) {
        if (titleRef.current.innerHTML !== entry.title) titleRef.current.innerHTML = entry.title;
        if (editorRef.current.innerHTML !== entry.content) editorRef.current.innerHTML = entry.content;
      }
    }
  }, [historyIndex]);

  const persistDraft = useCallback((manualToc?: TOCItem[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (!editorRef.current || !titleRef.current) return;
      const t = titleRef.current.innerHTML || "";
      const c = editorRef.current.innerHTML || "";
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: t, content: c }));
      if (manualToc) localStorage.setItem(STORAGE_KEY + "_toc", JSON.stringify(manualToc));
    }, 1000);
  }, []);

  const saveHistory = useCallback((label: string = "Typed") => {
    const t = titleRef.current?.innerHTML || "";
    const c = editorRef.current?.innerHTML || "";
    const current = history[historyIndex];
    if (current && t === current.title && c === current.content) return;

    const newEntry = { title: t, content: c, label, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    persistDraft(toc);
  }, [history, historyIndex, persistDraft, toc]);

  useEffect(() => { if (game) localStorage.setItem(STORAGE_KEY + "_game", game); }, [game]);

  const restoreSelection = useCallback(() => {
    if (!lastRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(lastRangeRef.current); }
    lastActiveContainerRef.current?.focus();
  }, []);

  const syncDNA = useCallback(() => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    lastRangeRef.current = range.cloneRange();
    const node = sel.anchorNode;
    const container = (node?.parentElement?.closest('[contenteditable="true"]') as HTMLElement) || editorRef.current;
    lastActiveContainerRef.current = container;

    const parent = node?.nodeType === 3 ? node.parentElement : node as HTMLElement;
    if (parent) {
      const style = window.getComputedStyle(parent);
      const computedStack = style.fontFamily.toLowerCase();
      const matchedFont = FONTS.find(f => f.match && f.match.some(m => computedStack.includes(m)))?.value || "";
      
      const newDNA = {
        fontFamily: matchedFont,
        fontSize: style.fontSize,
        bold: document.queryCommandState('bold') || style.fontWeight === '700' || parseInt(style.fontWeight) >= 600,
        italic: document.queryCommandState('italic') || style.fontStyle === 'italic',
        isLink: !!parent.closest('a')
      };

      setCurrentDNA(prev => (
        prev.bold === newDNA.bold && 
        prev.italic === newDNA.italic && 
        prev.fontFamily === newDNA.fontFamily && 
        prev.fontSize === newDNA.fontSize &&
        prev.isLink === newDNA.isLink
      ) ? prev : newDNA);

      const p = parent.closest('p, h1, h2, h3, div');
      if (p instanceof HTMLElement && p !== editorRef.current) {
        setBaseIndent(parseInt(p.style.paddingLeft) || 0);
        setFirstLineIndent((parseInt(p.style.paddingLeft) || 0) + (parseInt(p.style.textIndent) || 0));
      }
    }
    persistDraft(toc);
  }, [persistDraft, toc]);

  const jumpToHistoryEntry = (idx: number) => {
    setHistoryIndex(idx);
    restoreSelection();
  };

  const confirmDeletion = () => {
    if (!pendingDeleteAction) return;
    const { key, range, tocId } = pendingDeleteAction;
    const newToc = toc.filter(item => item.id !== tocId);
    setToc(newToc); persistDraft(newToc);
    const editor = editorRef.current;
    if (editor) {
      const parts = editor.querySelectorAll(`[data-toc-part="${tocId}"], #${tocId}`);
      parts.forEach(p => { p.removeAttribute('id'); p.removeAttribute('data-toc-part'); });
    }
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges(); sel.addRange(range);
      if (range.collapsed) { document.execCommand(key === 'Backspace' ? 'delete' : 'forwardDelete'); }
      else { range.deleteContents(); }
    }
    setShowDeleteWarning(false); setPendingDeleteAction(null); saveHistory("DELETED OUTLINE");
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key;
    if (key === 'Backspace' || key === 'Delete') {
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        let involvesOutline = false;
        let targetTocId = "";
        if (!range.collapsed) {
          const editor = editorRef.current;
          const outlinedNodes = Array.from(editor?.querySelectorAll('[data-toc-part], [id^="toc-"]') || []);
          const intersecting = outlinedNodes.find(node => range.intersectsNode(node)) as HTMLElement;
          if (intersecting) { involvesOutline = true; targetTocId = intersecting.getAttribute('data-toc-part') || intersecting.id; }
        } else {
          const container = sel.anchorNode?.parentElement?.closest('[data-toc-part], [id^="toc-"]') as HTMLElement;
          if (container) { involvesOutline = true; targetTocId = container.getAttribute('data-toc-part') || container.id; }
        }
        if (involvesOutline) { e.preventDefault(); setPendingDeleteAction({ key, range: range.cloneRange(), tocId: targetTocId }); setShowDeleteWarning(true); return; }
      }
    }

    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const startNode = sel.anchorNode;
      const startOffset = sel.anchorOffset;
      setTimeout(() => {
        const currentSel = window.getSelection();
        if (!currentSel || !currentSel.rangeCount) return;
        try {
          const checkRange = document.createRange();
          if (key === 'ArrowRight') { checkRange.setStart(startNode!, startOffset); checkRange.setEnd(currentSel.anchorNode!, currentSel.anchorOffset); }
          else { checkRange.setStart(currentSel.anchorNode!, currentSel.anchorOffset); checkRange.setEnd(startNode!, startOffset); }
          if (checkRange.toString().includes('\u200B') || currentSel.anchorNode?.textContent === '\u200B') {
            // @ts-ignore
            currentSel.modify('move', key === 'ArrowRight' ? 'forward' : 'backward', 'character');
          }
        } catch (err) {}
      }, 0);
    }

    if (key === 'Enter') {
      setTimeout(() => {
        const sel = window.getSelection();
        let node = sel?.anchorNode;
        if (!node) return;
        let container = (node.nodeType === 3 ? node.parentElement : node) as HTMLElement;
        while (container && container !== editorRef.current) {
          if (container.id.startsWith('toc-')) container.removeAttribute('id');
          if (container.hasAttribute('data-toc-part')) container.removeAttribute('data-toc-part');
          container.querySelectorAll('[data-toc-part], [id^="toc-"]').forEach(el => { el.removeAttribute('id'); el.removeAttribute('data-toc-part'); });
          container = container.parentElement as HTMLElement;
        }
      }, 0);
    }
    if (e.key === ' ' || e.key === 'Enter') { syncDNA(); saveHistory(); }
  };

  const applySurgicalStyle = (type: string, val: any) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);

    if (type === 'createLink') {
      const linkParent = sel.anchorNode?.parentElement?.closest('a');
      if (linkParent) {
        const existingUrl = linkParent.getAttribute('href') || "";
        const newUrl = prompt("Edit link (Clear to remove):", existingUrl);
        if (newUrl === "") { document.execCommand('unlink'); }
        else if (newUrl !== null) { document.execCommand('createLink', false, newUrl); }
      } else {
        if (range.collapsed) { toast.error("Select text first"); return; }
        const url = prompt("Enter URL:"); if (url) document.execCommand('createLink', false, url);
      }
      syncDNA(); saveHistory("LINK"); restoreSelection();
      return;
    }

    if (range.collapsed && !['insertHTML'].includes(type)) {
      let parent = sel.anchorNode?.parentElement;
      const isReusable = parent && parent.classList.contains('style-anchor') && parent.textContent === "\u200B";
      if (!isReusable) {
        const newRange = document.createRange();
        newRange.setStartAfter(parent!); newRange.setEndAfter(parent!);
        sel.removeAllRanges(); sel.addRange(newRange);
        const freshSpan = document.createElement('span');
        freshSpan.className = "style-anchor"; freshSpan.innerHTML = "&#8203;";
        newRange.insertNode(freshSpan);
        newRange.setStart(freshSpan.firstChild!, 1); newRange.setEnd(freshSpan.firstChild!, 1);
        sel.removeAllRanges(); sel.addRange(newRange);
        lastRangeRef.current = newRange.cloneRange();
        parent = freshSpan;
      }
      const targetSpan = isReusable ? parent! : document.createElement('span');
      if (!isReusable) targetSpan.className = "style-anchor";
      if (type === 'font') targetSpan.style.fontFamily = val as string;
      if (type === 'size') { targetSpan.style.fontSize = val as string; targetSpan.style.lineHeight = "1.25"; }
      const isB = type === 'bold' ? !currentDNA.bold : currentDNA.bold;
      const isI = type === 'italic' ? !currentDNA.italic : currentDNA.italic;
      targetSpan.style.fontWeight = isB ? 'bold' : 'normal';
      targetSpan.style.fontStyle = isI ? 'italic' : 'normal';
      if (!isReusable) {
        targetSpan.innerHTML = "&#8203;"; range.insertNode(targetSpan);
        const newRange = document.createRange(); newRange.setStart(targetSpan.firstChild!, 1); newRange.setEnd(targetSpan.firstChild!, 1);
        sel.removeAllRanges(); sel.addRange(newRange); lastRangeRef.current = newRange.cloneRange();
      }
    } else {
      if (type === 'insertHTML') { document.execCommand('insertHTML', false, val); }
      else {
        const span = document.createElement('span');
        const base = window.getComputedStyle(sel.anchorNode?.parentElement || lastActiveContainerRef.current!);
        span.style.fontFamily = type === 'font' ? (val as string) : base.fontFamily;
        span.style.fontSize = type === 'size' ? (val as string) : base.fontSize;
        span.style.lineHeight = "1.25";
        const isB = type === 'bold' ? !currentDNA.bold : currentDNA.bold;
        const isI = type === 'italic' ? !currentDNA.italic : currentDNA.italic;
        span.style.fontWeight = isB ? 'bold' : 'normal';
        span.style.fontStyle = isI ? 'italic' : 'normal';
        const contents = range.extractContents();
        contents.querySelectorAll('span').forEach(s => {
          if (!s.getAttribute('style')) { while (s.firstChild) s.parentNode?.insertBefore(s.firstChild, s); s.remove(); }
        });
        span.appendChild(contents); range.insertNode(span);
        const newRange = document.createRange(); newRange.selectNodeContents(span);
        sel.removeAllRanges(); sel.addRange(newRange); lastRangeRef.current = newRange.cloneRange();
      }
    }
    syncDNA(); saveHistory(type.toUpperCase()); restoreSelection();
  };

  const handleMediaUpload = (file: File, type: 'image' | 'video') => {
    const id = `media-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    setPendingMedia(prev => [...prev, { id, file, type, localUrl }]);
    
    const removeBtnHtml = `<button onclick="this.closest('[data-media-id]').remove()" class="p-3 bg-destructive text-destructive-foreground rounded-full shadow-2xl hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;

    const html = type === 'image' 
      ? `<div class="my-10 rounded-2xl overflow-hidden border border-border/30 bg-black/20 group relative shadow-2xl" contenteditable="false" data-media-id="${id}"><img src="${localUrl}" class="w-full h-auto" /><div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-6">${removeBtnHtml}</div></div><p><br></p>`
      : `<div class="my-10 rounded-2xl overflow-hidden border border-border/30 bg-black/20 group relative shadow-2xl aspect-video" contenteditable="false" data-media-id="${id}"><video src="${localUrl}" controls class="w-full h-full object-cover" /><div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">${removeBtnHtml}</div></div><p><br></p>`;
    
    applySurgicalStyle('insertHTML', html);
  };

  const handleExit = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + "_game");
    localStorage.removeItem(STORAGE_KEY + "_toc");
    pendingMedia.forEach(m => URL.revokeObjectURL(m.localUrl));
    if (coverImage) URL.revokeObjectURL(coverImage);
    navigate("/news");
  };

  const finalizeAndPublish = async () => {
    const t = titleRef.current?.innerText.trim() || "";
    let c = editorRef.current?.innerHTML || "";
    const hasText = editorRef.current?.innerText.trim().length ?? 0 > 0;
    const hasMedia = c.includes('data-media-id') || c.includes('<img') || c.includes('<video') || c.includes('<iframe');
    if (!t) { toast.error("Title is required"); return; }
    if (!game) { toast.error("Please select a Community"); return; }
    if (!hasText && !hasMedia) { toast.error("Story content cannot be empty"); return; }

    setIsFinalizing(true);
    const tid = toast.loading("Finalizing assets...");
    try {
      let finalCoverUrl = "";
      if (coverFile) finalCoverUrl = await uploadImage.mutateAsync(coverFile);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = c;
      const mediaElements = Array.from(tempDiv.querySelectorAll('[data-media-id]'));
      for (const el of mediaElements) {
        const mid = el.getAttribute('data-media-id');
        const pending = pendingMedia.find(m => m.id === mid);
        if (pending) {
          const finalUrl = await uploadImage.mutateAsync(pending.file);
          const asset = el.querySelector('img, video');
          if (asset) asset.setAttribute('src', finalUrl);
        }
      }

      // SECURITY SCRUBBER: Prevent XSS and Link-based scripts
      tempDiv.querySelectorAll('script').forEach(s => s.remove());
      tempDiv.querySelectorAll('*').forEach(el => {
        // Remove all inline event handlers (onclick, onerror, etc)
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
        });
        
        // Specifically sanitize <a> tags
        if (el.tagName === 'A') {
          const href = el.getAttribute('href');
          // Only allow safe protocols
          if (href && !href.toLowerCase().startsWith('http')) {
            el.removeAttribute('href');
          }
        }
        
        // Remove editor-only UI artifacts
        if (el.tagName === 'BUTTON') el.remove();
        if (el.hasAttribute('data-media-id')) el.removeAttribute('data-media-id');
      });

      // Extract all safe links for indexing
      const allLinks = Array.from(tempDiv.querySelectorAll('a'))
        .map(a => a.getAttribute('href'))
        .filter(href => href) as string[];

      createPost.mutate({ title: t, content: tempDiv.innerHTML, game, image_url: finalCoverUrl, toc, links: allLinks }, { 
        onSuccess: () => { toast.success("Story published!", { id: tid }); localStorage.removeItem(STORAGE_KEY); navigate("/news"); }, 
        onError: (e: any) => { toast.error("Failed: " + e.message, { id: tid }); setIsFinalizing(false); }
      });
    } catch (err: any) { toast.error("Asset upload failed: " + err.message, { id: tid }); setIsFinalizing(false); }
  };

  const pinToOutline = () => {
    const sel = window.getSelection();
    if (!sel || !sel.toString().trim()) { toast.error("Select text to pin"); return; }
    const range = sel.getRangeAt(0);
    const editor = editorRef.current;
    if (!editor) return;
    const allBlocks = Array.from(editor.childNodes).filter(child => {
      const visibleText = child.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '').trim() || "";
      return range.intersectsNode(child) && (child.nodeType === 1 || (child.nodeType === 3 && visibleText.length > 0));
    });
    if (allBlocks.some(node => node.nodeType === 1 && ((node as HTMLElement).id.startsWith('toc-') || (node as HTMLElement).hasAttribute('data-toc-part')))) {
      toast.error("Selection already outlined!"); return;
    }
    const id = `toc-${Date.now()}`;
    const text = sel.toString().replace(/\n/g, ' ').trim().slice(0, 50) + (sel.toString().length > 50 ? '...' : '');
    allBlocks.forEach((node, i) => {
      let target: HTMLElement;
      if (node.nodeType === 3) {
        target = document.createElement('p'); node.parentNode?.replaceChild(target, node); target.appendChild(node);
      } else { target = node as HTMLElement; }
      if (i === 0) target.id = id;
      target.setAttribute('data-toc-part', id);
    });
    const newToc = [...toc, { id, text, level: 1 }];
    setToc(newToc); persistDraft(newToc); toast.success("Outline created!");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('glow-cyan'); setTimeout(() => el.classList.remove('glow-cyan'), 2000); }
  };

  const isVisible = (idx: number) => {
    for (let i = 0; i < idx; i++) { if (toc[i].collapsed) { let j = i + 1; while (j < toc.length && toc[j].level > toc[i].level) { if (j === idx) return false; j++; } } }
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden font-sans selection:bg-primary/30">
      <style>{`
        [contenteditable="true"] a { color: hsl(var(--primary)); text-decoration: underline; font-weight: bold; cursor: pointer !important; }
      `}</style>
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl border-b border-border/20 shadow-2xl user-select-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleExit} className="text-muted-foreground hover:text-primary transition-all" tabIndex={-1} onMouseDown={(e) => e.preventDefault()}><ArrowLeft className="w-4 h-4 mr-2" /> Exit</Button>
            <div className="w-[1px] h-5 bg-border/50" />
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-4 h-4 text-primary" />
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="bg-transparent border-none h-8 text-xs font-black uppercase tracking-widest p-0 focus:ring-0 w-[150px] hover:text-primary transition-colors text-foreground justify-start" tabIndex={-1} onMouseDown={(e) => e.preventDefault()}>{game || "Community"} <ChevronDown className="ml-2 w-3 h-3 opacity-40" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass border-border w-[200px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                  {games?.map((g: any) => <DropdownMenuItem key={g.name} onClick={() => setGame(g.name)} className="text-xs font-bold cursor-pointer">{g.name}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Button onClick={finalizeAndPublish} disabled={isFinalizing || createPost.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan h-10 px-8 font-black text-xs uppercase tracking-widest transition-all" tabIndex={-1} onMouseDown={(e) => e.preventDefault()}>{isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />} Publish</Button>
        </div>

        <div className="flex items-center gap-2 px-6 py-2 bg-black/5 overflow-x-auto no-scrollbar">
          <div className="flex items-center bg-background/40 rounded-lg p-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onMouseDown={(e) => e.preventDefault()} onClick={() => jumpToHistoryEntry(Math.max(0, historyIndex - 1))} disabled={historyIndex <= 0} tabIndex={-1}><Undo2 className="h-4 w-4" /></Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-4 px-0 hover:bg-primary/10" onMouseDown={(e) => e.preventDefault()} tabIndex={-1}><ChevronDown className="h-3 w-3 opacity-40" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] glass border-border max-h-[400px] overflow-y-auto custom-scrollbar" align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2"><HistoryIcon className="w-3 h-3" /> History</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/10" />
                {history.map((e, i) => (<DropdownMenuItem key={i} onClick={() => jumpToHistoryEntry(i)} className={cn("flex flex-col items-start gap-1 py-2 cursor-pointer transition-colors", i === historyIndex ? "bg-primary/20 text-primary font-bold" : "hover:bg-primary/5")}><span className="truncate max-w-[120px]">{e.label}</span><span className="text-[9px] opacity-40 flex items-center gap-1"><Clock className="w-2 h-2" /> {e.time}</span></DropdownMenuItem>))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onMouseDown={(e) => e.preventDefault()} onClick={() => jumpToHistoryEntry(Math.min(history.length - 1, historyIndex + 1))} disabled={historyIndex >= history.length - 1} tabIndex={-1}><Redo2 className="h-4 w-4" /></Button>
          </div>

          <div className="flex items-center gap-2 border-r border-border/10 pr-2">
            <Button variant="ghost" className="h-8 px-3 bg-background/50 text-[10px] font-bold border-none hover:bg-primary/5 transition-colors flex items-center gap-2" onMouseDown={(e) => e.preventDefault()} onClick={pinToOutline} tabIndex={-1}><BookmarkPlus className="w-3 h-3 text-primary" /> Pin Outline</Button>
            <div className="w-[1px] h-4 bg-border/10" />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-[140px] bg-background/50 text-[10px] font-bold border-none hover:bg-primary/5 transition-colors justify-between" onMouseDown={(e) => e.preventDefault()} tabIndex={-1}>{FONTS.find(f => f.value === currentDNA.fontFamily)?.label || "Font Family"} <ChevronDown className="w-3 h-3 opacity-40" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass border-border w-[140px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                {FONTS.map(f => (<DropdownMenuItem key={f.value} onClick={() => applySurgicalStyle('font', f.stack)} className="text-[10px] font-bold cursor-pointer">{f.label}</DropdownMenuItem>))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-[80px] bg-background/50 text-[10px] font-bold border-none hover:bg-primary/5 transition-colors justify-between" onMouseDown={(e) => e.preventDefault()} tabIndex={-1}>{currentDNA.fontSize || "Size"} <ChevronDown className="w-3 h-3 opacity-40" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass border-border w-[80px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                {SIZES.map(s => (<DropdownMenuItem key={s} onClick={() => applySurgicalStyle('size', s)} className="text-[10px] font-bold cursor-pointer">{s}</DropdownMenuItem>))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-0.5 border-r border-border/10 pr-2">
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", currentDNA.bold && "bg-primary/20 text-primary")} onMouseDown={(e) => e.preventDefault()} onClick={() => applySurgicalStyle('bold', null)} tabIndex={-1}><Bold className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", currentDNA.italic && "bg-primary/20 text-primary")} onMouseDown={(e) => e.preventDefault()} onClick={() => applySurgicalStyle('italic', null)} tabIndex={-1}><Italic className="h-4 w-4" /></Button>
          </div>

          <div className="flex items-center gap-0.5 border-r border-border/10 pr-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('justifyLeft')} tabIndex={-1}><AlignLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('justifyCenter')} tabIndex={-1}><AlignCenter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('justifyRight')} tabIndex={-1}><AlignRight className="h-4 w-4" /></Button>
          </div>

          <div className="flex items-center gap-1">
            <input type="file" id="img-up" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'image'); }} />
            <input type="file" id="vid-up" hidden accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'video'); }} />
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onMouseDown={(e) => e.preventDefault()} onClick={() => document.getElementById('img-up')?.click()} tabIndex={-1} title="Add Image"><ImagePlus className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onMouseDown={(e) => e.preventDefault()} onClick={() => document.getElementById('vid-up')?.click()} tabIndex={-1} title="Add Video"><FileVideo className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:bg-primary/10 transition-all", currentDNA.isLink ? "bg-primary/20 text-primary shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.2)]" : "")} onMouseDown={(e) => e.preventDefault()} onClick={() => applySurgicalStyle('createLink', null)} tabIndex={-1} title="Add/Remove Link"><Link className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="bg-black/5 border-t border-border/5">
          <Ruler 
            baseIndent={baseIndent} 
            firstLineIndent={firstLineIndent} 
            onBaseIndentChange={(v) => { setBaseIndent(v); const sel = window.getSelection(); const p = sel?.anchorNode?.parentElement?.closest('p, h1, h2, h3, div') as HTMLElement; if (p && p !== editorRef.current) p.style.paddingLeft = `${v}%`; }} 
            onFirstLineIndentChange={(v) => { setFirstLineIndent(v); const sel = window.getSelection(); const p = sel?.anchorNode?.parentElement?.closest('p, h1, h2, h3, div') as HTMLElement; if (p && p !== editorRef.current) p.style.textIndent = `${v - baseIndent}%`; }} 
            active={isEditorFocused} 
          />
        </div>
      </div>

      <aside className="fixed left-8 top-[200px] w-72 hidden xl:block z-40">
        <div className="glass border-border/20 rounded-2xl p-8 space-y-6 shadow-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2"><ListTree className="w-3 h-3 text-primary" /> Outline</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
            {toc.length === 0 ? <p className="text-[10px] italic opacity-30">No sections defined...</p> : toc.map((item, idx) => { if (!isVisible(idx)) return null; const hasChildren = idx + 1 < toc.length && toc[idx+1].level > item.level; return ( <div key={idx} className="group flex flex-col"> <div className="flex items-center gap-2"> {hasChildren ? <button onClick={() => { const newToc = [...toc]; newToc[idx].collapsed = !newToc[idx].collapsed; setToc(newToc); }} className="p-1 hover:bg-primary/10 rounded-md transition-colors"> {item.collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} </button> : <div className="w-5" /> } <button onClick={() => scrollToSection(item.id)} className={cn("flex-1 text-left font-bold transition-all hover:text-primary truncate relative py-1", item.level === 1 ? "text-xs" : item.level === 2 ? "text-[11px] opacity-80" : "text-[10px] pl-4 opacity-60")}> {item.text} </button> <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40 rounded-lg p-0.5"> <button disabled={item.level <= 1} onClick={() => { const newToc = [...toc]; newToc[idx].level = Math.max(1, item.level - 1); setToc(newToc); }} className="p-1 hover:text-primary transition-colors disabled:opacity-20"><ChevronLeft className="w-3 h-3" /></button> <button disabled={item.level >= 3 || (idx > 0 && toc[idx-1].level < item.level)} onClick={() => { const newToc = [...toc]; if (idx > 0 && newToc[idx-1].level >= item.level) { newToc[idx].level = Math.min(3, item.level + 1); setToc(newToc); } }} className="p-1 hover:text-primary transition-colors disabled:opacity-20"><ChevronRight className="w-3 h-3" /></button> <button onClick={() => { const elId = item.id; const parts = editorRef.current?.querySelectorAll(`[data-toc-part="${elId}"], #${elId}`); parts?.forEach(p => { p.removeAttribute('id'); p.removeAttribute('data-toc-part'); }); const newToc = toc.filter((_, i) => i !== idx); setToc(newToc); }} className="p-1 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button> </div> </div> </div> ); })}
          </div>
        </div>
      </aside>

      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto bg-black/10 pt-[200px] no-scrollbar">
        <div className="max-w-[850px] mx-auto bg-card/60 border border-border/50 min-h-screen shadow-2xl rounded-2xl mt-8 mb-20 p-16 relative overflow-hidden transition-all">
          <div className={cn("relative w-full rounded-xl border border-border/30 overflow-hidden bg-black/20 mb-12", coverImage ? "aspect-[21/9]" : "h-64")}>
            {coverImage ? <img src={coverImage} className="w-full h-full object-cover" /> : <button onClick={() => document.getElementById('c-up')?.click()} className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground opacity-40" tabIndex={-1} onMouseDown={(e) => e.preventDefault()}><ImagePlus className="w-12 h-12" /><span>SET COVER</span></button>}
            <input id="c-up" type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverImage(URL.createObjectURL(f)); }
            }} className="hidden" />
          </div>
          <div ref={titleRef} contentEditable onFocus={() => setIsEditorFocused(true)} onKeyDown={handleEditorKeyDown} onKeyUp={() => { syncDNA(); saveHistory(); }} onMouseUp={syncDNA} className="w-full bg-transparent border-none text-5xl md:text-7xl font-bold text-foreground placeholder:before:content-['Title...'] placeholder:before:opacity-10 focus:outline-none mb-16" />
          <div ref={editorRef} contentEditable onFocus={() => { setIsEditorFocused(true); syncDNA(); }} onBlur={(e) => { if (!e.relatedTarget || !(e.relatedTarget as HTMLElement).closest('.fixed')) setIsEditorFocused(false); }} onKeyDown={handleEditorKeyDown} onKeyUp={(e) => { syncDNA(); if (e.key === ' ' || e.key === 'Enter') saveHistory(); }} onMouseUp={syncDNA} onClick={(e) => { const target = (e.target as HTMLElement).closest('a'); if (target) { const url = target.getAttribute('href'); if (url) window.open(url, '_blank', 'noopener,noreferrer'); } }} className="w-full min-h-[500px] bg-transparent border-none text-2xl text-foreground/90 focus:outline-none font-serif transition-all" />
        </div>
      </div>

      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent className="glass border-border/20 rounded-2xl p-8 shadow-2xl">
          <AlertDialogHeader className="space-y-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center mb-2"><AlertTriangle className="w-6 h-6 text-destructive" /></div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Warning: Outline Impact</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">You are attempting to delete content that is pinned to your outline. Confirming this action will remove the text and permanently delete the corresponding section from your document map.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-background/50 border-border h-12 px-6 rounded-xl font-bold hover:bg-background transition-colors" onClick={() => setPendingDeleteAction(null)}>Keep Text</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground h-12 px-8 rounded-xl font-black uppercase tracking-widest hover:bg-destructive/90 glow-destructive transition-all" onClick={confirmDeletion}>Remove Outline</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WritePost;
