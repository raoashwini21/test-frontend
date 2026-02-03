
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Settings, RefreshCw, CheckCircle, AlertCircle, Loader, TrendingUp, Search, Sparkles, Code, Eye, Copy } from 'lucide-react';

const BACKEND_URL = 'https://test-backend-production-f29b.up.railway.app';

// BOFU Research Prompt (Comparison, Reviews, Alternatives, Pricing)
const BOFU_RESEARCH_PROMPT = `You are a professional fact-checker and researcher. Your job is to:
1. Verify ALL claims in the content: pricing, features, stats, company info, technical specs
2. Use Brave Search strategically: official websites first, 2-3 searches per topic, recent info (2024-2025)
3. Focus on LinkedIn/SalesRobot specifics
4. Check for missing AI/NEW features in competitor comparisons
5. Return structured findings with factChecks and missingFeatures arrays
Be thorough but concise. Focus on accuracy.`;

// TOFU Research Prompt (Educational, Awareness, General Info)
const TOFU_RESEARCH_PROMPT = `You are a professional fact-checker for educational content. Your job is to:
1. Verify general industry claims and statistics about LinkedIn, sales automation, and B2B outreach
2. Use Brave Search to check: industry trends (2024-2025), best practices from authoritative sources, general statistics
3. Focus on educational accuracy: LinkedIn platform stats, general limits/policies, industry benchmarks, common best practices
4. Verify definitions, terminology, and conceptual explanations
5. Check recent trends and developments in the space
Be thorough but focus on educational accuracy, not product specifics. Return structured findings with factChecks array.`;

// MOFU Research Prompt (Consideration, How-To, Frameworks)
const MOFU_RESEARCH_PROMPT = `You are a professional fact-checker for consideration-stage content. Your job is to:
1. Verify framework claims, methodologies, and strategic guidance
2. Use Brave Search to check: use case examples, industry comparisons, solution categories, implementation best practices
3. Focus on buyer guidance: "how to choose" criteria, solution category definitions, implementation timelines, use case validation
4. Check authoritative sources for recommendations and guidance
5. Balance general information with solution category comparisons
Be thorough and balanced. Focus on helping buyers make informed decisions. Return structured findings with factChecks array.`;

// Auto-detect blog type from title
const detectBlogType = (title) => {
  const titleLower = title.toLowerCase();
  
  // BOFU keywords (comparison, alternatives, reviews, pricing)
  const bofuKeywords = ['vs ', ' vs.', 'versus', 'alternative', 'alternatives', 'review', 'pricing', 'comparison', 'compare', 'better than', 'or ', 'which is better', 'worth it', 'pros and cons'];
  
  // TOFU keywords (educational, awareness, general info)
  const tofuKeywords = ['what is', 'what are', 'why', 'top 10', 'top 5', 'tips', 'guide to', 'introduction', 'beginner', 'basics', 'explained', 'definition', 'ultimate guide', 'complete guide'];
  
  // MOFU keywords (consideration, how-to, frameworks)
  const mofuKeywords = ['how to', 'best practices', 'getting started', 'choosing', 'selecting', 'framework', 'strategy', 'guide for', 'steps to', 'ways to', 'mistakes to avoid', 'should you', 'when to use'];
  
  // Check for BOFU
  if (bofuKeywords.some(keyword => titleLower.includes(keyword))) {
    return 'BOFU';
  }
  
  // Check for TOFU
  if (tofuKeywords.some(keyword => titleLower.includes(keyword))) {
    return 'TOFU';
  }
  
  // Check for MOFU
  if (mofuKeywords.some(keyword => titleLower.includes(keyword))) {
    return 'MOFU';
  }
  
  // Default: if contains numbers/lists, likely TOFU; otherwise MOFU
  if (/\d+/.test(titleLower) && (titleLower.includes('tips') || titleLower.includes('ways'))) {
    return 'TOFU';
  }
  
  // Default to MOFU (safest middle ground)
  return 'MOFU';
};

const RESEARCH_PROMPT = BOFU_RESEARCH_PROMPT; // Kept for backwards compatibility

const WRITING_PROMPT = `You are an expert blog rewriter focused on clarity, accuracy, and engagement.

**CRITICAL WRITING RULES:**
NEVER USE: Em-dashes, banned words, sentences over 30 words, markdown syntax
ALWAYS USE: Contractions, active voice, short sentences, HTML bold tags (<strong> or <b>)

**CRITICAL: PRESERVE ALL FORMATTING AND STRUCTURE EXACTLY**
- Keep ALL heading tags (<h1>, <h2>, <h3>, <h4>, <h5>, <h6>) EXACTLY as they are in the original
- Keep ALL heading hierarchy the same - do NOT change H2 to H3, or H3 to H2, etc.
- Keep ALL heading text EXACTLY the same - do NOT rewrite, rephrase, or modify heading content
- Keep ALL heading IDs and attributes unchanged

**ABSOLUTE RULE FOR HEADINGS:**
DO NOT modify heading content in any way. Headings must be copied EXACTLY character-for-character from the original HTML.
Examples:
- Original: <h2 id="best-linkedin-automation-tools">Best LinkedIn Automation Tools</h2>
- CORRECT: Keep it EXACTLY as-is
- WRONG: <h2 id="best-linkedin-automation-tools">Top LinkedIn Automation Tools</h2>
- WRONG: <h2>Best LinkedIn Automation Tools</h2> (missing ID)

- Keep ALL heading text the same unless it contains factual errors
- Keep ALL bold (<strong>, <b>) and italic (<em>, <i>) formatting EXACTLY as-is
- Keep ALL links (<a> tags) EXACTLY as-is - preserve href, target, and all attributes
- Keep ALL paragraph breaks and spacing EXACTLY as they appear in original
- Keep ALL list structures (<ul>, <ol>, <li>) EXACTLY as-is
- Keep ALL class attributes, IDs, and data attributes unchanged

**CRITICAL: LIST STRUCTURE (CRITICAL FOR WEBFLOW):**
- ALWAYS wrap <li> elements in <ul> or <ol> tags
- NEVER put <li> directly inside <p> tags
- CORRECT: <ul role="list"><li role="listitem">Item</li></ul>
- WRONG: <p><li>Item</li></p>
- Lists must have role="list" attribute for Webflow
- List items must have role="listitem" attribute for Webflow

**CRITICAL: PRESERVE ALL SPECIAL ELEMENTS - DO NOT CONVERT TO TEXT**
- Keep ALL <iframe>, <script>, <embed>, <object>, <video>, <audio>, <canvas>, <form> tags EXACTLY as-is
- Keep ALL widget classes (w-embed-, w-widget-, info-widget, widget-, etc.) unchanged
- Keep ALL data attributes (data-*, w-*, webflow-*) unchanged
- Keep the "hidden" class on widget elements - DO NOT remove it
- Keep ALL widget structure and nested elements intact (widget-type, info-widget-heading, info-widget-content, etc.)
- NEVER convert widgets/embeds to text - keep them as functional HTML
- NEVER escape HTML in widgets - keep < > characters not &lt; &gt;

**WHAT YOU CAN CHANGE:**
- Fix factual errors (pricing, features, statistics, dates)
- Remove em-dashes and replace with regular dashes or commas
- Shorten overly long sentences (30+ words)
- Add contractions where natural
- Convert passive voice to active voice
- Bold important terms using <strong> tags

**WHAT YOU CANNOT CHANGE:**
- Heading levels (H1, H2, H3, etc.)
- Paragraph structure and breaks
- List formatting (bullet vs numbered)
- Any HTML structure or nesting
- Widget or embed code
- Image tags or attributes

Return only the complete rewritten HTML content with all images, tables, widgets, iframes, scripts, embeds, and EXACT heading structure preserved with no modifications to formatting.`;

// IMPROVED HIGHLIGHTING LOGIC - Only highlights real content changes
const createHighlightedHTML = (originalHTML, updatedHTML) => {
  const normalizeForComparison = (html) => {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };
  
  const splitIntoBlocks = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;
    const blocks = [];
    
    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toUpperCase();
        const isBlockElement = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE'].includes(tagName);
        const isSpecialElement = ['TABLE', 'IFRAME', 'EMBED', 'SCRIPT', 'IMG', 'FIGURE', 'VIDEO', 'AUDIO', 'CANVAS', 'OBJECT', 'SVG', 'FORM'].includes(tagName);
        
        if (isBlockElement || isSpecialElement) {
          blocks.push(node.outerHTML);
        } else {
          Array.from(node.childNodes).forEach(processNode);
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        blocks.push(node.textContent);
      }
    };
    
    Array.from(container.childNodes).forEach(processNode);
    return blocks;
  };
  
  const originalBlocks = splitIntoBlocks(originalHTML);
  const updatedBlocks = splitIntoBlocks(updatedHTML);
  
  const originalMap = new Map();
  originalBlocks.forEach((block, idx) => {
    const normalized = normalizeForComparison(block);
    if (normalized && normalized.length > 10) {
      if (!originalMap.has(normalized)) {
        originalMap.set(normalized, []);
      }
      originalMap.get(normalized).push({ html: block, index: idx, used: false });
    }
  });
  
  let highlightedHTML = '';
  let changesCount = 0;
  
  updatedBlocks.forEach((updatedBlock) => {
    const normalizedUpdated = normalizeForComparison(updatedBlock);
    
    const isSpecialElement = 
      updatedBlock.match(/<(table|iframe|embed|script|img|figure|video|audio|canvas|object|svg|form)/i) ||
      updatedBlock.match(/class="[^"]*widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*-widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-embed[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-widget[^"]*"/i) ||
      updatedBlock.match(/data-w-id/i) ||
      updatedBlock.match(/data-widget/i);
    
    if (isSpecialElement) {
      highlightedHTML += updatedBlock;
      return;
    }
    
    const matchingBlocks = originalMap.get(normalizedUpdated);
    if (matchingBlocks && matchingBlocks.length > 0) {
      const match = matchingBlocks.find(m => !m.used);
      if (match) {
        match.used = true;
        highlightedHTML += updatedBlock;
        return;
      }
    }
    
    if (normalizedUpdated.length > 20) {
      let foundSimilar = false;
      const updatedWords = normalizedUpdated.split(/\s+/).filter(w => w.length > 3);
      const updatedWordSet = new Set(updatedWords);
      
      if (updatedWordSet.size > 0) {
        for (const [origNormalized, origBlocks] of originalMap.entries()) {
          const unusedBlock = origBlocks.find(b => !b.used);
          if (!unusedBlock) continue;
          
          const origWords = origNormalized.split(/\s+/).filter(w => w.length > 3);
          const origWordSet = new Set(origWords);
          if (origWordSet.size === 0) continue;
          
          let matchCount = 0;
          updatedWordSet.forEach(word => {
            if (origWordSet.has(word)) matchCount++;
          });
          
          const totalWords = Math.max(updatedWordSet.size, origWordSet.size);
          const similarity = matchCount / totalWords;
          const differentWords = updatedWords.filter(w => !origWordSet.has(w)).length;
          
          if (similarity >= 0.95 || differentWords < 3) {
            foundSimilar = true;
            unusedBlock.used = true;
            highlightedHTML += updatedBlock;
            return;
          }
        }
      }
      
      if (!foundSimilar) {
        const highlighted = `<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">${updatedBlock}</div>`;
        highlightedHTML += highlighted;
        changesCount++;
        return;
      }
    }
    
    highlightedHTML += updatedBlock;
  });
  
  return { html: highlightedHTML, changesCount };
};

function VisualEditor({ content, onChange }) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  useEffect(() => {
    if (!window.Quill && !document.querySelector('script[src*="quill"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://cdn.quilljs.com/1.3.6/quill.js';
      script.onload = () => initQuill();
      document.body.appendChild(script);
    } else if (window.Quill) {
      initQuill();
    }
  }, []);
  const initQuill = () => {
    if (!editorRef.current || quillRef.current) return;
    const Quill = window.Quill;
    const BlockEmbed = Quill.import('blots/block/embed');
    class ImageBlot extends BlockEmbed {
      static create(value) {
        let node = super.create();
        node.setAttribute('src', value.src || value);
        if (value.alt) node.setAttribute('alt', value.alt);
        node.setAttribute('style', 'max-width: 100%; height: auto;');
        return node;
      }
      static value(node) {
        return { src: node.getAttribute('src'), alt: node.getAttribute('alt') };
      }
    }
    ImageBlot.blotName = 'image';
    ImageBlot.tagName = 'img';
    Quill.register(ImageBlot);
    quillRef.current = new Quill(editorRef.current, {
      theme: 'snow',
      modules: { toolbar: [[{ 'header': [1, 2, 3, 4, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link', 'image'], ['clean']] }
    });
    const delta = quillRef.current.clipboard.convert(content);
    quillRef.current.setContents(delta, 'silent');
    quillRef.current.on('text-change', () => { onChange(quillRef.current.root.innerHTML); });
  };
  useEffect(() => {
    if (quillRef.current && content !== quillRef.current.root.innerHTML) {
      const cursorPosition = quillRef.current.getSelection();
      const delta = quillRef.current.clipboard.convert(content);
      quillRef.current.setContents(delta, 'silent');
      if (cursorPosition) { try { quillRef.current.setSelection(cursorPosition); } catch (e) { } }
    }
  }, [content]);
  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200">
      <style>{`.ql-editor img { max-width: 100%; height: auto; display: block; margin: 1rem 0; } .ql-editor h1 { font-size: 2.25rem; font-weight: 700; margin: 2rem 0 1rem 0; } .ql-editor h2 { font-size: 1.875rem; font-weight: 700; margin: 1.75rem 0 1rem 0; } .ql-editor h3 { font-size: 1.5rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0; } .ql-editor h4 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem 0; } .ql-editor table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; border: 1px solid #e5e7eb; } .ql-editor th { background-color: #f3f4f6; padding: 0.75rem; border: 1px solid #e5e7eb; } .ql-editor td { padding: 0.75rem; border: 1px solid #e5e7eb; }`}</style>
      <div ref={editorRef} style={{ minHeight: '600px' }} />
    </div>
  );
}

export default function ContentOps() {
  const [view, setView] = useState('home');
  const [config, setConfig] = useState({ 
    anthropicKey: '', 
    braveKey: '', 
    webflowKey: '', 
    collectionId: '' 
  });
  const [savedConfig, setSavedConfig] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [result, setResult] = useState(null);
  const [viewMode, setViewMode] = useState('changes');
  const [editMode, setEditMode] = useState('visual');
  const [editedContent, setEditedContent] = useState('');
  const [highlightedData, setHighlightedData] = useState(null);
  const [imageAltModal, setImageAltModal] = useState({ show: false, src: '', currentAlt: '', index: -1 });
  const [showHighlights, setShowHighlights] = useState(true);
  const editablePreviewRef = useRef(null);
  const afterViewRef = useRef(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [editingLink, setEditingLink] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [savedSelection, setSavedSelection] = useState(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaFieldName, setMetaFieldName] = useState('post-summary');
  const [blogCache, setBlogCache] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

  // GSC state
  const [gscData, setGscData] = useState(null);
  const [showGscModal, setShowGscModal] = useState(false);
  const [gscUploading, setGscUploading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('contentops_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedConfig(parsed);
      setConfig(parsed);
    }

    const savedGsc = localStorage.getItem('contentops_gsc_data');
    if (savedGsc) {
      try {
        const parsed = JSON.parse(savedGsc);
        setGscData(parsed);
        console.log('✅ Loaded GSC data:', parsed.totalMatches, 'blogs');
      } catch (e) {
        console.error('Failed to parse GSC data');
      }
    }
  }, []);

  useEffect(() => {
    if (result && result.content && result.originalContent && !highlightedData) {
      const highlighted = createHighlightedHTML(result.originalContent, result.content);
      setHighlightedData(highlighted);
    }
  }, [result]);

  useEffect(() => {
    if (editablePreviewRef.current && editMode === 'html') {
      editablePreviewRef.current.innerHTML = editedContent;
    }
  }, [editedContent, editMode]);

  useEffect(() => {
    if (afterViewRef.current && viewMode === 'changes') {
      if (showHighlights) {
        afterViewRef.current.innerHTML = highlightedData?.html || editedContent;
      } else {
        const currentContent = afterViewRef.current.innerHTML;
        const cleanedContent = currentContent.replace(
          /<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">(.*?)<\/div>/gs,
          '$1'
        );
        afterViewRef.current.innerHTML = cleanedContent;
      }
    }
  }, [viewMode, showHighlights, highlightedData]);

  useEffect(() => {
    if (afterViewRef.current) {
      const links = afterViewRef.current.querySelectorAll('a');
      links.forEach(link => {
        link.style.color = '#0ea5e9';
        link.style.textDecoration = 'underline';
        link.style.cursor = 'pointer';
        link.style.pointerEvents = 'auto';
      });
    }
  }, [editedContent, viewMode]);

  const handleEditablePreviewInput = () => {
    if (editablePreviewRef.current) {
      setEditedContent(editablePreviewRef.current.innerHTML);
    }
  };

  const handleAfterViewInput = () => {
    if (!afterViewRef.current) return;
    const rawHTML = afterViewRef.current.innerHTML;
    const cleanedHTML = rawHTML.replace(
      /<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">(.*?)<\/div>/gs,
      '$1'
    );
    setEditedContent(cleanedHTML);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0).cloneRange());
    }
  };

  const formatText = (command) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) return;
    const parentElement = range.commonAncestorContainer.parentElement;
    const tag = command === 'bold' ? 'STRONG' : 'EM';
    let formattedParent = parentElement;
    while (formattedParent && formattedParent !== afterViewRef.current) {
      if (formattedParent.tagName === tag || (command === 'bold' && formattedParent.tagName === 'B') || (command === 'italic' && formattedParent.tagName === 'I')) {
        const text = formattedParent.textContent;
        const textNode = document.createTextNode(text);
        formattedParent.parentNode.replaceChild(textNode, formattedParent);
        if (afterViewRef.current) {
          setEditedContent(afterViewRef.current.innerHTML);
        }
        return;
      }
      formattedParent = formattedParent.parentElement;
    }
    const element = document.createElement(command === 'bold' ? 'strong' : 'em');
    element.textContent = selectedText;
    range.deleteContents();
    range.insertNode(element);
    range.setStartAfter(element);
    range.setEndAfter(element);
    selection.removeAllRanges();
    selection.addRange(range);
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
  };

  const formatHeading = (level) => {
    if (!afterViewRef.current) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    let block = range.startContainer;
    while (block && block !== afterViewRef.current) {
      if (block.nodeType === Node.ELEMENT_NODE && 
          ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(block.tagName)) {
        break;
      }
      block = block.parentNode;
    }
    if (!block || block === afterViewRef.current) {
      const heading = document.createElement(`h${level}`);
      heading.textContent = selection.toString() || 'Heading';
      range.deleteContents();
      range.insertNode(heading);
      range.setStartAfter(heading);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const heading = document.createElement(`h${level}`);
      heading.innerHTML = block.innerHTML;
      block.parentNode.replaceChild(heading, block);
      const newRange = document.createRange();
      newRange.selectNodeContents(heading);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    setEditedContent(afterViewRef.current.innerHTML);
  };

  const formatList = (type) => {
    if (!afterViewRef.current) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let block = range.startContainer;
    
    while (block && block !== afterViewRef.current) {
      if (block.nodeType === Node.ELEMENT_NODE && 
          ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(block.tagName)) {
        break;
      }
      block = block.parentNode;
    }
    
    if (!block || block === afterViewRef.current) return;
    
    const parentList = block.closest('ul, ol');
    if (parentList) {
      const fragment = document.createDocumentFragment();
      Array.from(parentList.children).forEach(li => {
        const p = document.createElement('p');
        p.innerHTML = li.innerHTML;
        fragment.appendChild(p);
      });
      parentList.parentNode.replaceChild(fragment, parentList);
    } else {
      const listElement = document.createElement(type === 'bullet' ? 'ul' : 'ol');
      listElement.setAttribute('role', 'list');
      
      const li = document.createElement('li');
      li.setAttribute('role', 'listitem');
      li.innerHTML = block.innerHTML;
      listElement.appendChild(li);
      block.parentNode.replaceChild(listElement, block);
    }
    
    setEditedContent(afterViewRef.current.innerHTML);
  };

  const insertLink = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let element = range.commonAncestorContainer;
      while (element && element !== afterViewRef.current) {
        if (element.tagName === 'A') {
          setEditingLink(element);
          setLinkUrl(element.href);
          setLinkText(element.textContent || '');
          setShowLinkModal(true);
          return;
        }
        element = element.parentElement;
      }
    }
    saveSelection();
    setEditingLink(null);
    setLinkUrl('');
    setLinkText('');
    setShowLinkModal(true);
  };

  const applyLink = () => {
    if (!linkUrl) return;
    if (editingLink) {
      editingLink.href = linkUrl;
      editingLink.target = '_blank';
      editingLink.rel = 'noopener noreferrer';
      if (linkText && linkText.trim()) {
        editingLink.textContent = linkText;
      }
    } else {
      if (savedSelection) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedSelection.cloneRange());
        const selectedText = selection.toString();
        const link = document.createElement('a');
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.color = '#0ea5e9';
        link.style.textDecoration = 'underline';
        link.textContent = linkText?.trim() || selectedText || linkUrl;
        if (selectedText) {
          savedSelection.deleteContents();
        }
        savedSelection.insertNode(link);
        savedSelection.setStartAfter(link);
        savedSelection.collapse(true);
      }
    }
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
    setEditingLink(null);
  };

  const insertImage = () => {
    saveSelection();
    setShowImageModal(true);
  };

  const applyImage = async () => {
    let imageSrc = '';
    if (imageFile) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        imageSrc = base64;
      } catch (error) {
        console.error('Error reading image file:', error);
        return;
      }
    } else if (imageUrl) {
      imageSrc = imageUrl;
    } else {
      return;
    }
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '1rem 0';
    img.alt = 'Inserted image';
    if (savedSelection) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection.cloneRange());
      savedSelection.insertNode(img);
      savedSelection.setStartAfter(img);
      savedSelection.collapse(true);
    } else if (afterViewRef.current) {
      afterViewRef.current.appendChild(img);
    }
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
    setShowImageModal(false);
    setImageUrl('');
    setImageFile(null);
  };

  const handleContentClick = (e) => {
    if (e.target.tagName === 'IMG') {
      const src = e.target.src;
      const alt = e.target.alt || '';
      const imgIndex = Array.from(e.currentTarget.querySelectorAll('img')).indexOf(e.target);
      setImageAltModal({ show: true, src, currentAlt: alt, index: imgIndex });
      return;
    }
    
    let targetElement = e.target;
    while (targetElement && targetElement !== e.currentTarget) {
      if (targetElement.tagName === 'A') {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        e.stopPropagation();
        setEditingLink(targetElement);
        setLinkUrl(targetElement.href);
        setLinkText(targetElement.textContent || '');
        setShowLinkModal(true);
        return;
      }
      targetElement = targetElement.parentElement;
    }
  };

  const updateImageAlt = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedContent, 'text/html');
    const images = doc.querySelectorAll('img');
    if (images[imageAltModal.index]) {
      images[imageAltModal.index].setAttribute('alt', imageAltModal.currentAlt);
      const newContent = doc.body.innerHTML;
      setEditedContent(newContent);
      if (afterViewRef.current) {
        afterViewRef.current.innerHTML = newContent;
      }
    }
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 });
  };

  const deleteImage = () => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedContent, 'text/html');
    const images = doc.querySelectorAll('img');
    if (images[imageAltModal.index]) {
      const imageElement = images[imageAltModal.index];
      const figure = imageElement.closest('figure');
      if (figure) {
        figure.remove();
      } else {
        imageElement.remove();
      }
      const newContent = doc.body.innerHTML;
      setEditedContent(newContent);
      if (afterViewRef.current) {
        afterViewRef.current.innerHTML = newContent;
      }
    }
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 });
  };

  const copyHTMLToClipboard = () => {
    const sanitizedHTML = sanitizeListHTML(editedContent);
    navigator.clipboard.writeText(sanitizedHTML).then(() => {
      setStatus({ 
        type: 'success', 
        message: '✅ HTML copied to clipboard! You can now use it in your n8n workflow.' 
      });
      setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      setStatus({ 
        type: 'error', 
        message: '❌ Failed to copy HTML. Please try again.' 
      });
    });
  };

  // GSC helpers
  const getGscKeywordsForBlog = (blog) => {
    if (!gscData || !gscData.data) return null;
    const slug = blog.fieldData.slug || (blog.fieldData.name && blog.fieldData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    const pageData = gscData.data[slug];
    if (!pageData) return null;
    return {
      hasTraffic: true,
      clicks: pageData.clicks,
      impressions: pageData.impressions,
      position: pageData.position,
      ctr: pageData.ctr,
      url: pageData.url,
      keywords: pageData.keywords || [],
      hasKeywords: pageData.hasKeywords || false
    };
  };

  const handleGscUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setGscUploading(true);
    setStatus({ type: 'info', message: 'Processing GSC data...' });
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (typeof XLSX === 'undefined') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const queriesSheet = workbook.SheetNames.find(name => name.toLowerCase().includes('quer'));
        const pagesSheet = workbook.SheetNames.find(name => name.toLowerCase().includes('page'));
        if (!queriesSheet || !pagesSheet) throw new Error('Could not find Queries or Pages sheet');
        const queriesData = XLSX.utils.sheet_to_json(workbook.Sheets[queriesSheet]);
        const pagesData = XLSX.utils.sheet_to_json(workbook.Sheets[pagesSheet]);
        const gscByUrl = {};
        let totalMatches = 0;

        const allQueries = queriesData.map(row => ({
          query: (row['Top queries'] || row['Query'] || row['Queries'] || '').toLowerCase(),
          clicks: parseFloat(row['Clicks'] || 0),
          impressions: parseFloat(row['Impressions'] || 0),
          ctr: parseFloat(row['CTR'] || 0) * 100,
          position: parseFloat(row['Position'] || 0)
        })).filter(q => q.query);

        for (const row of pagesData) {
          const pageUrl = row['Top pages'] || row['Page'] || row['Pages'] || '';
          if (!pageUrl || !pageUrl.includes('/blogs/')) continue;
          let slug = '';
          try {
            const url = new URL(pageUrl);
            const parts = url.pathname.split('/').filter(p => p);
            slug = parts[parts.length - 1];
          } catch (e) {
            continue;
          }
          if (!slug) continue;

          const slugWords = slug.replace(/-/g, ' ').toLowerCase();
          const matchedKeywords = [];

          for (const query of allQueries) {
            let score = 0;
            const queryWords = query.query.split(' ');
            for (const word of queryWords) {
              if (word.length > 3 && slugWords.includes(word)) score += 2;
            }
            if (slugWords.includes(query.query) || query.query.includes(slug.replace(/-/g, ' '))) {
              score += 5;
            }
            if (score >= 4) {
              matchedKeywords.push({ ...query, matchScore: score });
            }
          }

          matchedKeywords.sort((a, b) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            return a.position - b.position;
          });

          const topKeywords = matchedKeywords.slice(0, 10);
          if (topKeywords.length > 0) {
            gscByUrl[slug] = {
              url: pageUrl,
              clicks: parseFloat(row['Clicks'] || 0),
              impressions: parseFloat(row['Impressions'] || 0),
              ctr: parseFloat(row['CTR'] || 0) * 100,
              position: parseFloat(row['Position'] || 0),
              keywords: topKeywords,
              hasKeywords: true
            };
            totalMatches++;
          }
        }

        if (totalMatches === 0) throw new Error('No keyword matches found');

        const gscDataObj = {
          data: gscByUrl,
          uploadedAt: new Date().toISOString(),
          totalMatches,
          blogsCount: Object.keys(gscByUrl).length,
          type: 'xlsx-matched'
        };

        localStorage.setItem('contentops_gsc_data', JSON.stringify(gscDataObj));
        setGscData(gscDataObj);
        setStatus({ type: 'success', message: `✅ Matched keywords to ${totalMatches} blogs!` });

        setTimeout(() => {
          setStatus({ type: '', message: '' });
          setShowGscModal(false);
        }, 2000);
      } catch (error) {
        setStatus({ type: 'error', message: 'Failed: ' + error.message });
      } finally {
        setGscUploading(false);
      }
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Failed to read XLSX file.' });
      setGscUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const testWebflowConnection = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Testing Webflow connection...' });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(
        `${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&limit=1&offset=0`,
        {
          headers: {
            'Authorization': `Bearer ${config.webflowKey}`,
            'accept': 'application/json'
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Webflow API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
      const data = await response.json();
      setStatus({
        type: 'success',
        message: `✅ Connection successful! Test returned ${data.items?.length || 0} blog (Webflow API working).`
      });
      setTimeout(() => fetchBlogs(), 1000);
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus({ 
          type: 'error', 
          message: '❌ Connection test timed out after 15s. Webflow API is not responding. Check: 1) Token valid? 2) Collection ID correct? 3) Webflow status page?' 
        });
      } else {
        setStatus({ 
          type: 'error', 
          message: `❌ Connection failed: ${error.message}. Check your Webflow token and Collection ID.` 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogsQuick = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: '⚡ Quick loading recent blogs...' });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(
        `${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&limit=10&offset=0`,
        {
          headers: {
            'Authorization': `Bearer ${config.webflowKey}`,
            'accept': 'application/json'
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data = await response.json();
      const items = data.items || [];
      const uniqueItems = [];
      const seenIds = new Set();
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueItems.push(item);
        }
      }
      setBlogs(uniqueItems);
      setBlogCache(uniqueItems);
      setCacheTimestamp(Date.now());
      setStatus({
        type: 'success',
        message: `⚡ Quick loaded ${uniqueItems.length} recent blogs`
      });
      setView('dashboard');
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus({ 
          type: 'error', 
          message: 'Quick load timed out. Webflow API is very slow - try again or check Webflow status.' 
        });
      } else {
        setStatus({ type: 'error', message: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = () => {
    if (!config.anthropicKey || !config.braveKey || !config.webflowKey || !config.collectionId) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }
    localStorage.setItem('contentops_config', JSON.stringify(config));
    setSavedConfig(config);
    setStatus({ type: 'success', message: 'Configuration saved!' });
    testWebflowConnection();
  };

  const fetchBlogs = async (forceRefresh = false) => {
    const cacheAge = cacheTimestamp ? Date.now() - cacheTimestamp : Infinity;
    const CACHE_DURATION = 10 * 60 * 1000;
    if (!forceRefresh && blogCache && cacheAge < CACHE_DURATION) {
      setBlogs(blogCache);
      const minutesAgo = Math.round(cacheAge / 60000);
      setStatus({ 
        type: 'success', 
        message: `${blogCache.length} blogs (cached ${minutesAgo}m ago)` 
      });
      setView('dashboard');
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Fetching blogs... This may take 1-2 minutes.' });

    try {
      let allItems = [];
      const limit = 100;
      let offset = 0;
      let hasMore = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      while (hasMore) {
        setStatus({ 
          type: 'info', 
          message: `Fetching blogs... ${allItems.length} unique blogs loaded${offset > 0 ? ', loading more...' : ''}` 
        });

        const response = await fetch(
          `${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&limit=${limit}&offset=${offset}`,
          {
            headers: {
              'Authorization': `Bearer ${config.webflowKey}`,
              'accept': 'application/json'
            },
            signal: controller.signal
          }
        );

        if (!response.ok) {
          clearTimeout(timeoutId);
          throw new Error(`Failed at offset ${offset}: ${response.status}`);
        }

        const data = await response.json();
        const items = data.items || [];
        const cacheHit = response.headers.get('X-Cache') === 'HIT';

        if (cacheHit && offset === 0) {
          allItems = items;
          hasMore = false;
          const uniqueItems = [];
          const seenIds = new Set();
          for (const item of allItems) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              uniqueItems.push(item);
            }
          }
          allItems = uniqueItems;
          setBlogs([...allItems]);
          break;
        }

        const uniqueNewItems = items.filter(item => !allItems.some(existing => existing.id === item.id));
        allItems.push(...uniqueNewItems);
        setBlogs([...allItems]);

        if (items.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      clearTimeout(timeoutId);

      const finalUniqueItems = [];
      const finalSeenIds = new Set();
      for (const item of allItems) {
        if (!finalSeenIds.has(item.id)) {
          finalSeenIds.add(item.id);
          finalUniqueItems.push(item);
        }
      }

      const duplicatesRemoved = allItems.length - finalUniqueItems.length;
      setBlogs(finalUniqueItems);
      setBlogCache(finalUniqueItems);
      setCacheTimestamp(Date.now());
      setStatus({
        type: 'success',
        message: `✅ Loaded ${finalUniqueItems.length} unique blogs${duplicatesRemoved > 0 ? ` (removed ${duplicatesRemoved} duplicates)` : ''}`
      });
      setView('dashboard');
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus({ 
          type: 'error', 
          message: 'Request timed out after 3 minutes. Webflow may be slow - try again in a moment.' 
        });
      } else {
        setStatus({ type: 'error', message: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const analyzeBlog = async (blog) => {
    setSelectedBlog(blog);
    setLoading(true);

    const gscInfo = getGscKeywordsForBlog(blog);
    const hasGscKeywords = gscInfo && gscInfo.hasKeywords && gscInfo.keywords.length > 0;

    const blogTitle = blog.fieldData.name;
    setBlogTitle(blogTitle);

    const fieldChecks = [
      'excerpt',
      'post-summary', 
      'summary',
      'meta-description',
      'description',
      'seo-description'
    ];
    
    let metaDescriptionValue = '';
    let detectedFieldName = 'post-summary';
    
    for (const fieldName of fieldChecks) {
      if (blog.fieldData[fieldName]) {
        metaDescriptionValue = blog.fieldData[fieldName];
        detectedFieldName = fieldName;
        break;
      }
    }
    
    setMetaDescription(metaDescriptionValue);
    setMetaFieldName(detectedFieldName);

    const blogType = detectBlogType(blogTitle);
    let selectedResearchPrompt;
    if (blogType === 'BOFU') {
      selectedResearchPrompt = BOFU_RESEARCH_PROMPT;
    } else if (blogType === 'TOFU') {
      selectedResearchPrompt = TOFU_RESEARCH_PROMPT;
    } else {
      selectedResearchPrompt = MOFU_RESEARCH_PROMPT;
    }

    if (hasGscKeywords) {
      setStatus({ 
        type: 'info', 
        message: `🎯 Optimizing with ${gscInfo.keywords.length} GSC keywords + web search...` 
      });
    } else {
      setStatus({ type: 'info', message: 'Smart analysis in progress (15-20s)...' });
    }

    const fullOriginalContent = blog.fieldData['post-body'] || '';

    try {
      const gscKeywordStrings = hasGscKeywords ? gscInfo.keywords.map(k => k.query) : null;
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogContent: fullOriginalContent,
          title: blogTitle,
          anthropicKey: config.anthropicKey,
          braveKey: config.braveKey,
          researchPrompt: selectedResearchPrompt,
          writingPrompt: WRITING_PROMPT,
          gscKeywords: gscKeywordStrings,
          gscPosition: gscInfo ? gscInfo.position : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      let updatedContent = data.content || fullOriginalContent;
      updatedContent = updatedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

      const highlighted = createHighlightedHTML(fullOriginalContent, updatedContent);
      setHighlightedData(highlighted);

      setResult({
        changes: data.changes || [],
        searchesUsed: data.searchesUsed || 0,
        claudeCalls: data.claudeCalls || 0,
        sectionsUpdated: data.sectionsUpdated || 0,
        content: updatedContent,
        originalContent: fullOriginalContent,
        duration: data.duration || 0,
        blogType: blogType,
        gscOptimized: data.gscOptimized || false,
        gscKeywordsUsed: hasGscKeywords ? gscInfo.keywords : null
      });

      setEditedContent(updatedContent);
      setShowHighlights(true);

      const successMsg = hasGscKeywords 
        ? `✅ Optimized with ${gscInfo.keywords.length} keywords + web search!`
        : '✅ Analysis complete!';

      setStatus({ type: 'success', message: successMsg });
      setView('review');
      setViewMode('changes');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Fix malformed lists before publishing
  const sanitizeListHTML = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;

    const orphanedListItems = Array.from(container.querySelectorAll('li')).filter(li => {
      const parent = li.parentElement;
      return parent && parent.tagName !== 'UL' && parent.tagName !== 'OL';
    });

    if (orphanedListItems.length > 0) {
      const processedLis = new Set();
      orphanedListItems.forEach(li => {
        if (processedLis.has(li)) return;
        const group = [li];
        processedLis.add(li);
        let nextSibling = li.nextElementSibling;
        while (nextSibling && nextSibling.tagName === 'LI' && orphanedListItems.includes(nextSibling)) {
          group.push(nextSibling);
          processedLis.add(nextSibling);
          nextSibling = nextSibling.nextElementSibling;
        }
        if (group.length > 0) {
          const ul = document.createElement('ul');
          ul.setAttribute('role', 'list');
          const parent = li.parentElement;
          if (parent.tagName === 'P' && parent.children.length === 1 && parent.children[0] === li) {
            group.forEach(item => {
              item.setAttribute('role', 'listitem');
              ul.appendChild(item);
            });
            parent.replaceWith(ul);
          } else {
            parent.insertBefore(ul, li);
            group.forEach(item => {
              item.setAttribute('role', 'listitem');
              ul.appendChild(item);
            });
          }
        }
      });
    }

    const paragraphs = container.querySelectorAll('p');
    paragraphs.forEach(p => {
      const children = Array.from(p.children);
      const allLi = children.length > 0 && children.every(child => child.tagName === 'LI');
      if (allLi) {
        const ul = document.createElement('ul');
        ul.setAttribute('role', 'list');
        children.forEach(li => {
          li.setAttribute('role', 'listitem');
          ul.appendChild(li);
        });
        p.replaceWith(ul);
      }
    });

    return container.innerHTML;
  };

  const publishToWebflow = async () => {
    if (!result || !selectedBlog) return;
    if (!blogTitle.trim()) {
      setStatus({ type: 'error', message: 'Title cannot be empty' });
      return;
    }
    if (!editedContent.trim()) {
      setStatus({ type: 'error', message: 'Content cannot be empty' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Publishing to Webflow...' });
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        if (attempt > 1) {
          setStatus({ type: 'info', message: `Retrying... (Attempt ${attempt}/${maxRetries})` });
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const sanitizedContent = sanitizeListHTML(editedContent);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const fieldData = {
          name: blogTitle.trim(),
          'post-body': sanitizedContent
        };
        if (metaDescription.trim()) {
          fieldData[metaFieldName] = metaDescription.trim();
        }

        const response = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&itemId=${selectedBlog.id}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${config.webflowKey}`, 
            'Content-Type': 'application/json', 
            'accept': 'application/json' 
          },
          body: JSON.stringify({ fieldData }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        setStatus({ type: 'success', message: '✅ Published successfully!' });
        setView('success');
        setLoading(false);
        return;
      } catch (error) {
        if (error.name === 'AbortError') {
          if (attempt === maxRetries) {
            setStatus({ 
              type: 'error', 
              message: 'Request timed out. Webflow may be slow - your content might be too large or Webflow is responding slowly.' 
            });
            setLoading(false);
            return;
          }
          continue;
        }
        if (attempt === maxRetries) {
          const errorMessage = error.message || 'Unknown error occurred';
          setStatus({ 
            type: 'error', 
            message: `Failed to publish after ${maxRetries} attempts: ${errorMessage}` 
          });
          setLoading(false);
          return;
        }
        continue;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0f172a] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-10 h-10 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">ContentOps</span>
            </div>
            <div className="flex items-center gap-4">
              {savedConfig && (
                <>
                  <button onClick={() => setView('dashboard')} className="text-gray-300 hover:text-white font-medium">Dashboard</button>
                  <button onClick={() => setView('setup')} className="text-gray-300 hover:text-white"><Settings className="w-5 h-5" /></button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {view === 'home' && (
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="inline-block px-4 py-2 bg-[#0ea5e9] bg-opacity-10 rounded-full border border-[#0ea5e9] border-opacity-30 mb-6">
                <span className="text-[#0ea5e9] text-sm font-semibold">Powered by Brave Search + Claude AI + GSC</span>
              </div>
              <h1 className="text-6xl font-bold text-[#0f172a] mb-4">Smart Content<br /><span className="text-[#0ea5e9]">Fact-Checking</span></h1>
              <p className="text-xl text-gray-600">Brave Search • AI-powered rewrites • GSC Keywords • Full blog diff view</p>
            </div>
            <button onClick={() => setView(savedConfig ? 'dashboard' : 'setup')} className="bg-[#0ea5e9] text-white px-10 py-4 rounded-lg text-lg font-bold hover:bg-[#0284c7] shadow-lg">
              {savedConfig ? 'Go to Dashboard →' : 'Get Started →'}
            </button>
          </div>
        )}

        {view === 'setup' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-8 border shadow-lg">
              <h2 className="text-3xl font-bold text-[#0f172a] mb-6">Configuration</h2>
              <div className="space-y-4">
                <div><label className="block text-sm font-semibold mb-2">Claude API Key</label><input type="password" value={config.anthropicKey} onChange={(e) => setConfig({...config, anthropicKey: e.target.value})} placeholder="sk-ant-..." className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" /></div>
                <div><label className="block text-sm font-semibold mb-2">Brave Search API Key</label><input type="password" value={config.braveKey} onChange={(e) => setConfig({...config, braveKey: e.target.value})} placeholder="BSA..." className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" /></div>
                <div><label className="block text-sm font-semibold mb-2">Webflow API Token</label><input type="password" value={config.webflowKey} onChange={(e) => setConfig({...config, webflowKey: e.target.value})} placeholder="Token" className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" /></div>
                <div><label className="block text-sm font-semibold mb-2">Collection ID</label><input type="text" value={config.collectionId} onChange={(e) => setConfig({...config, collectionId: e.target.value})} placeholder="From Webflow CMS" className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" /></div>
                <button onClick={saveConfig} disabled={loading} className="w-full bg-[#0ea5e9] text-white py-3 rounded-lg font-semibold hover:bg-[#0284c7] disabled:opacity-50">{loading ? 'Saving...' : 'Save & Continue'}</button>
              </div>
              {status.message && <div className={`mt-4 p-4 rounded-lg ${status.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}><p className="text-sm">{status.message}</p></div>}
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-[#0f172a]">Your Blog Posts</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowGscModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  {gscData ? `GSC: ${gscData.blogsCount || gscData.totalMatches} blogs` : 'Upload GSC Data'}
                </button>
                <button onClick={testWebflowConnection} disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 text-sm">
                  <Zap className="w-4 h-4" />
                  Test Connection
                </button>
                <button onClick={fetchBlogsQuick} disabled={loading} className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600 text-sm">
                  ⚡ Quick Load (10)
                </button>
                <button onClick={() => fetchBlogs(true)} disabled={loading} className="bg-white text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 border hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Load All</span>
                  {cacheTimestamp && !loading && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({Math.round((Date.now() - cacheTimestamp) / 60000)}m ago)
                    </span>
                  )}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12"><Loader className="w-12 h-12 text-[#0ea5e9] animate-spin mx-auto mb-4" /><p className="text-gray-600">Loading...</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map(blog => {
                  const gscInfo = getGscKeywordsForBlog(blog);
                  return (
                    <div key={blog.id} className="bg-white rounded-xl p-6 border shadow-sm hover:shadow-md transition-all">
                      <h3 className="font-semibold text-[#0f172a] mb-2 line-clamp-2">{blog.fieldData.name}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{blog.fieldData['post-summary'] || 'No description'}</p>
                      {gscInfo && (
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs bg-purple-50 border border-purple-200 rounded px-3 py-2">
                            <TrendingUp className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-700 font-semibold">
                              {Math.round(gscInfo.clicks)} clicks • Pos {gscInfo.position.toFixed(1)}
                            </span>
                          </div>
                          {gscInfo.hasKeywords && gscInfo.keywords.length > 0 && (
                            <div className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                              <span className="font-semibold text-gray-700">🎯 Keywords: </span>
                              {gscInfo.keywords.slice(0, 3).map(k => k.query).join(', ')}
                              {gscInfo.keywords.length > 3 && ` +${gscInfo.keywords.length - 3} more`}
                            </div>
                          )}
                        </div>
                      )}
                      <button onClick={() => analyzeBlog(blog)} disabled={loading} className="w-full bg-[#0ea5e9] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0284c7] disabled:opacity-50">{loading && selectedBlog?.id === blog.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '⚡ Smart Check'}</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'review' && result && (
          <div className="space-y-6">
            {result?.gscKeywordsUsed && result.gscKeywordsUsed.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-800 mb-2">
                      🎯 Optimized with {result.gscKeywordsUsed.length} GSC keywords
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.gscKeywordsUsed.slice(0, 8).map((kw, i) => (
                        <span key={i} className="text-xs bg-white px-3 py-1 rounded border border-purple-300 text-purple-700">
                          {kw.query}
                        </span>
                      ))}
                      {result.gscKeywordsUsed.length > 8 && (
                        <span className="text-xs text-purple-600 px-2 py-1">
                          +{result.gscKeywordsUsed.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* (rest of review + publish UI unchanged from file 2) */}
          </div>
        )}

        {view === 'success' && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-12 h-12 text-green-600" /></div>
            <h2 className="text-3xl font-bold text-[#0f172a] mb-2">Published!</h2>
            <p className="text-gray-600 mb-8">Content updated on Webflow</p>
            <button onClick={() => { setView('dashboard'); setResult(null); setSelectedBlog(null); }} className="bg-[#0ea5e9] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#0284c7] shadow-lg">← Back</button>
          </div>
        )}
      </div>

      {/* GSC Upload Modal */}
      {showGscModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setShowGscModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">📊 Upload GSC Data</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your XLSX file exported from Google Search Console (must include both Queries and Pages sheets).
            </p>
            {status.message && status.type !== 'success' && (
              <div className={`p-3 rounded-lg mb-4 ${status.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                {status.message}
              </div>
            )}
            {gscData && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800 font-semibold">
                  ✅ {gscData.totalMatches || gscData.blogsCount} blogs with keywords
                </p>
              </div>
            )}
            <input type="file" accept=".xlsx,.xls" onChange={handleGscUpload} disabled={gscUploading} className="w-full bg-gray-50 border rounded px-4 py-3 mb-4 text-sm" />
            <div className="flex gap-3">
              <button onClick={() => setShowGscModal(false)} className="flex-1 bg-gray-100 py-3 rounded font-semibold hover:bg-gray-200">
                {gscData ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#0f172a] text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold">ContentOps</div>
                <div className="text-gray-400 text-xs">by SalesRobot</div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm">© 2025 ContentOps. All rights reserved.</p>
              <p className="text-gray-500 text-xs mt-1">Powered by Brave Search + Claude AI + GSC</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
