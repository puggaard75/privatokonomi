import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { 
  Upload, 
  FileText, 
  Download, 
  RefreshCw, 
  MessageSquare, 
  X, 
  Send, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart
} from 'lucide-react';
import { cn } from './lib/utils';
import { Transaction, AnalysisResult, CategoryResult, TopStore } from './types';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title
);

const CAT_COLORS: Record<string, string> = {
  'Bolig': '#f59e0b',
  'Dagligvarer': '#22c55e',
  'Spisesteder & Café': '#f97316',
  'Transport': '#3b82f6',
  'Shopping': '#ec4899',
  'Vin & Delikatesser': '#a855f7',
  'MobilePay & Overførsler til personer': '#06b6d4',
  'Abonnementer & Medier': '#6366f1',
  'Sport & Fitness': '#10b981',
  'Sundhed': '#ef4444',
  'Andet': '#64748b',
};

const COLOR_PALETTE = ['#f59e0b', '#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#06b6d4', '#6366f1', '#10b981', '#ef4444', '#14b8a6', '#8b5cf6', '#e11d48', '#0ea5e9', '#84cc16', '#d946ef'];

const CATEGORIES_LIST = [
  'Bolig', 'Dagligvarer', 'Spisesteder & Café', 'Transport', 'Shopping',
  'Vin & Delikatesser', 'MobilePay & Overførsler til personer', 'Abonnementer & Medier',
  'Sport & Fitness', 'Sundhed', 'Andet',
] as const;

const CATEGORIES_STR = CATEGORIES_LIST.join(', ');

const BUILT_IN_RULES: [string, string][] = [
  ['REMA', 'Dagligvarer'], ['NETTO', 'Dagligvarer'], ['SUPERBRUGSEN', 'Dagligvarer'],
  ['KVICKLY', 'Dagligvarer'], ['ALDI', 'Dagligvarer'], ['LIDL', 'Dagligvarer'],
  ['MENY', 'Dagligvarer'], ['FAKTA', 'Dagligvarer'], ['IRMA', 'Dagligvarer'],
  ['BILKA', 'Dagligvarer'], ['COOP', 'Dagligvarer'],
  ['DSB', 'Transport'], ['ARRIVA', 'Transport'], ['SHELL', 'Transport'],
  ['CIRCLE K', 'Transport'], ['Q8', 'Transport'], ['OK BENZIN', 'Transport'],
  ['MOVIA', 'Transport'], ['FLIXBUS', 'Transport'], ['UBER', 'Transport'],
  ['TAXA', 'Transport'], ['PARKERING', 'Transport'],
  ['SPOTIFY', 'Abonnementer & Medier'], ['NETFLIX', 'Abonnementer & Medier'],
  ['HBO', 'Abonnementer & Medier'], ['DISNEY', 'Abonnementer & Medier'],
  ['APPLE.COM/BILL', 'Abonnementer & Medier'], ['VIAPLAY', 'Abonnementer & Medier'],
  ['TV2 PLAY', 'Abonnementer & Medier'], ['GOOGLE ONE', 'Abonnementer & Medier'],
  ['MCDONALDS', 'Spisesteder & Café'], ['MCDONALD', 'Spisesteder & Café'],
  ['BURGER KING', 'Spisesteder & Café'], ['BURGER BOOM', 'Spisesteder & Café'],
  ['STARBUCKS', 'Spisesteder & Café'], ['7-ELEVEN', 'Spisesteder & Café'],
  ['APOTEK', 'Sundhed'],
  ['FITNESS', 'Sport & Fitness'], ['GYM', 'Sport & Fitness'],
];

const loadLearnedRules = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem('oekonomi_learned_cats') || '{}'); }
  catch { return {}; }
};

const saveLearnedRules = (rules: Record<string, string>) =>
  localStorage.setItem('oekonomi_learned_cats', JSON.stringify(rules));

const classifyLocally = (description: string, learned: Record<string, string>): string | null => {
  if (learned[description]) return learned[description];
  const upper = description.toUpperCase();
  for (const [keyword, cat] of BUILT_IN_RULES) {
    if (upper.includes(keyword)) return cat;
  }
  return null;
};

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('oekonomi_apikey') || '');
  const [screen, setScreen] = useState<'upload' | 'loading' | 'dashboard'>('upload');
  const [loadingText, setLoadingText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'transactions' | 'advice'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categoryModal, setCategoryModal] = useState<string | null>(null);
  const [modalSort, setModalSort] = useState<'date' | 'amount' | 'store'>('amount');
  const [storeSort, setStoreSort] = useState<'amount' | 'count'>('amount');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [txSearch, setTxSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const donutRef = useRef<any>(null);

  useEffect(() => {
    if (apiKey) localStorage.setItem('oekonomi_apikey', apiKey);
  }, [apiKey]);

  useEffect(() => {
    const saved = localStorage.getItem('oekonomi_result');
    if (saved) {
      try {
        setResult(JSON.parse(saved));
        setScreen('dashboard');
      } catch {
        localStorage.removeItem('oekonomi_result');
      }
    }
  }, []);

  // Parsing & Analysis Logic
  const parseAmount = (s: string) => {
    if (!s) return 0;
    let v = s.trim().replace(/\s*[A-Z]{3}$/, '');
    if (v.includes(',') && v.includes('.')) {
      v = v.replace(/\./g, '').replace(',', '.');
    } else if (v.includes(',')) {
      v = v.replace(',', '.');
    }
    v = v.replace(/[^\d\-.]/g, '');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const parseDate = (s: string) => {
    if (!s) return '';
    s = s.trim();
    const dmy = s.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
    return s;
  };

  const isDateLike = (s: string) => {
    if (!s) return false;
    s = s.trim().replace(/^\uFEFF/, '');
    return /^\d{1,2}[-\/\.]\d{1,2}[-\/\.](\d{2}|\d{4})$/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSV(text, file.name);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const processCSV = async (text: string, fname: string) => {
    if (!apiKey) {
      setError('Indtast venligst din Anthropic API-nøgle.');
      return;
    }

    setScreen('loading');
    setLoadingText('Analyserer transaktioner...');

    try {
      // Basic CSV parsing
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
      const delim = [';', '\t', ','].find(d => lines[0].split(d).length >= 2) || ';';
      
      const splitLine = (line: string) => {
        const cells = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') inQ = !inQ;
          else if (ch === delim && !inQ) { cells.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
          else cur += ch;
        }
        cells.push(cur.trim().replace(/^"|"$/g, ''));
        return cells;
      };

      const rows = lines.map(splitLine);
      const hasHeader = !isDateLike(rows[0][0]);
      
      let normalized: Transaction[] = [];
      if (hasHeader) {
        const headers = rows[0].map(h => h.toLowerCase().trim());
        const dK = ['dato', 'date', 'bookingdate', 'posteringsdato'];
        const tK = ['tekst', 'beskrivelse', 'description', 'text'];
        const aK = ['beløb', 'belob', 'amount'];
        
        const dk = headers.findIndex(h => dK.some(k => h.includes(k)));
        const tk = headers.findIndex(h => tK.some(k => h.includes(k)));
        const ak = headers.findIndex(h => aK.some(k => h.includes(k)));

        normalized = rows.slice(1).map(r => ({
          date: parseDate(r[dk]),
          description: r[tk],
          amount: parseAmount(r[ak])
        })).filter(r => r.date && r.description && r.amount !== 0);
      } else {
        normalized = rows.map(r => ({
          date: parseDate(r[0]),
          description: r[1],
          amount: parseAmount(r[2])
        })).filter(r => r.date && r.description && r.amount !== 0);
      }

      await analyzeWithAI(normalized, fname);
    } catch (err: any) {
      setError(err.message);
      setScreen('upload');
    }
  };

  const claudeFetch = async (prompt: string, maxTokens: number) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`AI Analyse fejlede: ${errorData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    const rawText = data.content[0].text;
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('AI returnerede ikke gyldig JSON-data. Prøv igen.');
    try {
      return JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));
    } catch {
      throw new Error('Kunne ikke læse data fra AI. Svaret var formateret forkert.');
    }
  };

  const analyzeWithAI = async (transactions: Transaction[], fname: string) => {
    setLoadingText('Analyserer mønstre med AI...');

    try {
      // Pre-kategoriser lokalt med kendte regler + tidligere lærte mappings
      const learnedRules = loadLearnedRules();
      const preCategorized: Record<number, string> = {};
      const needsAI: number[] = [];

      transactions.forEach((t, i) => {
        const cat = classifyLocally(t.description, learnedRules);
        if (cat) preCategorized[i] = cat;
        else needsAI.push(i);
      });

      const txLines = transactions.map((t, i) => `${i}|${t.date}|${t.description}|${Math.round(t.amount)}`).join('\n');

      const statsPrompt = `Analyser disse banktransaktioner og returner JSON med aggregerede data.
      Transaktioner:
      ${txLines}

      Brug disse kategorier (præcis stavning): ${CATEGORIES_STR}

      Returner KUN JSON i dette format (ingen txCategories):
      {
        "categories": [{"name": "Navn", "amount": 123}],
        "fixedExpenses": [{"name": "Navn", "amount": 123, "frequency": "Månedlig"}],
        "topStores": [{"name": "Navn", "amount": 123, "count": 5}],
        "advice": [{"text": "Råd", "category": "Kategori", "keywords": ["ord"]}],
        "summary": "Tekst",
        "monthlyTrend": [{"month": "2024-01", "income": 100, "expenses": 80}]
      }`;

      // Kun send ukendte transaktioner til AI
      const aiTxLines = needsAI
        .map(i => `${i}|${transactions[i].date}|${transactions[i].description}|${Math.round(transactions[i].amount)}`)
        .join('\n');

      const txCatPrompt = `Kategoriser disse banktransaktioner.
      Transaktioner:
      ${aiTxLines}

      Returner KUN JSON i dette format (brug de originale indeksnumre):
      {
        "txCategories": {"0": "Dagligvarer", "1": "Transport"}
      }

      Brug disse kategorier (præcis stavning): ${CATEGORIES_STR}`;

      // Start begge kald parallelt (spring txCat over hvis alt er kategoriseret lokalt)
      const statsPromise = claudeFetch(statsPrompt, 4000);
      const txCatPromise = needsAI.length > 0
        ? claudeFetch(txCatPrompt, 4000)
        : Promise.resolve({ txCategories: {} });

      // Vis dashboard så snart aggregerede data er klar
      const stats = await statsPromise;
      const initialResult: AnalysisResult = {
        ...stats,
        txCategories: preCategorized,
        _allTx: transactions,
        _fname: fname,
        _catColors: {}
      };
      stats.categories.forEach((c: any, i: number) => {
        initialResult._catColors[c.name] = COLOR_PALETTE[i % COLOR_PALETTE.length];
      });

      setResult(initialResult);
      setScreen('dashboard');
      setIsCategorizing(needsAI.length > 0);

      // Opdater med AI-kategorier og gem nye mappings til fremtidige analyser
      txCatPromise
        .then(txData => {
          const newLearned = { ...learnedRules };
          const combined = { ...preCategorized };

          for (const [idxStr, cat] of Object.entries(txData.txCategories || {})) {
            const i = Number(idxStr);
            combined[i] = cat as string;
            newLearned[transactions[i].description] = cat as string;
          }

          saveLearnedRules(newLearned);

          setResult(prev => {
            if (!prev) return prev;
            const updated = { ...prev, txCategories: combined };
            localStorage.setItem('oekonomi_result', JSON.stringify(updated));
            return updated;
          });
        })
        .catch(() => {
          setResult(prev => {
            if (!prev) return prev;
            localStorage.setItem('oekonomi_result', JSON.stringify(prev));
            return prev;
          });
        })
        .finally(() => setIsCategorizing(false));

    } catch (err: any) {
      setError(err.message);
      setScreen('upload');
    }
  };

  const fmtKr = (n: number) => Math.abs(Math.round(n)).toLocaleString('da-DK') + ' kr.';

  if (screen === 'upload') {
    return (
      <div className="max-w-xl mx-auto py-12 px-6 flex flex-col gap-6">
        <div className="text-2xl font-bold">Økonomi <span className="text-accent2">Dashboard</span></div>
        
        <div className="card flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Anthropic API-nøgle</label>
            <input 
              type="password" 
              className="w-full bg-bg3 border border-border2 rounded-r2 p-2 px-3 text-sm outline-none focus:border-accent"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <small className="text-[10px] text-muted2 mt-2 block">
              Din nøgle sendes direkte til Anthropic. Hent den på <a href="https://console.anthropic.com" target="_blank" className="text-accent2">console.anthropic.com</a>
            </small>
          </div>
        </div>

        <div 
          className="drop-zone p-12 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-4xl mb-4">📂</div>
          <h2 className="text-base font-medium mb-1">Træk dit kontoudtog hertil</h2>
          <p className="text-sm text-muted">eller klik for at vælge CSV-fil</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv,.txt" 
            onChange={handleFileUpload}
          />
        </div>

        {localStorage.getItem('oekonomi_result') && (
          <button
            className="tb-btn primary w-full py-3 flex items-center justify-center gap-2"
            onClick={() => {
              const saved = localStorage.getItem('oekonomi_result');
              if (saved) { try { setResult(JSON.parse(saved)); setScreen('dashboard'); } catch { localStorage.removeItem('oekonomi_result'); } }
            }}
          >
            <ChevronRight size={14} /> Fortsæt med seneste analyse
          </button>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-r2 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (screen === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-height-[80vh] gap-4">
        <div className="spinner" />
        <p className="text-muted">{loadingText}</p>
      </div>
    );
  }

  if (!result) return null;

  const income = result._allTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = Math.abs(result._allTx.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const balance = income - expenses;

  const dates = result._allTx.map(t => t.date).filter(Boolean).sort();
  const fmtDate = (iso: string) => {
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    const month = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][parseInt(m)-1];
    return `${parseInt(d)}. ${month ?? m} ${y}`;
  };
  const dateRange = dates.length >= 2 ? `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}` : null;

  const donutData = {
    labels: result.categories.map(c => c.name),
    datasets: [{
      data: result.categories.map(c => c.amount),
      backgroundColor: result.categories.map(c => result._catColors[c.name] || '#64748b'),
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold">Økonomi Dashboard</h1>
          <p className="text-xs text-muted mt-1">{result._fname}{dateRange && <span className="ml-2 text-muted2">· {dateRange}</span>}</p>
        </div>
        <div className="flex gap-2">
          <button className="tb-btn flex items-center gap-2" onClick={() => window.print()}>
            <Download size={14} /> PDF
          </button>
          <button className="tb-btn primary" onClick={() => { localStorage.removeItem('oekonomi_result'); setResult(null); setScreen('upload'); setActiveTab('overview'); setExpandedCategories(new Set()); setCategoryModal(null); setChatMessages([]); setIsChatOpen(false); }}>
            <RefreshCw size={14} /> Ny analyse
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="metric">
          <div className="text-[10px] text-muted uppercase mb-2">Indkomst</div>
          <div className="text-2xl font-bold text-green">{fmtKr(income)}</div>
        </div>
        <div className="metric">
          <div className="text-[10px] text-muted uppercase mb-2">Forbrug</div>
          <div className="text-2xl font-bold text-red">{fmtKr(expenses)}</div>
        </div>
        <div className="metric">
          <div className="text-[10px] text-muted uppercase mb-2">Balance</div>
          <div className={cn("text-2xl font-bold", balance >= 0 ? "text-green" : "text-red")}>
            {fmtKr(balance)}
          </div>
        </div>
        <div className="metric">
          <div className="text-[10px] text-muted uppercase mb-2">Opsparingsrate</div>
          <div className="text-2xl font-bold text-accent2">
            {income > 0 ? Math.round((balance / income) * 100) : 0}%
          </div>
        </div>
      </div>

      <div className="tab-bar mb-6">
        <button 
          className={cn("tab", activeTab === 'overview' && "active")}
          onClick={() => setActiveTab('overview')}
        >Oversigt</button>
        <button 
          className={cn("tab", activeTab === 'transactions' && "active")}
          onClick={() => setActiveTab('transactions')}
        >Transaktioner</button>
        <button 
          className={cn("tab", activeTab === 'advice' && "active")}
          onClick={() => setActiveTab('advice')}
        >AI-råd</button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <h3 className="text-sm font-bold mb-6">Kategorifordeling</h3>
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div
                className="w-48 h-48 cursor-pointer"
                onClick={(event) => {
                  if (!donutRef.current) return;
                  const elements = donutRef.current.getElementsAtEventForMode(
                    event.nativeEvent,
                    'nearest',
                    { intersect: true },
                    false
                  );
                  if (elements.length > 0) setCategoryModal(result.categories[elements[0].index].name);
                }}
              >
                <Doughnut
                  ref={donutRef}
                  data={donutData}
                  options={{ plugins: { legend: { display: false } } }}
                />
              </div>
              <div className="flex-1 w-full flex flex-col gap-2">
                {result.categories.map(c => (
                  <div
                    key={c.name}
                    className="flex items-center gap-3 text-xs cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
                    onClick={() => setCategoryModal(c.name)}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: result._catColors[c.name] }} />
                    <span className="flex-1 text-muted">{c.name}</span>
                    <span className="font-bold">{fmtKr(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Top Butikker</h3>
              <div className="flex gap-1">
                {(['amount', 'count'] as const).map(s => (
                  <button key={s} onClick={() => setStoreSort(s)}
                    className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                      storeSort === s ? "border-accent text-accent bg-accent/10" : "border-border text-muted")}>
                    {s === 'amount' ? 'Beløb' : 'Antal køb'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[...result.topStores]
                .sort((a, b) => storeSort === 'amount' ? b.amount - a.amount : b.count - a.count)
                .slice(0, 8)
                .map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="text-xs">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-muted2 text-[10px]">{s.count} køb</div>
                  </div>
                  <div className="text-xs font-bold text-red">{fmtKr(s.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && isCategorizing && (
        <div className="flex items-center gap-3 text-muted text-sm p-6 card">
          <div className="spinner" style={{ width: 16, height: 16 }} /> Kategoriserer posteringer...
        </div>
      )}

      {activeTab === 'transactions' && !isCategorizing && (() => {
        const searchLower = txSearch.toLowerCase();
        type GroupEntry = { transactions: (Transaction & { idx: number })[]; total: number };
        const grouped = result._allTx.reduce((acc, tx, i) => {
          if (searchLower && !tx.description.toLowerCase().includes(searchLower)) return acc;
          const cat = result.txCategories?.[i] || 'Andet';
          if (!acc[cat]) acc[cat] = { transactions: [], total: 0 };
          acc[cat].transactions.push({ ...tx, idx: i });
          acc[cat].total += tx.amount;
          return acc;
        }, {} as Record<string, GroupEntry>);

        const toggleCategory = (cat: string) => {
          setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
          });
        };

        const entries = (Object.entries(grouped) as [string, GroupEntry][])
          .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total));

        return (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Søg i posteringer..."
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                className="w-full bg-bg2 border border-border2 rounded-r2 px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-muted2"
              />
              {txSearch && (
                <button onClick={() => setTxSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                  <X size={14} />
                </button>
              )}
            </div>
            {entries.length === 0 && (
              <div className="text-sm text-muted text-center py-8">Ingen posteringer matcher "{txSearch}"</div>
            )}
            {entries.map(([cat, group]) => {
                const color = result._catColors[cat] || '#64748b';
                const isOpen = searchLower ? true : expandedCategories.has(cat);
                return (
                  <div key={cat} className="card p-0 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                      onClick={() => !searchLower && toggleCategory(cat)}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="flex-1 text-sm font-medium">{cat}</span>
                      <span className="text-xs text-muted">{group.transactions.length} posteringer</span>
                      <span className={cn("text-sm font-bold ml-4", group.total >= 0 ? "text-green" : "text-red")}>
                        {group.total >= 0 ? '+' : ''}{fmtKr(group.total)}
                      </span>
                      {!searchLower && <ChevronRight size={14} className={cn("text-muted transition-transform ml-2", isOpen && "rotate-90")} />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-border">
                        <table className="tx-table">
                          <tbody>
                            {group.transactions.map((t) => (
                              <tr key={t.idx}>
                                <td className="text-muted whitespace-nowrap">{t.date}</td>
                                <td>{t.description}</td>
                                <td className={cn("text-right font-bold", t.amount >= 0 ? "text-green" : "text-red")}>
                                  {t.amount >= 0 ? '+' : ''}{fmtKr(t.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })()}

      {activeTab === 'advice' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.advice.map((a, i) => (
              <div key={i} className="card flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed">{a.text}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="text-sm font-bold mb-4">Opsummering</h3>
            <p className="text-sm text-muted leading-relaxed">{result.summary}</p>
          </div>
        </div>
      )}

      {/* Kategori-modal */}
      {categoryModal && (() => {
        const color = result._catColors[categoryModal] || '#64748b';
        const catTx = result._allTx
          .map((t, i) => ({ ...t, idx: i }))
          .filter((_, i) => (result.txCategories?.[i] || 'Andet') === categoryModal && result._allTx[i].amount < 0);

        const sorted = [...catTx].sort((a, b) => {
          if (modalSort === 'date') return b.date.localeCompare(a.date);
          if (modalSort === 'amount') return a.amount - b.amount;
          return a.description.localeCompare(b.description);
        });

        const byStore = catTx.reduce((acc, t) => {
          acc[t.description] = (acc[t.description] || 0) + Math.abs(t.amount);
          return acc;
        }, {} as Record<string, number>);
        const topStores = (Object.entries(byStore) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const total = catTx.reduce((s, t) => s + t.amount, 0);

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setCategoryModal(null)}>
            <div className="bg-bg2 border border-border2 rounded-r shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <h2 className="font-bold flex-1">{categoryModal}</h2>
                <span className="text-sm font-bold text-red">{fmtKr(Math.abs(total))}</span>
                <button onClick={() => setCategoryModal(null)} className="ml-4 text-muted hover:text-text"><X size={16} /></button>
              </div>

              <div className="px-5 py-3 border-b border-border flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {topStores.map(([name, amt]) => (
                    <div key={name} className="text-[11px] px-2.5 py-1 rounded-full bg-bg3 border border-border flex gap-2">
                      <span className="text-muted">{name}</span>
                      <span className="font-bold">{fmtKr(amt as number)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-muted uppercase">Sortér:</span>
                  {(['amount', 'date', 'store'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setModalSort(s)}
                      className={cn("text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                        modalSort === s ? "border-accent text-accent bg-accent/10" : "border-border text-muted")}
                    >
                      {s === 'amount' ? 'Beløb' : s === 'date' ? 'Dato' : 'Butik'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                <table className="tx-table">
                  <thead><tr><th>Dato</th><th>Beskrivelse</th><th className="text-right">Beløb</th></tr></thead>
                  <tbody>
                    {sorted.map(t => (
                      <tr key={t.idx}>
                        <td className="text-muted whitespace-nowrap">{t.date}</td>
                        <td>{t.description}</td>
                        <td className="text-right font-bold text-red">{fmtKr(Math.abs(t.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI Chat FAB */}
      <button 
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        {isChatOpen ? <X color="white" /> : <MessageSquare color="white" />}
      </button>

      {isChatOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-bg2 border border-border2 rounded-r shadow-2xl flex flex-col z-50 overflow-hidden">
          <div className="p-3 border-b border-border flex justify-between items-center bg-bg3">
            <span className="text-xs font-bold">Økonomi Assistent</span>
            <button onClick={() => setIsChatOpen(false)}><X size={14} className="text-muted" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {chatMessages.length === 0 && (
              <div className="bg-bg3 p-3 rounded-lg text-xs text-muted italic">
                Hej! Spørg mig om dit forbrug, f.eks. "Hvor meget har jeg brugt på mad i denne måned?"
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={cn(
                "max-w-[85%] p-2 px-3 rounded-lg text-xs leading-relaxed",
                m.role === 'user' ? "bg-accent text-white self-end" : "bg-bg3 text-text self-start"
              )}>
                {m.text}
              </div>
            ))}
            {isThinking && <div className="text-[10px] text-muted italic">Tænker...</div>}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input 
              className="flex-1 bg-bg3 border border-border rounded-full px-3 py-1.5 text-xs outline-none focus:border-accent"
              placeholder="Skriv her..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            />
            <button 
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center"
              onClick={sendChatMessage}
            >
              <Send size={12} color="white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  async function sendChatMessage() {
    if (!chatInput.trim() || isThinking) return;
    const msg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsThinking(true);

    try {
      const prompt = `Du er en dansk økonomi-assistent. Her er data om brugerens økonomi:
      Indkomst: ${fmtKr(income)}
      Forbrug: ${fmtKr(expenses)}
      Kategorier: ${result?.categories.map(c => c.name + ': ' + fmtKr(c.amount)).join(', ')}
      
      Svar kort og præcist på dansk på dette spørgsmål: ${msg}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const reply = data.content[0].text;
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Beklager, jeg kunne ikke svare lige nu.' }]);
    } finally {
      setIsThinking(false);
    }
  }
}
