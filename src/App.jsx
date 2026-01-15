import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, CheckCircle, AlertCircle, Loader, Sparkles } from 'lucide-react';

const BACKEND_URL = 'https://test-backend-production-f29b.up.railway.app';

const IMPROVED_PROMPT = `You are an expert blog fact-checker and editor specializing in B2B SaaS content.

=== FUNNEL-AWARE EDITING ===
Identify the blog's funnel stage (TOFU/MOFU/BOFU) and edit accordingly:

**TOFU (Awareness)**: Educational, broad topics
- Keep high-level explanations, industry context
- Update generic statistics and trend data
- Don't over-promote specific products

**MOFU (Consideration)**: Comparisons, "best tools" lists
- Keep balanced comparisons and use cases
- Update pricing, features, user counts precisely
- Help readers evaluate options fairly

**BOFU (Decision)**: Product-specific, implementation guides
- Keep conversion-focused language and CTAs
- Update exact pricing, current features
- Remove friction, provide concrete value

=== CRITICAL HTML PRESERVATION ===
- NEVER modify HTML tags, attributes, or structure
- ONLY update TEXT CONTENT between tags
- Preserve ALL links, images, classes, IDs
- Keep exact nesting and formatting

=== FACT-CHECKING ===
- Update pricing to 2025 current rates
- Fix user counts (e.g., "4200+ users" for SalesRobot)
- LinkedIn limits: 75 connection requests/day (NOT 100/week)
- Match official product terminology

=== GRAMMAR ===
- Remove: em-dashes, transform, delve, unleash, revolutionize, meticulous, realm, bespoke, autopilot, magic
- Split 30+ word sentences
- Use contractions and active voice

=== OUTPUT ===
Return ONLY complete HTML (no markdown blocks, no explanations, no truncation)`;

export default function ContentOps() {
  const [view, setView] = useState('home');
  const [config, setConfig] = useState({ anthropicKey: '', braveKey: '', webflowKey: '', collectionId: '' });
  const [savedConfig, setSavedConfig] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [result, setResult] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [viewMode, setViewMode] = useState('side-by-side');
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('contentops_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedConfig(parsed);
      setConfig(parsed);
    }
  }, []);

  const saveConfig = () => {
    if (!config.anthropicKey || !config.braveKey || !config.webflowKey || !config.collectionId) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }
    localStorage.setItem('contentops_config', JSON.stringify(config));
    setSavedConfig(config);
    setStatus({ type: 'success', message: 'Saved!' });
    fetchBlogs();
  };

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}`, {
        headers: { 'Authorization': `Bearer ${config.webflowKey}`, 'accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch blogs');
      const data = await response.json();
      setBlogs(data.items || []);
      setStatus({ type: 'success', message: `Found ${data.items?.length || 0} blogs` });
      setView('dashboard');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const analyzeBlog = async (blog) => {
    setSelectedBlog(blog);
    setLoading(true);
    setStatus({ type: 'info', message: 'Analyzing... (15-20s)' });
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogContent: blog.fieldData['post-body'] || '',
          title: blog.fieldData.name,
          anthropicKey: config.anthropicKey,
          braveKey: config.braveKey,
          writingPrompt: IMPROVED_PROMPT
        })
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setResult({
        changes: data.changes || [],
        searchesUsed: data.searchesUsed || 0,
        claudeCalls: data.claudeCalls || 0,
        content: data.content || blog.fieldData['post-body'],
        originalContent: blog.fieldData['post-body'] || '',
        duration: data.duration || 0,
        htmlTagsOriginal: data.htmlTagsOriginal,
        htmlTagsUpdated: data.htmlTagsUpdated
      });
      setEditedContent(data.content || blog.fieldData['post-body']);
      setStatus({ type: 'success', message: `Done! ${data.searchesUsed} searches, ${(data.duration/1000).toFixed(1)}s` });
      setView('review');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const publishToWebflow = async () => {
    if (!result || !selectedBlog) return;
    setLoading(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&itemId=${selectedBlog.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${config.webflowKey}`, 'Content-Type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({
          fieldData: {
            name: selectedBlog.fieldData.name,
            'post-body': editedContent,
            'post-summary': selectedBlog.fieldData['post-summary']
          }
        })
      });
      
      if (!response.ok) throw new Error('Publish failed');
      setStatus({ type: 'success', message: '✅ Published!' });
      setView('success');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Simple text extraction from HTML (strips tags)
  const stripHTML = (html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Find text differences - only actual changed words
  const getTextDifferences = () => {
    if (!result) return { added: [], removed: [] };
    
    const originalText = stripHTML(result.originalContent).toLowerCase();
    const updatedText = stripHTML(editedContent).toLowerCase();
    
    // Split into words
    const originalWords = originalText.split(/\s+/).filter(w => w.length > 2);
    const updatedWords = updatedText.split(/\s+/).filter(w => w.length > 2);
    
    // Find words that changed
    const originalSet = new Set(originalWords);
    const updatedSet = new Set(updatedWords);
    
    const added = [...updatedSet].filter(w => !originalSet.has(w));
    const removed = [...originalSet].filter(w => !updatedSet.has(w));
    
    return { 
      added: added.slice(0, 20), // Top 20 changes
      removed: removed.slice(0, 20) 
    };
  };

  const differences = result ? getTextDifferences() : { added: [], removed: [] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <nav className="bg-black bg-opacity-30 backdrop-blur-xl border-b border-white border-opacity-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <Sparkles className="w-8 h-8 text-pink-400" />
              <span className="text-2xl font-bold text-white">ContentOps</span>
            </div>
            {savedConfig && (
              <button onClick={() => setView('setup')} className="text-pink-300 hover:text-pink-200">
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {view === 'home' && (
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4">Funnel-Aware Fact-Checker</h1>
            <p className="text-xl text-purple-200 mb-8">Brave Search + Claude AI + HTML Preservation</p>
            <button onClick={() => setView(savedConfig ? 'dashboard' : 'setup')} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold">
              {savedConfig ? 'Dashboard →' : 'Setup →'}
            </button>
          </div>
        )}

        {view === 'setup' && (
          <div className="max-w-xl mx-auto bg-white bg-opacity-10 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Configuration</h2>
            <div className="space-y-4">
              <input type="password" value={config.anthropicKey} onChange={(e) => setConfig({...config, anthropicKey: e.target.value})} placeholder="Claude API Key" className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-purple-300" />
              <input type="password" value={config.braveKey} onChange={(e) => setConfig({...config, braveKey: e.target.value})} placeholder="Brave API Key" className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-purple-300" />
              <input type="password" value={config.webflowKey} onChange={(e) => setConfig({...config, webflowKey: e.target.value})} placeholder="Webflow API Token" className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-purple-300" />
              <input type="text" value={config.collectionId} onChange={(e) => setConfig({...config, collectionId: e.target.value})} placeholder="Collection ID" className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-purple-300" />
              <button onClick={saveConfig} disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold">
                {loading ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">Your Blogs</h2>
              <button onClick={fetchBlogs} disabled={loading} className="text-pink-300 hover:text-pink-200">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map(blog => (
                  <div key={blog.id} className="bg-white bg-opacity-10 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-2">{blog.fieldData.name}</h3>
                    <button onClick={() => analyzeBlog(blog)} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg mt-4">
                      {loading && selectedBlog?.id === blog.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Check →'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {status.message && (
              <div className={`mt-6 p-4 rounded-lg ${status.type === 'error' ? 'bg-red-500 bg-opacity-20' : 'bg-green-500 bg-opacity-20'}`}>
                <p className="text-white">{status.message}</p>
              </div>
            )}
          </div>
        )}

        {view === 'review' && result && (
          <div className="space-y-6">
            <div className="bg-green-600 bg-opacity-30 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-2">Analysis Complete</h2>
              <p className="text-green-200">
                {result.searchesUsed} searches • {(result.duration/1000).toFixed(1)}s
                {result.htmlTagsOriginal && ` • HTML: ${result.htmlTagsOriginal} → ${result.htmlTagsUpdated} tags`}
              </p>
            </div>

            <div className="bg-white bg-opacity-10 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Changes Made:</h3>
              <ul className="space-y-2">
                {result.changes.map((change, i) => (
                  <li key={i} className="text-purple-100 flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* WORD-LEVEL CHANGES */}
            <div className="bg-white bg-opacity-10 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Text Changes:</h3>
              <div className="grid grid-cols-2 gap-6">
                {differences.removed.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-red-300 font-semibold text-sm">REMOVED</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {differences.removed.map((word, i) => (
                        <span key={i} className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-40 text-red-200 px-2 py-1 rounded text-sm">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {differences.added.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-green-300 font-semibold text-sm">ADDED</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {differences.added.map((word, i) => (
                        <span key={i} className="bg-green-500 bg-opacity-20 border border-green-500 border-opacity-40 text-green-200 px-2 py-1 rounded text-sm">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {differences.added.length === 0 && differences.removed.length === 0 && (
                <p className="text-purple-300 text-sm">No significant word changes detected (only formatting/grammar fixes)</p>
              )}
            </div>

            <div className="bg-white bg-opacity-10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Content Comparison:</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode('side-by-side')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      viewMode === 'side-by-side' 
                        ? 'bg-pink-600 text-white' 
                        : 'bg-white bg-opacity-10 text-purple-300'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button 
                    onClick={() => setViewMode('updated-only')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      viewMode === 'updated-only' 
                        ? 'bg-pink-600 text-white' 
                        : 'bg-white bg-opacity-10 text-purple-300'
                    }`}
                  >
                    Updated Only
                  </button>
                </div>
              </div>

              {viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-t-lg px-4 py-2">
                      <p className="text-yellow-200 text-sm font-semibold">ORIGINAL</p>
                    </div>
                    <div className="bg-white rounded-b-lg p-6 max-h-[600px] overflow-auto">
                      <div className="prose prose-sm max-w-none text-gray-800" style={{ fontSize: '14px' }} dangerouslySetInnerHTML={{ __html: result.originalContent }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-t-lg px-4 py-2">
                      <p className="text-green-200 text-sm font-semibold">UPDATED</p>
                    </div>
                    <div className="bg-white rounded-b-lg p-6 max-h-[600px] overflow-auto">
                      <div className="prose prose-sm max-w-none text-gray-800" style={{ fontSize: '14px' }} dangerouslySetInnerHTML={{ __html: editedContent }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-t-lg px-4 py-2">
                    <p className="text-green-200 text-sm font-semibold">UPDATED CONTENT</p>
                  </div>
                  <div className="bg-white rounded-b-lg p-6 max-h-[600px] overflow-auto">
                    <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: editedContent }} />
                  </div>
                </div>
              )}
              
              <p className="text-purple-300 text-sm mt-4">
                Original: {Math.round(result.originalContent.length/1000)}K chars • 
                Updated: {Math.round(editedContent.length/1000)}K chars
              </p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setView('dashboard')} className="flex-1 bg-white bg-opacity-10 text-white py-3 rounded-lg hover:bg-opacity-20">
                ← Back
              </button>
              <button onClick={publishToWebflow} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg disabled:opacity-50">
                {loading ? 'Publishing...' : 'Publish to Webflow →'}
              </button>
            </div>
          </div>
        )}

        {view === 'success' && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">Published!</h2>
            <button onClick={() => setView('dashboard')} className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-lg">
              ← Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
