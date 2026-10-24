import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ArrowDownRight, ArrowUpRight, Award, BarChart3, Bell, BookOpen,
  BrainCircuit, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Coins,
  Crosshair, Flame, Gamepad2, LayoutDashboard, LogIn, LogOut, Menu, Plus,
  Search, Settings, Shield, Sparkles, Swords, Target, Timer, Trophy, User,
  Wallet, X, Zap
} from "lucide-react";
import { api } from "./api";

const initialQuests = [
  { _id: "demo-1", title: "Solve Two DSA Problems", description: "Practice arrays, hashing, and explain the complexity.", category: "Data Structures and Algorithms", priority: "High", difficulty: "Normal", status: "Accepted" },
  { _id: "demo-2", title: "Build a React Feature", description: "Ship one polished feature to a portfolio project.", category: "Project Development", priority: "Critical", difficulty: "Hard", status: "In Progress" },
  { _id: "demo-3", title: "Revise DBMS Fundamentals", description: "Review normalization, keys, and ACID properties.", category: "College Studies", priority: "Medium", difficulty: "Easy", status: "Available" }
];
const categories = ["Data Structures and Algorithms", "Programming", "College Studies", "Technical Courses", "Project Development", "Internship Preparation", "Placement Preparation", "Open Source Contributions", "Personal Development", "Custom Category"];
const navItems = [
  ["Goal Planner", Target], ["Dashboard", LayoutDashboard], ["Quest Board", Swords], ["Focus Session", Timer],
  ["Token Economy", Wallet], ["Statistics", BarChart3], ["Penalty Zone", Shield],
  ["Profile", User], ["Settings", Settings]
];
const levelNames = { 1: "Newbie Hunter", 2: "Awakened", 3: "Elite Hunter", 4: "Shadow Monarch", 5: "S-Rank Hunter" };
const cx = (...items) => items.filter(Boolean).join(" ");
const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

function App() {
  const [page, setPage] = useState("Goal Planner");
  const [mobileNav, setMobileNav] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [quests, setQuests] = useState(() => safeRead("hc-quests", initialQuests));
  const [tokens, setTokens] = useState(0);
  const [lifetimeTokens, setLifetimeTokens] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [notice, setNotice] = useState("");
  const [questModal, setQuestModal] = useState(false);
  const [questForm, setQuestForm] = useState({ title: "", description: "", category: categories[0], priority: "Medium", difficulty: "Normal" });
  const [filter, setFilter] = useState("All Quests");
  const [query, setQuery] = useState("");
  const [selectedQuest, setSelectedQuest] = useState("");
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(2400);
  const [sessionStatus, setSessionStatus] = useState("idle");
  const [sessionStart, setSessionStart] = useState(null);
  const [spendAmount, setSpendAmount] = useState(1);
  const [activity, setActivity] = useState("Gaming");
  const [gammaTopic, setGammaTopic] = useState("");
  const [gammaInstructions, setGammaInstructions] = useState("Create a clear, engaging presentation with a title, key concepts, examples, and a short recap.");
  const [gammaResult, setGammaResult] = useState(null);
  const [gammaBusy, setGammaBusy] = useState(false);
  const [gammaError, setGammaError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [goalPlan, setGoalPlan] = useState(null);
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [goalForm, setGoalForm] = useState({ goalType: "study", goal: "", startingPoint: "Beginner", targetDays: 30, minutesPerDay: 60, daysPerWeek: 5, constraints: "" });
  const intervalRef = useRef(null);

  const activeQuest = quests.find(q => q._id === selectedQuest) || quests.find(q => ["Accepted", "In Progress"].includes(q.status));
  const completedQuests = quests.filter(q => q.status === "Completed").length;
  const activeQuests = quests.filter(q => ["Accepted", "In Progress"].includes(q.status)).length;
  const dailyCap = [6, 7, 8, 9, 10][Math.min(level - 1, 4)] || 10;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });

  useEffect(() => { localStorage.setItem("hc-quests", JSON.stringify(quests)); }, [quests]);
  useEffect(() => {
    api("/auth/me").then(({ user: u }) => {
      setUser(u); setTokens(u.tokens); setLifetimeTokens(u.lifetimeTokens); setLevel(u.level); setTotalFocusMinutes(u.totalFocusMinutes); setProfileName(u.name);
      return Promise.all([api("/quests"), api("/economy"), api("/focus/current")]);
    }).then(([q, e, f]) => {
      setQuests(q.quests); setTransactions(e.transactions || []);
      if (f.session) {
        setSession(f.session);
        const elapsed = f.session.activeSeconds + (f.session.status === "running" ? Math.floor((Date.now() - new Date(f.session.lastResumedAt).getTime()) / 1000) : 0);
        setRemaining(Math.max(0, 2400 - elapsed)); setSessionStatus(f.session.status);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    api("/plans/latest").then(({ plan }) => {
      if (plan) {
        setGoalPlan(plan);
        setPage("Dashboard");
      }
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (sessionStatus !== "running") return;
    intervalRef.current = setInterval(() => {
      if (!sessionStart && !session?.lastResumedAt) return;
      const elapsed = session ? (session.activeSeconds || 0) + Math.floor((Date.now() - new Date(session.lastResumedAt || sessionStart).getTime()) / 1000) : Math.floor((Date.now() - sessionStart) / 1000);
      setRemaining(Math.max(0, 2400 - elapsed));
    }, 500);
    return () => clearInterval(intervalRef.current);
  }, [sessionStatus, session, sessionStart]);

  useEffect(() => { if (remaining === 0 && sessionStatus === "running") completeFocus(); }, [remaining, sessionStatus]);

  function flash(message) { setNotice(message); setTimeout(() => setNotice(""), 3500); }
  async function refreshUser() {
    if (!user) return;
    try {
      const [{ user: u }, e] = await Promise.all([api("/auth/me"), api("/economy")]);
      setUser(u); setTokens(u.tokens); setLifetimeTokens(u.lifetimeTokens); setLevel(u.level); setTotalFocusMinutes(u.totalFocusMinutes); setTransactions(e.transactions || []);
    } catch {}
  }

  async function submitAuth(e) {
    e.preventDefault();
    try {
      const result = await api(`/auth/${authMode}`, { method: "POST", body: JSON.stringify(authForm) });
      setUser(result.user); setTokens(result.user.tokens); setLifetimeTokens(result.user.lifetimeTokens); setLevel(result.user.level); setTotalFocusMinutes(result.user.totalFocusMinutes); setProfileName(result.user.name);
      setAuthOpen(false); setAuthForm({ name: "", email: "", password: "" });
      const [q, economy, savedPlan] = await Promise.all([api("/quests"), api("/economy"), api("/plans/latest").catch(() => ({ plan: null }))]);
      setQuests(q.quests); setTransactions(economy.transactions || []);
      if (savedPlan.plan) setGoalPlan(savedPlan.plan);
      setPage(savedPlan.plan ? "Dashboard" : "Goal Planner");
      flash(`Welcome back, ${result.user.name}. System online.`);
    } catch (err) { flash(err.message); }
  }

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch {}
    setUser(null); setTokens(0); setLevel(1); setLifetimeTokens(0); setTotalFocusMinutes(0); setQuests(initialQuests); setSession(null); setSessionStatus("idle"); flash("Logged out.");
  }

  async function createQuest(e) {
    e.preventDefault();
    if (!questForm.title.trim()) return;
    if (user) {
      try {
        const { quest } = await api("/quests", { method: "POST", body: JSON.stringify(questForm) });
        setQuests(prev => [quest, ...prev]);
      } catch (err) { flash(err.message); return; }
    } else {
      setQuests(prev => [{ ...questForm, _id: `demo-${Date.now()}`, status: "Available" }, ...prev]);
    }
    setQuestForm({ title: "", description: "", category: categories[0], priority: "Medium", difficulty: "Normal" });
    setQuestModal(false); flash("Quest added to your board.");
  }

  async function updateQuest(quest, status) {
    if (user && !String(quest._id).startsWith("demo-")) {
      try { const { quest: updated } = await api(`/quests/${quest._id}`, { method: "PATCH", body: JSON.stringify({ status }) }); setQuests(prev => prev.map(q => q._id === quest._id ? updated : q)); }
      catch (err) { flash(err.message); return; }
    } else setQuests(prev => prev.map(q => q._id === quest._id ? { ...q, status, completedAt: status === "Completed" ? new Date().toISOString() : null } : q));
    flash(status === "Completed" ? "Quest complete. Great work." : `Quest status: ${status}`);
  }

  async function deleteQuest(quest) {
    if (user && !String(quest._id).startsWith("demo-")) {
      try { await api(`/quests/${quest._id}`, { method: "DELETE" }); } catch (err) { flash(err.message); return; }
    }
    setQuests(prev => prev.filter(q => q._id !== quest._id)); flash("Quest archived from your board.");
  }

  async function startFocus() {
    if (!activeQuest && quests.length === 0) { flash("Create a quest first."); setPage("Quest Board"); return; }
    const quest = activeQuest || quests[0];
    if (user) {
      try {
        const { session: s } = await api("/focus/start", { method: "POST", body: JSON.stringify({ questId: String(quest._id).startsWith("demo-") ? null : quest._id }) });
        setSession(s); setRemaining(2400); setSessionStatus("running"); setSessionStart(new Date(s.lastResumedAt)); setSelectedQuest(quest._id);
      } catch (err) { flash(err.message); return; }
    } else {
      setSession({ _id: `demo-session-${Date.now()}`, questId: quest._id, activeSeconds: 0, lastResumedAt: new Date().toISOString() });
      setRemaining(2400); setSessionStatus("running"); setSessionStart(Date.now()); setSelectedQuest(quest._id);
    }
    setPage("Focus Session"); flash("Focus session started. Stay in the zone.");
  }

  async function pauseFocus() {
    if (user && session?._id && !String(session._id).startsWith("demo-")) {
      try { const { session: s } = await api(`/focus/${session._id}/pause`, { method: "POST" }); setSession(s); }
      catch (err) { flash(err.message); return; }
    } else if (session) {
      const elapsed = 2400 - remaining;
      setSession(prev => ({ ...prev, activeSeconds: elapsed, lastResumedAt: null }));
    }
    setSessionStatus("paused");
  }

  async function resumeFocus() {
    if (user && session?._id && !String(session._id).startsWith("demo-")) {
      try { const { session: s } = await api(`/focus/${session._id}/resume`, { method: "POST" }); setSession(s); }
      catch (err) { flash(err.message); return; }
    } else setSession(prev => ({ ...prev, lastResumedAt: new Date().toISOString() }));
    setSessionStart(Date.now()); setSessionStatus("running");
  }

  async function cancelFocus() {
    if (user && session?._id && !String(session._id).startsWith("demo-")) {
      try { await api(`/focus/${session._id}/cancel`, { method: "POST" }); } catch (err) { flash(err.message); return; }
    }
    setSession(null); setSessionStatus("idle"); setRemaining(2400); flash("Session cancelled. No token was awarded.");
  }

  async function completeFocus() {
    if (sessionStatus !== "running" || !session) return;
    clearInterval(intervalRef.current);
    if (user && !String(session._id).startsWith("demo-")) {
      try {
        const result = await api(`/focus/${session._id}/complete`, { method: "POST" });
        setTokens(result.tokens); setLifetimeTokens(result.lifetimeTokens); setSession(result.session); setSessionStatus("completed"); setTotalFocusMinutes(v => v + 40); await refreshUser(); flash("+1 TOKEN · Focus round complete.");
      } catch (err) { setSessionStatus("paused"); flash(err.message); }
    } else {
      setTokens(prev => Math.min(30, prev + 1)); setLifetimeTokens(v => v + 1); setTotalFocusMinutes(v => v + 40); setSessionStatus("completed"); setSession(prev => ({ ...prev, status: "completed", tokenAwarded: true })); flash("+1 TOKEN · Demo session complete.");
    }
  }

  async function spendTokens() {
    if (!user) { flash("Log in to use the persistent token economy."); setAuthOpen(true); return; }
    try {
      const result = await api("/economy/spend", { method: "POST", body: JSON.stringify({ amount: Number(spendAmount), activity }) });
      setTokens(result.tokens); await refreshUser(); flash(result.message);
    } catch (err) { flash(err.message); }
  }

  async function levelUp() {
    if (!user) { flash("Register to save your permanent progression."); setAuthOpen(true); return; }
    try {
      const result = await api("/economy/level-up", { method: "POST" });
      setUser(result.user); setTokens(result.user.tokens); setLevel(result.user.level); await refreshUser(); flash(result.message);
    } catch (err) { flash(err.message); }
  }

  async function generateGamma(e) {
    e.preventDefault(); setGammaBusy(true); setGammaError(""); setGammaResult(null);
    try {
      const result = await api("/ai/gamma", { method: "POST", body: JSON.stringify({ topic: gammaTopic, instructions: gammaInstructions, format: "presentation" }) });
      setGammaResult(result.data);
    } catch (err) { setGammaError(err.message); }
    finally { setGammaBusy(false); }
  }

  async function generateGoalPlan(e) {
    e.preventDefault();
    setGoalError("");
    if (!goalForm.goal.trim()) { setGoalError("Describe the goal you want to achieve."); return; }
    if (!user) {
      setGoalError("Create an account or log in first so your AI roadmap and daily progress can be saved.");
      setAuthMode("register");
      setAuthOpen(true);
      return;
    }
    setGoalBusy(true);
    try {
      const { plan } = await api("/plans/generate", { method: "POST", body: JSON.stringify(goalForm) });
      setGoalPlan(plan);
      setPage("Dashboard");
      flash("Gemma 4 created your roadmap. Your daily tracker is ready.");
    } catch (err) {
      setGoalError(err.message);
    } finally {
      setGoalBusy(false);
    }
  }

  async function toggleGoalTask(task, completed) {
    if (!goalPlan || !user) return;
    try {
      const { plan } = await api(`/plans/${goalPlan._id}/tasks/${task._id}`, {
        method: "PATCH", body: JSON.stringify({ completed })
      });
      setGoalPlan(plan);
      flash(completed ? "Daily task marked complete." : "Task moved back to your list.");
    } catch (err) { flash(err.message); }
  }

  async function setPlanStatus(status) {
    if (!goalPlan || !user) return;
    try {
      const { plan } = await api(`/plans/${goalPlan._id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setGoalPlan(plan);
      flash(status === "paused" ? "Goal plan paused." : "Goal plan resumed.");
    } catch (err) { flash(err.message); }
  }

  const visibleQuests = useMemo(() => quests.filter(q => {
    const matchesQuery = `${q.title} ${q.description} ${q.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All Quests" || (filter === "Active Quests" ? ["Accepted", "In Progress"].includes(q.status) : filter === "Today's Quests" ? q.status !== "Completed" : q.status === filter.replace(" Quests", ""));
    return matchesQuery && matchesFilter;
  }), [quests, query, filter]);

  const formatTime = n => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const levelCost = [0, 10, 14, 20, 28][level] ?? 38;
  const roundProgress = ((2400 - remaining) / 2400) * 100;

  function Header() {
    return <header className="topbar">
      <button className="icon-btn mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={19}/></button>
      <div className="crumb"><span>HUNTER CORE</span><ChevronRight size={14}/><b>{page.toUpperCase()}</b></div>
      <div className="top-actions"><span className="system-online"><i/> SYSTEM ONLINE</span><button className="icon-btn" onClick={() => flash("You're all caught up.")} aria-label="Notifications"><Bell size={18}/><em className="notification-dot"/></button><div className="top-user"><div className="avatar">{(user?.name || "H").slice(0,1).toUpperCase()}</div><div><b>{user?.name || "Guest Hunter"}</b><small>LVL {String(level).padStart(2,"0")}</small></div></div></div>
    </header>;
  }

  function Sidebar() {
    return <><div className={cx("sidebar-backdrop", mobileNav && "show")} onClick={() => setMobileNav(false)} /><aside className={cx("sidebar", mobileNav && "open")}>
      <div className="brand"><div className="brand-mark"><Crosshair size={24}/></div><div><strong>HUNTER<span>CORE</span></strong><small>REAL LIFE · RPG SYSTEM</small></div><button className="icon-btn sidebar-close" onClick={() => setMobileNav(false)}><X size={17}/></button></div>
      <div className="side-label">MAIN MENU</div>
      <nav>{navItems.map(([label, Icon]) => <button key={label} onClick={() => { setPage(label); setMobileNav(false); }} className={cx("nav-item", page === label && "active")}><Icon size={18}/><span>{label}</span>{label === "Quest Board" && <small>{quests.filter(q => q.status !== "Completed").length}</small>}{page === label && <i/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="rank-mini"><div className="rank-icon"><Zap size={17}/></div><div><small>CURRENT RANK</small><b>{levelNames[level] || `Hunter Rank ${level}`}</b></div></div><div className="sidebar-wallet"><div><Coins size={16}/> Token wallet</div><strong>{tokens}<span> / 30</span></strong><div className="mini-progress"><i style={{width:`${tokens/30*100}%`}}/></div></div><button className="sidebar-login" onClick={() => user ? logout() : (setAuthMode("login"), setAuthOpen(true))}>{user ? <><LogOut size={16}/> Log out</> : <><LogIn size={16}/> Log in / Register</>}</button><small className="version">HUNTER CORE v1.0.0 · BUILD YOURSELF</small></div>
    </aside></>;
  }

  function Dashboard() {
    const cards = [
      { label: "CURRENT LEVEL", value: String(level).padStart(2,"0"), sub: levelNames[level] || `Hunter Rank ${level}`, icon: Shield, color: "cyan" },
      { label: "TOKEN BALANCE", value: tokens, sub: `${30-tokens} capacity remaining`, icon: Coins, color: "violet" },
      { label: "FOCUS HOURS", value: (totalFocusMinutes/60).toFixed(1), sub: "Lifetime focused time", icon: Clock3, color: "green" },
      { label: "QUESTS CLEARED", value: completedQuests, sub: `${activeQuests} active missions`, icon: Trophy, color: "orange" }
    ];
    return <div className="page-content">
      <div className="welcome-row"><div><div className="eyebrow"><span className="pulse"/> YOUR PERSONAL PROGRESSION SYSTEM</div><h1>Welcome back, <span>{user?.name?.split(" ")[0] || "Hunter"}.</span></h1><p className="muted">Every focused minute is a step toward your next rank.</p></div><div className="date-pill"><Activity size={15}/>{today}</div></div>
      <section className="hero-panel"><div className="hero-grid"/><div className="hero-copy"><div className="hero-tag"><Sparkles size={13}/> SYSTEM STATUS: ONLINE</div><h2>YOUR NEXT<br/><span>EVOLUTION</span> STARTS NOW.</h2><p>Discipline is your weapon. Consistency is your power.</p><div className="hero-actions"><button className="btn-primary" onClick={startFocus}><Zap size={16} fill="currentColor"/> Start focus session <ChevronRight size={16}/></button><button className="btn-ghost" onClick={() => setPage("Quest Board")}>Explore quests</button></div></div><div className="hero-emblem"><div className="emblem-ring ring-one"/><div className="emblem-ring ring-two"/><div className="emblem-core"><Crosshair size={76} strokeWidth={1.1}/><span>HC</span></div><div className="orbit-dot dot-a"/><div className="orbit-dot dot-b"/></div><div className="hero-bottom"><span><i/> HUNTER SYSTEM ACTIVE</span><span>PROGRESSION PROTOCOL 01 <ArrowUpRight size={13}/></span></div></section>
      <div className="stat-grid">{cards.map(({label,value,sub,icon:Icon,color}, i) => <motion.div key={label} className="stat-card" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}><div className="stat-top"><span>{label}</span><div className={`stat-icon ${color}`}><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div><div className={`stat-line ${color}`}/></motion.div>)}</div>
      <div className="dashboard-grid"><section className="panel primary-quest"><div className="panel-heading"><div><div className="eyebrow">YOUR PRIORITY</div><h3>Primary Quest</h3></div><button className="text-btn" onClick={() => setPage("Quest Board")}>All quests <ArrowUpRight size={14}/></button></div>{activeQuest ? <div className="primary-quest-body"><div className="quest-symbol"><Target size={24}/></div><div className="quest-details"><div className="tag-row"><span className="tag cyan">{activeQuest.category}</span><span className={`priority ${activeQuest.priority?.toLowerCase()}`}>{activeQuest.priority || "Medium"} priority</span></div><h4>{activeQuest.title}</h4><p>{activeQuest.description || "Keep moving forward, one focused round at a time."}</p><div className="quest-meta"><span><Clock3 size={14}/> 40 min / round</span><span><Award size={14}/> +1 token per round</span></div><div className="quest-actions"><button className="btn-primary small" onClick={startFocus}><Zap size={14}/> Start quest</button><button className="btn-ghost small" onClick={() => setPage("Quest Board")}>View details</button></div></div></div> : <div className="empty-state"><Target size={26}/><b>No active quest yet</b><button className="btn-primary small" onClick={() => setQuestModal(true)}><Plus size={14}/> Create your first quest</button></div>}</section>
      <section className="panel daily-panel"><div className="panel-heading"><div><div className="eyebrow">KEEP YOUR MOMENTUM</div><h3>Daily Objective</h3></div><div className="objective-icon"><Flame size={18}/></div></div><div className="daily-target"><strong>03</strong><span>FOCUS ROUNDS</span></div><div className="progress-label"><span>Today's progress</span><b>{Math.floor(totalFocusMinutes/40)%4} / 3</b></div><div className="progress-track"><i style={{width:`${Math.min(100,(Math.floor(totalFocusMinutes/40)%4)/3*100)}%`}}/></div><div className="daily-footer"><span><CheckCircle2 size={15}/> Small steps. Big evolution.</span><span className="muted">40 min each</span></div></section></div>
      <section className="panel activity-panel"><div className="panel-heading"><div><div className="eyebrow">RECENT OPERATIONS</div><h3>Activity Log</h3></div><button className="icon-btn" onClick={() => setPage("Statistics")}><ArrowUpRight size={16}/></button></div>{transactions.length ? transactions.slice(0,4).map(t => <div className="activity-row" key={t._id}><div className="activity-icon"><Coins size={16}/></div><div className="activity-text"><b>{t.type}</b><small>{t.description}</small></div><strong className={t.amount > 0 ? "positive" : ""}>{t.amount > 0 ? "+" : ""}{t.amount} TOKENS</strong><time>{new Date(t.createdAt).toLocaleDateString()}</time></div>) : <div className="activity-empty"><Activity size={17}/> Your system activity will appear here as you complete quests and focus rounds.</div>}</section>
    </div>;
  }

  function QuestBoard() {
    return <div className="page-content"><div className="page-title-row"><div><div className="eyebrow">MISSION CONTROL</div><h1>Quest <span>Board</span></h1><p className="muted">Turn your ambitions into clear, actionable missions.</p></div><button className="btn-primary" onClick={() => setQuestModal(true)}><Plus size={16}/> Create quest</button></div><div className="quest-toolbar"><div className="search-box"><Search size={16}/><input placeholder="Search quests..." value={query} onChange={e => setQuery(e.target.value)}/></div><div className="filter-tabs">{["All Quests","Active Quests","Today's Quests","Completed Quests"].map(x => <button key={x} className={filter===x?"selected":""} onClick={() => setFilter(x)}>{x}</button>)}</div></div><div className="quest-list">{visibleQuests.map((q,i) => <motion.article layout key={q._id} className="quest-card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}><div className="quest-card-symbol"><Swords size={20}/></div><div className="quest-card-main"><div className="tag-row"><span className="tag cyan">{q.category}</span><span className={`priority ${q.priority?.toLowerCase()}`}>{q.priority}</span><span className={`status status-${q.status?.toLowerCase().replaceAll(" ","-")}`}>{q.status}</span></div><h3>{q.title}</h3><p>{q.description || "No description added yet."}</p><div className="quest-meta"><span><Shield size={13}/>{q.difficulty}</span><span><Clock3 size={13}/>{q.focusMinutes || 0} focus min</span></div></div><div className="quest-card-actions">{q.status!=="Completed" ? <><button className="btn-primary small" onClick={() => {setSelectedQuest(q._id); setPage("Focus Session"); startFocus();}}><Zap size={13}/> Start</button><button className="icon-btn" title="Mark complete" onClick={() => updateQuest(q,"Completed")}><Check size={16}/></button></> : <span className="completed-mark"><CheckCircle2 size={17}/> Cleared</span>}<button className="icon-btn danger-hover" title="Delete quest" onClick={() => deleteQuest(q)}><X size={15}/></button></div></motion.article>)}{!visibleQuests.length && <div className="empty-large"><Swords size={28}/><h3>No quests found</h3><p>Adjust your filters or create a new quest.</p><button className="btn-primary small" onClick={() => setQuestModal(true)}><Plus size={14}/> Create quest</button></div>}</div></div>;
  }

  function FocusPage() {
    const circumference = 2 * Math.PI * 112;
    return <div className="page-content"><div className="page-title-row"><div><div className="eyebrow">DEEP WORK PROTOCOL</div><h1>Focus <span>Session</span></h1><p className="muted">Forty minutes of intention. One token of progress.</p></div><div className="status-chip"><i className={sessionStatus==="running"?"pulse":""}/>{sessionStatus==="running"?"SESSION IN PROGRESS":sessionStatus==="paused"?"SESSION PAUSED":sessionStatus==="completed"?"ROUND COMPLETE":"READY TO BEGIN"}</div></div><div className="focus-layout"><section className="panel focus-main"><div className="focus-quest-label"><Crosshair size={15}/><span>ASSIGNED QUEST</span></div><select value={selectedQuest || activeQuest?._id || ""} onChange={e => setSelectedQuest(e.target.value)}><option value="">Select a quest</option>{quests.filter(q=>q.status!=="Completed").map(q=><option key={q._id} value={q._id}>{q.title}</option>)}</select><div className="timer-wrap"><svg viewBox="0 0 260 260" className="timer-svg"><circle cx="130" cy="130" r="112" className="timer-track"/><circle cx="130" cy="130" r="112" className="timer-progress" strokeDasharray={circumference} strokeDashoffset={circumference*(1-roundProgress/100)}/></svg><div className="timer-center"><span className="timer-caption">{sessionStatus==="running"?"FOCUSING":sessionStatus==="paused"?"ON PAUSE":sessionStatus==="completed"?"WELL DONE":"TIME TO FOCUS"}</span><strong>{formatTime(remaining)}</strong><span className="timer-sub">{Math.floor((2400-remaining)/60)} OF 40 MINUTES</span></div></div><div className="timer-buttons">{sessionStatus==="idle"||sessionStatus==="completed" ? <button className="btn-primary" onClick={startFocus}><Zap size={16} fill="currentColor"/> Start focus</button> : sessionStatus==="running" ? <button className="btn-primary" onClick={pauseFocus}>Ⅱ Pause session</button> : <button className="btn-primary" onClick={resumeFocus}><Zap size={16}/> Resume session</button>}{["running","paused"].includes(sessionStatus) && <button className="btn-ghost" onClick={cancelFocus}><X size={15}/> Cancel</button>}{sessionStatus==="completed" && <button className="btn-ghost" onClick={() => {setRemaining(2400);setSession(null);setSessionStatus("idle");}}>New round</button>}</div><p className="timer-footnote"><Shield size={13}/> Tokens are awarded only after a valid 40-minute focus round.</p></section><aside className="focus-side"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">SESSION REWARD</div><h3>Earn your token</h3></div><div className="stat-icon violet"><Coins size={17}/></div></div><div className="reward-big"><Coins size={26}/><strong>+1</strong><span>TOKEN</span></div><div className="reward-rule"><span>Focus duration</span><b>40 minutes</b></div><div className="reward-rule"><span>Wallet balance</span><b>{tokens} / 30</b></div><div className="reward-rule"><span>Lifetime earned</span><b>{lifetimeTokens}</b></div></section><section className="panel"><div className="panel-heading"><div><div className="eyebrow">CURRENT MISSION</div><h3>{activeQuest?.title || "No quest selected"}</h3></div><BookOpen size={18} className="muted-icon"/></div><p className="side-description">{activeQuest?.description || "Choose a quest to connect your focus round to a real goal."}</p><button className="btn-ghost full" onClick={() => setPage("Quest Board")}>Manage quests <ChevronRight size={15}/></button></section></aside></div></div>;
  }

  function Economy() {
    return <div className="page-content"><div className="page-title-row"><div><div className="eyebrow">REWARDS & PROGRESSION</div><h1>Token <span>Economy</span></h1><p className="muted">Earn honestly. Spend intentionally. Invest in your future.</p></div></div><div className="wallet-hero panel"><div><div className="eyebrow">AVAILABLE BALANCE</div><div className="wallet-balance"><Coins size={28}/><strong>{tokens}</strong><span>/ 30 tokens</span></div><div className="wallet-track"><i style={{width:`${tokens/30*100}%`}}/></div><p className="muted">Every token represents 40 minutes of focused work.</p></div><div className="wallet-art"><div className="coin coin-back"/><div className="coin coin-front"><Zap size={30}/></div></div></div><div className="economy-grid"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">CONTROLLED LEISURE</div><h3>Spend tokens</h3></div><div className="stat-icon orange"><Gamepad2 size={17}/></div></div><p className="muted">1 token unlocks 10 minutes of approved leisure time.</p><label className="field-label">Activity</label><select className="form-control" value={activity} onChange={e=>setActivity(e.target.value)}>{["Gaming","YouTube","Chess","Entertainment","Custom leisure activity"].map(a=><option key={a}>{a}</option>)}</select><label className="field-label">Tokens to spend</label><div className="token-amounts">{[1,2,3,4,5,6].map(n=><button key={n} className={spendAmount===n?"chosen":""} onClick={()=>setSpendAmount(n)}>{n}</button>)}</div><div className="spend-summary"><span>Leisure time unlocked</span><strong>{spendAmount*10} min</strong></div><button className="btn-primary full" onClick={spendTokens}><Coins size={15}/> Confirm spending</button></section><section className="panel"><div className="panel-heading"><div><div className="eyebrow">PERMANENT PROGRESSION</div><h3>Level up</h3></div><div className="stat-icon cyan"><Trophy size={17}/></div></div><div className="level-progress"><div className="level-badge"><Shield size={26}/><b>{String(level).padStart(2,"0")}</b></div><div><small>CURRENT RANK</small><h4>{levelNames[level] || `Hunter Rank ${level}`}</h4><p>Next: {levelNames[level+1] || `Hunter Rank ${level+1}`}</p></div></div><div className="level-cost"><span>Investment required</span><strong><Coins size={17}/>{levelCost} tokens</strong></div><div className="level-benefit"><CheckCircle2 size={15}/> Daily leisure cap increases to {dailyCap+1} tokens</div><button className="btn-primary full" disabled={tokens<levelCost} onClick={levelUp}><ArrowUpRight size={15}/> Invest & level up</button>{tokens<levelCost && <small className="hint">You need {levelCost-tokens} more tokens to unlock the next level.</small>}</section></div><section className="panel transaction-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR LEDGER</div><h3>Transaction history</h3></div><span className="count-pill">{transactions.length} records</span></div>{transactions.length ? transactions.map(t=><div className="activity-row" key={t._id}><div className="activity-icon"><Coins size={15}/></div><div className="activity-text"><b>{t.type}</b><small>{t.description}</small></div><strong className={t.amount>0?"positive":""}>{t.amount>0?"+":""}{t.amount}</strong><span className="balance-after">Balance: {t.newBalance}</span><time>{new Date(t.createdAt).toLocaleDateString()}</time></div>) : <div className="activity-empty">No transactions yet. Complete your first focus round to start earning.</div>}</section></div>;
  }

  function Statistics() {
    const bars = [22, 38, 31, 65, 44, 82, Math.min(100, Math.max(8, totalFocusMinutes/4))];
    return <div className="page-content"><div className="page-title-row"><div><div className="eyebrow">PERFORMANCE INTELLIGENCE</div><h1>Hunter <span>Analytics</span></h1><p className="muted">Measure the work. Learn from the pattern. Improve the system.</p></div></div><div className="stat-grid">{[{label:"TOTAL FOCUS",value:`${(totalFocusMinutes/60).toFixed(1)}h`,sub:"Persisted focus time",icon:Clock3,color:"cyan"},{label:"TOKENS EARNED",value:lifetimeTokens,sub:"Lifetime total",icon:Coins,color:"violet"},{label:"QUESTS CLEARED",value:completedQuests,sub:"Completed missions",icon:Trophy,color:"green"},{label:"ACTIVE QUESTS",value:activeQuests,sub:"Current workload",icon:Target,color:"orange"}].map(({label,value,sub,icon:Icon,color})=><div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><div className={`stat-icon ${color}`}><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div><div className={`stat-line ${color}`}/></div>)}</div><div className="analytics-grid"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">CONSISTENCY OVER TIME</div><h3>Weekly focus activity</h3></div><span className="tag cyan">Illustrative</span></div><div className="bar-chart">{bars.map((height,i)=><div className="bar-column" key={i}><div className="bar-value">{i===6?`${Math.round(totalFocusMinutes)}m`:""}</div><div className="bar-track"><i style={{height:`${height}%`}}/></div><small>{["MON","TUE","WED","THU","FRI","SAT","SUN"][i]}</small></div>)}</div><p className="chart-note">Bars are illustrative until enough dated session history is available. Summary cards above use your saved totals.</p></section><section className="panel"><div className="panel-heading"><div><div className="eyebrow">CAREER READINESS</div><h3>Placement milestones</h3></div><BrainCircuit size={18} className="muted-icon"/></div>{[["DSA problems solved","Track in your own notes"],["Projects completed","Build proof of skill"],["Courses completed","Show your learning"],["Interview practice","Prepare with intent"]].map(([name,desc],i)=><div className="milestone-row" key={name}><div className="milestone-number">0{i+1}</div><div><b>{name}</b><small>{desc}</small></div><button className="icon-btn" onClick={()=>flash("Add milestone tracking in a future iteration.")}><Plus size={15}/></button></div>)}</section></div></div>;
  }

  function PenaltyZone() {
    return <div className="page-content"><div className="page-title-row"><div><div className="eyebrow">ACCOUNTABILITY PROTOCOL</div><h1>Penalty <span>Zone</span></h1><p className="muted">A missed day is information, not your identity. Reset and move forward.</p></div></div><section className="penalty-hero panel"><div className="penalty-icon"><Shield size={30}/></div><div><div className="eyebrow">CONSTRUCTIVE ACCOUNTABILITY</div><h2>Discipline without self-punishment.</h2><p>Review missed commitments honestly. Illness, emergencies, and unavoidable obligations deserve an exception—not shame.</p><button className="btn-primary" onClick={()=>flash("Exception day recorded in this demo. Persistent daily records can be added to the backend.")}>Mark an exception day</button></div></section><div className="economy-grid"><section className="panel"><div className="eyebrow">SUGGESTED RECOVERY MISSION</div><h3>Build a small project</h3><p className="muted">Create, finish, and publish one small website within 3 days.</p><ul className="check-list"><li><CheckCircle2 size={15}/> Create the repository</li><li><CheckCircle2 size={15}/> Finish the core feature</li><li><CheckCircle2 size={15}/> Publish a live demo</li><li><CheckCircle2 size={15}/> Write a short README</li></ul><button className="btn-ghost full" onClick={()=>{setQuestForm({title:"Recovery mission: publish a small website",description:"Create the project, finish the core feature, publish it, and submit the repository link.",category:"Project Development",priority:"High",difficulty:"Hard"});setQuestModal(true);}}>Accept as quest</button></section><section className="panel"><div className="eyebrow">SYSTEM PRINCIPLE</div><h3>No arbitrary penalties</h3><p className="muted">Hunter Core will not delete earned tokens, silently reduce your level, or punish legitimate emergencies. Accountability should help you recover, not make you give up.</p><div className="principle-line"><Shield size={18}/><span>Progress is built through the next action.</span></div></section></div></div>;
  }

  function Profile() {
    return <div className="page-content"><div className="page-title-row"><div><div className="eyebrow">HUNTER IDENTIFICATION</div><h1>Hunter <span>Profile</span></h1><p className="muted">Your progress is a record of effort—not a measure of your worth.</p></div></div><section className="profile-hero panel"><div className="profile-avatar"><Crosshair size={38}/></div><div className="profile-info"><div className="eyebrow">HUNTER PROFILE · #{user?.id?.slice(-6)?.toUpperCase() || "GUEST01"}</div><h2>{user?.name || "Guest Hunter"}</h2><p>{user?.email || "Sign in to sync your profile across sessions."}</p><span className="rank-chip"><Shield size={14}/>{levelNames[level] || `Hunter Rank ${level}`}</span></div><button className="btn-ghost" onClick={()=>user?setPage("Settings"):(setAuthOpen(true),setAuthMode("register"))}>Edit profile</button></section><div className="stat-grid">{[{label:"CURRENT LEVEL",value:level,sub:"Highest: "+level,icon:Shield,color:"cyan"},{label:"LIFETIME TOKENS",value:lifetimeTokens,sub:"Earned through focus",icon:Coins,color:"violet"},{label:"FOCUS HOURS",value:(totalFocusMinutes/60).toFixed(1),sub:"Total saved time",icon:Clock3,color:"green"},{label:"QUESTS COMPLETED",value:completedQuests,sub:"Missions cleared",icon:Trophy,color:"orange"}].map(({label,value,sub,icon:Icon,color})=><div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><div className={`stat-icon ${color}`}><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div><div className={`stat-line ${color}`}/></div>)}</div><section className="panel achievements-panel"><div className="panel-heading"><div><div className="eyebrow">MILESTONES</div><h3>Achievement badges</h3></div><Award size={18} className="muted-icon"/></div><div className="badge-grid">{[["FIRST BLOOD","Complete your first focus round",lifetimeTokens>=1],["IRON DISCIPLINE","Earn 10 lifetime tokens",lifetimeTokens>=10],["QUEST MASTER","Complete 25 quests",completedQuests>=25],["PROJECT HUNTER","Complete a project quest",quests.some(q=>q.category==="Project Development"&&q.status==="Completed")],["CENTURION","Earn 100 lifetime tokens",lifetimeTokens>=100],["RISING RANK","Reach level 2",level>=2]].map(([name,desc,unlocked])=><div className={cx("achievement",unlocked&&"unlocked")} key={name}><div className="achievement-icon"><Award size={23}/></div><div><b>{name}</b><small>{desc}</small></div><span>{unlocked?"UNLOCKED":"LOCKED"}</span></div>)}</div></section></div>;
  }

  function SettingsPage() {
    return <div className="page-content"><div className="page-title-row"><div><div className="eyebrow">SYSTEM CONFIGURATION</div><h1>Hunter <span>Settings</span></h1><p className="muted">Tune the system to support the way you work.</p></div></div><div className="settings-grid"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">ACCOUNT</div><h3>Profile settings</h3></div><User size={18} className="muted-icon"/></div><label className="field-label">Hunter name</label><input className="form-control" value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="Your hunter name"/><button className="btn-primary full" onClick={()=>flash(user?"Profile name editing endpoint can be added to the API.":"Register to save profile settings.")}>Save profile</button><div className="settings-divider"/><div className="settings-row"><div><b>Daily focus target</b><small>Default target: 3 focus rounds</small></div><span className="setting-value">3 rounds</span></div><div className="settings-row"><div><b>Focus duration</b><small>Token reward rules use a 40-minute round</small></div><span className="setting-value">40 min</span></div><div className="settings-row"><div><b>Wallet capacity</b><small>Maximum token balance</small></div><span className="setting-value">30 tokens</span></div></section><section className="panel"><div className="panel-heading"><div><div className="eyebrow">AI INTEGRATION</div><h3>Gamma API</h3></div><div className="stat-icon violet"><Sparkles size={17}/></div></div><p className="muted">Generate presentation content from a study topic. Your API key stays on the server.</p><form onSubmit={generateGamma} className="gamma-form"><label className="field-label">Topic</label><input className="form-control" value={gammaTopic} onChange={e=>setGammaTopic(e.target.value)} placeholder="e.g. DBMS normalization" required/><label className="field-label">Instructions</label><textarea className="form-control" rows="4" value={gammaInstructions} onChange={e=>setGammaInstructions(e.target.value)}/><button className="btn-primary full" disabled={gammaBusy}>{gammaBusy?<span className="spinner"/>:<Sparkles size={15}/>} {gammaBusy?"Connecting to Gamma...":"Generate with Gamma"}</button></form>{gammaError&&<div className="error-box">{gammaError}</div>}{gammaResult&&<div className="gamma-result"><b>Gamma API response</b><pre>{JSON.stringify(gammaResult,null,2)}</pre></div>}<div className="api-hint"><Shield size={14}/> Set <code>GAMMA_API_KEY</code> in <code>server/.env</code>. Never paste your secret key into this page.</div></section></div><section className="panel danger-panel"><div><div className="eyebrow">DANGER ZONE</div><h3>Reset local demo quests</h3><p className="muted">This only resets demo quest cards in this browser. It does not delete your MongoDB account or saved server records.</p></div><button className="btn-danger" onClick={()=>{if(confirm("Reset local demo quest list?")){setQuests(initialQuests);localStorage.setItem("hc-quests",JSON.stringify(initialQuests));flash("Demo quests reset.");}}}>Reset demo quests</button></section></div>;
  }

  function GoalPlanner() {
    const typeCards = [
      { id: "study", title: "Study", desc: "Exams, DSA, college subjects, certifications", icon: BookOpen },
      { id: "workout", title: "Workout", desc: "Strength, stamina, mobility, consistency", icon: Flame },
      { id: "skill", title: "Skill", desc: "Coding, design, communication, career skills", icon: BrainCircuit }
    ];
    return <div className="page-content">
      <div className="welcome-row"><div><div className="eyebrow"><span className="pulse"/> GEMMA 4 · PERSONAL GOAL ENGINE</div><h1>Choose your <span>next evolution.</span></h1><p className="muted">Tell the system where you want to go. Gemma 4 will break the goal into a roadmap and daily actions you can actually track.</p></div><div className="date-pill"><Target size={15}/>{today}</div></div>
      <section className="goal-intro panel"><div className="goal-intro-mark"><Crosshair size={28}/></div><div><div className="eyebrow">FROM AMBITION TO DAILY ACTION</div><h2>One goal. A clear map. Daily progress.</h2><p>Choose a track, set a realistic timeline, and get a personalized day-by-day plan. Tick off each task on your dashboard to see your progress grow.</p><div className="goal-flow"><span>01 · DEFINE</span><ChevronRight size={13}/><span>02 · GENERATE ROADMAP</span><ChevronRight size={13}/><span>03 · TRACK DAILY</span></div></div></section>
      <form className="panel goal-form" onSubmit={generateGoalPlan}>
        <div className="panel-heading"><div><div className="eyebrow">STEP 01</div><h3>Choose your track</h3></div><span className="tag cyan">Personalized</span></div>
        <div className="goal-type-grid">{typeCards.map(({id,title,desc,icon:Icon})=><button type="button" key={id} className={cx("goal-type-card",goalForm.goalType===id&&"selected")} onClick={()=>setGoalForm({...goalForm,goalType:id})}><span className="goal-type-icon"><Icon size={22}/></span><b>{title}</b><small>{desc}</small><span className="goal-radio">{goalForm.goalType===id?<Check size={12}/>:null}</span></button>)}</div>
        <div className="panel-heading goal-step-heading"><div><div className="eyebrow">STEP 02</div><h3>Describe your goal</h3></div></div>
        <label className="field-label">What exactly do you want to achieve? *</label>
        <textarea className="form-control goal-textarea" rows="3" value={goalForm.goal} onChange={e=>setGoalForm({...goalForm,goal:e.target.value})} placeholder={goalForm.goalType==="study"?"Example: Master DSA arrays, strings, linked lists, and solve 60 problems in 8 weeks.":goalForm.goalType==="workout"?"Example: Build a consistent beginner workout routine and improve my stamina over 12 weeks.":"Example: Become comfortable building full-stack MERN apps and ship 2 portfolio projects in 60 days."} required maxLength="300"/>
        <div className="goal-fields-grid"><div><label className="field-label">Current level</label><select className="form-control" value={goalForm.startingPoint} onChange={e=>setGoalForm({...goalForm,startingPoint:e.target.value})}>{["Complete beginner","Beginner","Some experience","Intermediate","Advanced","Returning after a break"].map(x=><option key={x}>{x}</option>)}</select></div><div><label className="field-label">Time to achieve goal</label><select className="form-control" value={goalForm.targetDays} onChange={e=>setGoalForm({...goalForm,targetDays:Number(e.target.value)})}>{[[7,"7 days"],[14,"2 weeks"],[30,"30 days"],[45,"45 days"],[60,"60 days"],[90,"90 days"],[120,"120 days"],[180,"6 months"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><div><label className="field-label">Daily time available</label><select className="form-control" value={goalForm.minutesPerDay} onChange={e=>setGoalForm({...goalForm,minutesPerDay:Number(e.target.value)})}>{[[20,"20 minutes"],[30,"30 minutes"],[45,"45 minutes"],[60,"1 hour"],[90,"1.5 hours"],[120,"2 hours"],[180,"3 hours"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><div><label className="field-label">Days available per week</label><select className="form-control" value={goalForm.daysPerWeek} onChange={e=>setGoalForm({...goalForm,daysPerWeek:Number(e.target.value)})}>{[3,4,5,6,7].map(v=><option key={v} value={v}>{v} days / week</option>)}</select></div></div>
        <label className="field-label">Constraints, schedule, or preferences (optional)</label><textarea className="form-control" rows="2" value={goalForm.constraints} onChange={e=>setGoalForm({...goalForm,constraints:e.target.value})} placeholder="Example: college from 10 AM to 4 PM, weekends are freer, no gym equipment, focus on practical projects." maxLength="1000"/>
        {goalError&&<div className="error-box">{goalError}</div>}
        <div className="goal-submit-row"><div><Shield size={15}/><span>Your API key stays on the server. Generated plans are saved to your account.</span></div><button className="btn-primary goal-submit" type="submit" disabled={goalBusy}>{goalBusy?<span className="spinner"/>:<Sparkles size={16}/>} {goalBusy?"Gemma 4 is building your roadmap...":"Generate my roadmap"} <ChevronRight size={16}/></button></div>
      </form>
      {goalPlan&&<section className="panel existing-plan"><div><div className="eyebrow">YOUR CURRENT ROADMAP</div><h3>{goalPlan.planTitle}</h3><p>{goalPlan.overview}</p></div><button className="btn-ghost" onClick={()=>setPage("Dashboard")}>Open tracker <ChevronRight size={15}/></button></section>}
    </div>;
  }

  function GoalTracker() {
    if (!goalPlan) return <section className="panel goal-empty-panel"><div className="goal-empty-icon"><Target size={22}/></div><div><div className="eyebrow">YOUR NEXT EVOLUTION</div><h3>No goal roadmap yet</h3><p>Choose Study, Workout, or Skill and let Gemma 4 map out the daily steps.</p></div><button className="btn-primary small" onClick={()=>setPage("Goal Planner")}><Sparkles size={14}/> Create my roadmap</button></section>;
    const tasks = goalPlan.dailyTasks || [];
    const done = tasks.filter(t=>t.completed).length;
    const percent = tasks.length ? Math.round(done/tasks.length*100) : 0;
    const todayKey = new Date().toISOString().slice(0,10);
    const todays = tasks.filter(t=>t.date===todayKey);
    const shownTasks = todays.length ? todays : tasks.filter(t=>!t.completed).slice(0,4);
    return <section className="panel goal-tracker-panel">
      <div className="panel-heading"><div><div className="eyebrow">GEMMA 4 GOAL TRACKER</div><h3>{goalPlan.planTitle}</h3><p className="muted">{goalPlan.goal}</p></div><span className={`plan-status ${goalPlan.status}`}>{goalPlan.status}</span></div>
      <div className="goal-progress-overview"><div className="goal-progress-number"><strong>{percent}%</strong><span>ROADMAP COMPLETE</span></div><div className="goal-progress-main"><div className="progress-label"><span>{done} of {tasks.length} daily tasks completed</span><b>{tasks.length-done} left</b></div><div className="progress-track"><i style={{width:`${percent}%`}}/></div><small>{goalPlan.targetDays} day plan · {goalPlan.minutesPerDay} minutes/day · {goalPlan.daysPerWeek} days/week</small></div><div className="goal-progress-actions"><button className="icon-btn" title="Edit or regenerate goal" onClick={()=>{setGoalForm({goalType:goalPlan.goalType,goal:goalPlan.goal,startingPoint:goalPlan.startingPoint,targetDays:goalPlan.targetDays,minutesPerDay:goalPlan.minutesPerDay,daysPerWeek:goalPlan.daysPerWeek,constraints:goalPlan.constraints||""});setPage("Goal Planner");}}><Settings size={16}/></button><button className="icon-btn" title={goalPlan.status==="paused"?"Resume plan":"Pause plan"} onClick={()=>setPlanStatus(goalPlan.status==="paused"?"active":"paused")}>{goalPlan.status==="paused"?<Zap size={16}/>:<span>Ⅱ</span>}</button></div></div>
      <div className="goal-tracker-columns"><div className="daily-task-section"><div className="daily-task-heading"><div><div className="eyebrow">{todays.length?"TODAY'S PLAN":"NEXT ACTIONS"}</div><h4>{todays.length?new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}):"Your upcoming tasks"}</h4></div><span className="count-pill">{shownTasks.filter(t=>t.completed).length}/{shownTasks.length} done</span></div>{goalPlan.status==="paused"&&<div className="paused-note">Your plan is paused. Resume it to continue tracking.</div>}{shownTasks.map(task=><label className={cx("daily-task",task.completed&&"task-done")} key={task._id}><input type="checkbox" checked={task.completed} disabled={goalPlan.status==="paused"} onChange={e=>toggleGoalTask(task,e.target.checked)}/><span className="task-check"><Check size={13}/></span><span className="daily-task-copy"><b>{task.title}</b><small>Day {task.dayNumber} · {task.category} · {task.estimatedMinutes} min</small><span>{task.description}</span></span></label>)}{!shownTasks.length&&<div className="activity-empty"><CheckCircle2 size={17}/> All tasks in this roadmap are complete. Incredible work.</div>}<button className="btn-ghost full" onClick={()=>setPage("Goal Planner")}>View goal settings / create new plan <ChevronRight size={14}/></button></div>
      <aside className="milestone-section"><div className="eyebrow">THE ROAD AHEAD</div><h4>Milestones</h4>{(goalPlan.milestones||[]).slice(0,6).map((m,i)=><div className="goal-milestone" key={m._id||i}><div className="milestone-dot">{i+1}</div><div><b>{m.title}</b><small>Day {m.targetDay} · {m.description}</small></div></div>)}{!goalPlan.milestones?.length&&<p className="muted">Milestones will appear here.</p>}<div className="goal-plan-summary"><span>Track</span><b>{goalPlan.goalType==="study"?"Study":goalPlan.goalType==="workout"?"Workout":"Skill development"}</b><span>Starting level</span><b>{goalPlan.startingPoint}</b></div></aside></div>
    </section>;
  }

  return <div className="app-shell"><Sidebar/><main className="main-area"><Header/>{page==="Goal Planner"?<GoalPlanner/>:page==="Dashboard"?<><Dashboard/><div className="page-content dashboard-goal-wrap"><GoalTracker/></div></>:page==="Quest Board"?<QuestBoard/>:page==="Focus Session"?<FocusPage/>:page==="Token Economy"?<Economy/>:page==="Statistics"?<Statistics/>:page==="Penalty Zone"?<PenaltyZone/>:page==="Profile"?<Profile/>:<SettingsPage/>}<footer className="app-footer"><span>HUNTER CORE <b>·</b> YOUR REAL-LIFE PROGRESSION SYSTEM</span><span>DISCIPLINE IS A SKILL. TRAIN IT DAILY.</span></footer></main>
    <AnimatePresence>{notice&&<motion.div className="toast" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></motion.div>}</AnimatePresence>
    {questModal&&<div className="modal-backdrop" onClick={()=>setQuestModal(false)}><motion.div className="modal panel" onClick={e=>e.stopPropagation()} initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}}><div className="modal-heading"><div><div className="eyebrow">NEW MISSION</div><h2>Create a quest</h2></div><button className="icon-btn" onClick={()=>setQuestModal(false)}><X size={18}/></button></div><form onSubmit={createQuest}><label className="field-label">Quest title *</label><input className="form-control" value={questForm.title} onChange={e=>setQuestForm({...questForm,title:e.target.value})} placeholder="e.g. Solve two DSA problems" required maxLength="120"/><label className="field-label">Description</label><textarea className="form-control" rows="3" value={questForm.description} onChange={e=>setQuestForm({...questForm,description:e.target.value})} placeholder="What does success look like?"/><div className="form-two"><div><label className="field-label">Category</label><select className="form-control" value={questForm.category} onChange={e=>setQuestForm({...questForm,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="field-label">Priority</label><select className="form-control" value={questForm.priority} onChange={e=>setQuestForm({...questForm,priority:e.target.value})}>{["Low","Medium","High","Critical"].map(c=><option key={c}>{c}</option>)}</select></div></div><label className="field-label">Difficulty</label><select className="form-control" value={questForm.difficulty} onChange={e=>setQuestForm({...questForm,difficulty:e.target.value})}>{["Easy","Normal","Hard","Boss Quest"].map(c=><option key={c}>{c}</option>)}</select><div className="modal-actions"><button type="button" className="btn-ghost" onClick={()=>setQuestModal(false)}>Cancel</button><button type="submit" className="btn-primary"><Plus size={15}/> Add quest</button></div></form></motion.div></div>}
    {authOpen&&<div className="modal-backdrop" onClick={()=>setAuthOpen(false)}><motion.div className="modal auth-modal panel" onClick={e=>e.stopPropagation()} initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}}><div className="modal-heading"><div><div className="eyebrow">HUNTER IDENTIFICATION</div><h2>{authMode==="login"?"Welcome back.":"Join the system."}</h2></div><button className="icon-btn" onClick={()=>setAuthOpen(false)}><X size={18}/></button></div><form onSubmit={submitAuth}>{authMode==="register"&&<><label className="field-label">Hunter name</label><input className="form-control" value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} required placeholder="Your name"/></>}<label className="field-label">Email</label><input className="form-control" type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} required placeholder="you@example.com"/><label className="field-label">Password</label><input className="form-control" type="password" minLength="8" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} required placeholder="At least 8 characters"/><button className="btn-primary full" type="submit">{authMode==="login"?"Log in":"Create account"} <ChevronRight size={16}/></button></form><p className="auth-switch">{authMode==="login"?"New to Hunter Core?":"Already registered?"} <button onClick={()=>setAuthMode(authMode==="login"?"register":"login")}>{authMode==="login"?"Create an account":"Log in"}</button></p><p className="auth-note"><Shield size={13}/> Your account and progress are stored securely in MongoDB.</p></motion.div></div>}
  </div>;
}

export default App;
