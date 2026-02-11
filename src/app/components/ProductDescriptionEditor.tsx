"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link,
  Type,
  Heading2,
  Heading3,
  Eye,
  Code,
  Package,
  Truck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Image as ImageIcon,
  Copy,
  Check,
  Gauge,
  Save,
  RotateCcw,
} from "lucide-react";

interface ProductDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  enableAutoSave?: boolean;
  storageKey?: string;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "default" | "danger";
}

interface SnippetButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface SEOScore {
  wordCount: number;
  charCount: number;
  hasHeadings: boolean;
  hasBullets: boolean;
  hasBold: boolean;
  hasLinks: boolean;
  hasParagraphs: boolean;
  score: number;
  status: "Needs Work" | "Good" | "Excellent";
}

// E-commerce content snippets
const ECOMMERCE_SNIPPETS = {
  features: {
    label: "Key Features",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    html: `<h3>Key Features</h3>
<ul>
  <li><strong>Feature 1:</strong> Description of feature</li>
  <li><strong>Feature 2:</strong> Description of feature</li>
  <li><strong>Feature 3:</strong> Description of feature</li>
</ul><p><br></p>`,
  },
  specifications: {
    label: "Specifications",
    icon: <FileText className="h-3.5 w-3.5" />,
    html: `<h3>Specifications</h3>
<ul>
  <li><strong>Material:</strong> Premium quality</li>
  <li><strong>Dimensions:</strong> W x H x D</li>
  <li><strong>Weight:</strong> Lightweight design</li>
  <li><strong>Care:</strong> Easy to maintain</li>
</ul><p><br></p>`,
  },
  shipping: {
    label: "Shipping Info",
    icon: <Truck className="h-3.5 w-3.5" />,
    html: `<h3>Shipping & Delivery</h3>
<p>🚚 <strong>Free shipping</strong> on orders over $50</p>
<p>📦 Usually ships within 1-2 business days</p>
<p>🔄 30-day easy returns</p><p><br></p>`,
  },
  stock: {
    label: "Stock Warning",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    html: `<p><strong>⚡ Limited Stock:</strong> Only a few items left! Order now to avoid disappointment.</p>`,
  },
  package: {
    label: "What's Included",
    icon: <Package className="h-3.5 w-3.5" />,
    html: `<h3>What's in the Box</h3>
<ul>
  <li>1x Main product</li>
  <li>1x User manual</li>
  <li>1x Warranty card</li>
</ul><p><br></p>`,
  },
};

// Toolbar button component
function ToolbarButton({ icon, label, onClick, active, variant = "default" }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        // Prevent losing editor selection when clicking toolbar buttons
        event.preventDefault();
      }}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
        active
          ? "bg-indigo-100 text-indigo-700 shadow-inner"
          : variant === "danger"
          ? "text-red-500 hover:bg-red-50"
          : "text-gray-600 hover:bg-gray-100"
      }`}
      title={label}
    >
      {icon}
    </button>
  );
}

// Snippet button component
function SnippetButton({ icon, label, onClick }: SnippetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-indigo-400 hover:bg-gray-50"
    >
      <span className="text-indigo-500 transition-transform group-hover:scale-110">{icon}</span>
      {label}
    </button>
  );
}

// SEO Score indicator component with progress bar
function SEOScoreIndicator({ score }: { score: SEOScore }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { bar: "bg-green-500", text: "text-green-600" };
    if (s >= 50) return { bar: "bg-amber-500", text: "text-amber-600" };
    return { bar: "bg-red-500", text: "text-red-600" };
  };

  const colors = getScoreColor(score.score);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Gauge size={18} className={colors.text} />
        <span className="text-sm font-semibold text-gray-900">Content Score</span>
      </div>
      
      {/* Score display */}
      <div className="mb-2 flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900">{score.score}</span>
        <span className={`mb-1 text-sm font-medium ${colors.text}`}>
          / 100 ({score.status})
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${score.score}%` }}
        />
      </div>
      
      {/* Metrics */}
      <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-xs">
        <span className="text-gray-600">
          <span className="font-semibold text-gray-900">{score.wordCount}</span> words
        </span>
        <span className="text-gray-600">
          <span className="font-semibold text-gray-900">{score.charCount}</span> chars
        </span>
        <span className={score.hasHeadings ? "text-green-600" : "text-gray-400"}>
          {score.hasHeadings ? "✓" : "○"} Headings
        </span>
        <span className={score.hasBullets ? "text-green-600" : "text-gray-400"}>
          {score.hasBullets ? "✓" : "○"} Lists
        </span>
        <span className={score.hasBold ? "text-green-600" : "text-gray-400"}>
          {score.hasBold ? "✓" : "○"} Bold
        </span>
        <span className={score.hasLinks ? "text-green-600" : "text-gray-400"}>
          {score.hasLinks ? "✓" : "○"} Links
        </span>
      </div>
    </div>
  );
}

export default function ProductDescriptionEditor({
  value,
  onChange,
  placeholder = "Start typing your product description...",
  minHeight = 200,
  enableAutoSave = false,
  storageKey = "product_editor_draft",
}: ProductDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isTypingRef = useRef(false);
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Set default paragraph separator on mount
  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  // Sync editor content when value changes externally (not from typing)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isTypingRef.current) return;

    const next = value || "";
    if (editor.innerHTML !== next) {
      editor.innerHTML = next;
    }
  }, [value]);

  // Auto-save effect
  useEffect(() => {
    if (!enableAutoSave || typeof window === "undefined") return;

    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, value);
      setLastSaved(new Date());
    }, 1500);

    return () => clearTimeout(timer);
  }, [value, enableAutoSave, storageKey]);

  // Calculate SEO score
  const seoScore = useMemo((): SEOScore => {
    const text = value.replace(/<[^>]*>/g, " ").trim();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const charCount = text.length;
    const hasHeadings = /<h[1-6][^>]*>/i.test(value);
    const hasBullets = /<(ul|ol)[^>]*>/i.test(value);
    const hasBold = /<(strong|b)[^>]*>/i.test(value);
    const hasLinks = /<a[^>]+href/i.test(value);
    const hasParagraphs = /<\/p><p>|<br>/i.test(value);

    let score = 0;
    // Length scoring (max 40 points)
    if (wordCount > 150) score += 40;
    else if (wordCount > 50) score += 20;
    
    // Formatting scoring (max 60 points)
    if (hasHeadings) score += 15;
    if (hasBullets) score += 15;
    if (hasBold) score += 15;
    if (hasParagraphs) score += 15;

    score = Math.min(score, 100);

    let status: "Needs Work" | "Good" | "Excellent" = "Needs Work";
    if (score >= 80) status = "Excellent";
    else if (score >= 50) status = "Good";

    return { wordCount, charCount, hasHeadings, hasBullets, hasBold, hasLinks, hasParagraphs, score, status };
  }, [value]);

  // Check active formats on selection change
  const checkFormats = useCallback(() => {
    const formats: string[] = [];
    if (document.queryCommandState("bold")) formats.push("bold");
    if (document.queryCommandState("italic")) formats.push("italic");
    if (document.queryCommandState("underline")) formats.push("underline");
    if (document.queryCommandState("insertUnorderedList")) formats.push("ul");
    if (document.queryCommandState("insertOrderedList")) formats.push("ol");
    setActiveFormats(formats);
  }, []);

  // Apply formatting command
  const applyCommand = useCallback(
    (command: string, val?: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      document.execCommand(command, false, val);
      const html = editor.innerHTML || "";
      onChange(html);
      checkFormats();
    },
    [onChange, checkFormats]
  );

  // Handle link insertion
  const handleInsertLink = useCallback(() => {
    const url = window.prompt("Enter URL:");
    if (url) {
      applyCommand("createLink", url);
    }
  }, [applyCommand]);

  // Handle image insertion
  const handleInsertImage = useCallback(() => {
    const url = window.prompt("Enter Image URL:");
    if (url) {
      applyCommand("insertImage", url);
    }
  }, [applyCommand]);

  // Handle clear formatting
  const handleClearFormatting = useCallback(() => {
    applyCommand("removeFormat");
  }, [applyCommand]);

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  // Insert snippet at cursor
  const insertSnippet = useCallback(
    (html: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();

      const success = document.execCommand("insertHTML", false, html);
      if (!success) {
        editor.innerHTML += html;
      }

      const newHtml = editor.innerHTML || "";
      onChange(newHtml);
    },
    [onChange]
  );

  // Handle input in visual editor
  const handleInput = useCallback(() => {
    isTypingRef.current = true;
    const editor = editorRef.current;
    if (editor) {
      const html = editor.innerHTML || "";
      onChange(html);
    }
    setTimeout(() => {
      isTypingRef.current = false;
    }, 100);
  }, [onChange]);

  // Clean up pasted content to avoid messy HTML from external editors
  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      if (!text) return;

      const editor = editorRef.current;
      if (!editor) return;

      // Insert plain text at cursor position
      document.execCommand("insertText", false, text);
      const html = editor.innerHTML || "";
      onChange(html);
    },
    [onChange]
  );

  // Keyboard shortcuts for formatting in visual mode (Ctrl/Cmd + B/I/U/K)
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (viewMode !== "visual") return;
      if (!event.ctrlKey && !event.metaKey) return;

      const key = event.key.toLowerCase();

      if (key === "b") {
        event.preventDefault();
        applyCommand("bold");
      } else if (key === "i") {
        event.preventDefault();
        applyCommand("italic");
      } else if (key === "u") {
        event.preventDefault();
        applyCommand("underline");
      } else if (key === "k") {
        event.preventDefault();
        handleInsertLink();
      }
    },
    [viewMode, applyCommand, handleInsertLink]
  );

  // Handle HTML source mode changes
  const handleHtmlSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const html = e.target.value;
      onChange(html);
    },
    [onChange]
  );

  // No extra sync needed: HTML textarea is controlled by `value`

  return (
    <div>
      <div className="flex flex-col gap-3 transition-colors duration-200">
        {/* Header with actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {lastSaved && enableAutoSave && (
              <span className="flex items-center gap-1">
                <Save size={12} />
                Auto-saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:-translate-y-0.5 ${
                copied ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy HTML"}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
          {/* Heading group */}
          <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2">
            <ToolbarButton
              icon={<Heading2 className="h-4 w-4" />}
              label="Heading 2"
              onClick={() => applyCommand("formatBlock", "h2")}
            />
            <ToolbarButton
              icon={<Heading3 className="h-4 w-4" />}
              label="Heading 3"
              onClick={() => applyCommand("formatBlock", "h3")}
            />
            <ToolbarButton
              icon={<Type className="h-4 w-4" />}
              label="Paragraph"
              onClick={() => applyCommand("formatBlock", "p")}
            />
          </div>

          {/* Style group */}
          <div className="flex items-center gap-0.5 border-r border-gray-200 px-2">
            <ToolbarButton
              icon={<Bold className="h-4 w-4" />}
              label="Bold"
              onClick={() => applyCommand("bold")}
              active={activeFormats.includes("bold")}
            />
            <ToolbarButton
              icon={<Italic className="h-4 w-4" />}
              label="Italic"
              onClick={() => applyCommand("italic")}
              active={activeFormats.includes("italic")}
            />
            <ToolbarButton
              icon={<Underline className="h-4 w-4" />}
              label="Underline"
              onClick={() => applyCommand("underline")}
              active={activeFormats.includes("underline")}
            />
          </div>

          {/* List group */}
          <div className="flex items-center gap-0.5 border-r border-gray-200 px-2">
            <ToolbarButton
              icon={<List className="h-4 w-4" />}
              label="Bullet List"
              onClick={() => applyCommand("insertUnorderedList")}
              active={activeFormats.includes("ul")}
            />
            <ToolbarButton
              icon={<ListOrdered className="h-4 w-4" />}
              label="Numbered List"
              onClick={() => applyCommand("insertOrderedList")}
              active={activeFormats.includes("ol")}
            />
            <ToolbarButton
              icon={<Quote className="h-4 w-4" />}
              label="Blockquote"
              onClick={() => applyCommand("formatBlock", "blockquote")}
            />
          </div>

          {/* Media group */}
          <div className="flex items-center gap-0.5 border-r border-gray-200 px-2">
            <ToolbarButton
              icon={<Link className="h-4 w-4" />}
              label="Insert Link"
              onClick={handleInsertLink}
            />
            <ToolbarButton
              icon={<ImageIcon className="h-4 w-4" />}
              label="Insert Image"
              onClick={handleInsertImage}
            />
            <ToolbarButton
              icon={<RotateCcw className="h-4 w-4" />}
              label="Clear Formatting"
              onClick={handleClearFormatting}
              variant="danger"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 pl-2">
            <ToolbarButton
              icon={<Eye className="h-4 w-4" />}
              label="Visual Editor"
              onClick={() => setViewMode("visual")}
              active={viewMode === "visual"}
            />
            <ToolbarButton
              icon={<Code className="h-4 w-4" />}
              label="HTML Source"
              onClick={() => setViewMode("html")}
              active={viewMode === "html"}
            />
          </div>
        </div>

        {/* Snippets bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Quick Insert:</span>
          {Object.entries(ECOMMERCE_SNIPPETS).map(([key, snippet]) => (
            <SnippetButton
              key={key}
              icon={snippet.icon}
              label={snippet.label}
              onClick={() => insertSnippet(snippet.html)}
            />
          ))}
        </div>

        {/* Editor container */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {viewMode === "visual" ? (
            <div
              ref={editorRef}
              className="editor-content prose prose-sm max-w-none bg-white px-4 py-3 focus:outline-none"
              style={{ minHeight }}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              onKeyUp={checkFormats}
              onMouseUp={checkFormats}
              data-placeholder={placeholder}
            />
          ) : (
            <textarea
              value={value}
              onChange={handleHtmlSourceChange}
              className="w-full resize-none bg-gray-900 px-4 py-3 font-mono text-sm text-green-400 focus:outline-none"
              style={{ minHeight }}
              placeholder="<p>Enter HTML source...</p>"
              spellCheck={false}
            />
          )}

          {/* Status bar */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
            <div className="flex gap-4">
              <span>{seoScore.wordCount} words</span>
              <span>{seoScore.charCount} chars</span>
            </div>
            <span className={viewMode === "html" ? "font-medium text-indigo-600" : ""}>
              {viewMode === "html" ? "HTML Source Mode" : "Visual Mode"}
            </span>
          </div>
        </div>

        {/* SEO Score */}
        <SEOScoreIndicator score={seoScore} />

        {/* Editor styles */}
        <style>{`
          .editor-content ul {
            list-style-type: disc;
            padding-left: 1.5em;
            margin: 1em 0;
          }
          .editor-content ol {
            list-style-type: decimal;
            padding-left: 1.5em;
            margin: 1em 0;
          }
          .editor-content h2 {
            font-size: 1.5em;
            font-weight: 700;
            margin-top: 1em;
            margin-bottom: 0.5em;
          }
          .editor-content h3 {
            font-size: 1.25em;
            font-weight: 600;
            margin-top: 1em;
            margin-bottom: 0.5em;
          }
          .editor-content p {
            margin-bottom: 1em;
            line-height: 1.6;
          }
          .editor-content blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1em;
            font-style: italic;
            color: #6b7280;
          }
          .editor-content img {
            max-width: 100%;
            border-radius: 0.5rem;
            margin: 1em 0;
          }
          .editor-content:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
        `}</style>
      </div>
    </div>
  );
}
