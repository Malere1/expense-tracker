
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, CalendarDays, ChartNoAxesCombined,
  ChevronDown, CircleHelp, CreditCard, Download, Filter, Plus,
  Search, Settings2, Wallet, X, Trash2, Utensils, Car, House,
  ShoppingBag, HeartPulse, GraduationCap, BriefcaseBusiness, MoreHorizontal,
} from 'lucide-react';

type Expense = {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: string;
  payment: string;
};

const categories = [
  'Food & Dining', 'Transport', 'Housing', 'Shopping',
  'Health', 'Education', 'Other',
];

const categoryIcons: Record<string, typeof Utensils> = {
  'Food & Dining': Utensils,
  Transport: Car,
  Housing: House,
  Shopping: ShoppingBag,
  Health: HeartPulse,
  Education: GraduationCap,
  Other: BriefcaseBusiness,
};

const starterExpenses: Expense[] = [
  { id: 1, title: 'Groceries at Market Square', category: 'Food & Dining', amount: 18500, date: '2026-11-12', payment: 'Debit card' },
  { id: 2, title: 'Ride to the office', category: 'Transport', amount: 4500, date: '2026-11-11', payment: 'Cash' },
  { id: 3, title: 'Monthly internet', category: 'Other', amount: 12000, date: '2026-11-10', payment: 'Transfer' },
  { id: 4, title: 'Lunch with friends', category: 'Food & Dining', amount: 8500, date: '2026-11-09', payment: 'Debit card' },
  { id: 5, title: 'Electricity bill', category: 'Housing', amount: 22000, date: '2026-11-07', payment: 'Transfer' },
];

const money = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('ledgerly-expenses');
      return saved ? JSON.parse(saved) as Expense[] : starterExpenses;
    } catch {
      return starterExpenses;
    }
  });

  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState('Your latest activity');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('This month');
  const [categoryFilter, setCategoryFilter] = useState('All categories');

  const [form, setForm] = useState({
    title: '',
    category: 'Food & Dining',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    payment: 'Debit card',
  });

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('ledgerly-expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch('https://jsonplaceholder.typicode.com/posts?_limit=3')
      .then(response => {
        if (!response.ok) throw new Error('Could not load demo activity');
        return response.json();
      })
      .then((posts: { id: number; title: string }[]) => {
        if (!active) return;
        setApiMessage('Demo API connected · sample activity loaded');
        if (posts.length === 0) setApiMessage('Showing your saved activity');
      })
      .catch(() => {
        if (active) setApiMessage('Showing sample activity · mock API unavailable');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (showForm) titleRef.current?.focus();
  }, [showForm]);

  const visibleExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses
      .filter(item => categoryFilter === 'All categories' || item.category === categoryFilter)
      .filter(item =>
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      )
      .filter(item =>
        period !== 'This month' ||
        item.date.slice(0, 7) === new Date().toISOString().slice(0, 7)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, search, categoryFilter, period]);

  const totalSpent = useMemo(
    () => visibleExpenses.reduce((sum, item) => sum + item.amount, 0),
    [visibleExpenses]
  );

  const monthSpent = useMemo(
    () => expenses
      .filter(item => item.date.slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );

  const categoryTotals = useMemo(
    () => categories
      .map(category => ({
        category,
        total: expenses
          .filter(item => item.category === category)
          .reduce((sum, item) => sum + item.amount, 0),
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total),
    [expenses]
  );

  const addExpense = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) return;

    const next: Expense = {
      id: Date.now(),
      title: form.title.trim(),
      category: form.category,
      amount,
      date: form.date,
      payment: form.payment,
    };

    setExpenses(current => [next, ...current]);

    setForm({
      title: '',
      category: 'Food & Dining',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      payment: 'Debit card',
    });

    setShowForm(false);
  }, [form]);

  const removeExpense = useCallback((id: number) => {
    setExpenses(current => current.filter(item => item.id !== id));
  }, []);

  const exportCsv = useCallback(() => {
    const rows = [
      ['Description', 'Category', 'Amount (NGN)', 'Date', 'Payment'],
      ...visibleExpenses.map(item => [
        item.title, item.category, String(item.amount), item.date, item.payment,
      ]),
    ];

    const csv = rows
      .map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-expenses.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [visibleExpenses]);

  const maxCategory = Math.max(...categoryTotals.map(item => item.total), 1);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Ledger home">
          <span className="brand-mark"><Wallet size={19} /></span>
          <span>ledger<span className="brand-light">ly</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="side-nav">
          <a className="nav-link active" href="#"><ChartNoAxesCombined size={18} /> Overview</a>
          <a className="nav-link" href="#transactions"><CreditCard size={18} /> Transactions</a>
          <a className="nav-link" href="#insights"><ChartNoAxesCombined size={18} /> Reports</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={18} /></div>
            <strong>Need a hand?</strong>
            <p>Keep your finances clear and in control.</p>
            <a href="mailto:hello@ledgerly.example">Visit help centre ↗</a>
          </div>

          <button className="profile-row">
            <div className="avatar">AD</div>
            <span><strong>Adamu Divine</strong><small>Personal account</small></span>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="top-actions">
            <span className="status-dot"></span>
            <span className="sync-label">{loading ? 'Connecting…' : 'All changes saved'}</span>
            <button className="icon-button" aria-label="Settings"><Settings2 size={19} /></button>
            <div className="avatar small-avatar">AD</div>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">PERSONAL FINANCE</div>
            <h1>Expense <em>overview</em></h1>
            <p>Track your spending and see where your money goes.</p>
          </div>
          <button className="primary-button" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add expense
          </button>
        </section>

        <section className="summary-grid" aria-label="Expense summary">
          <article className="summary-card main-summary">
            <div className="summary-top">
              <span>Total spent this month</span>
              <span className="summary-icon"><Wallet size={18} /></span>
            </div>
            <div className="summary-amount">{money(monthSpent)}</div>
            <div className="summary-foot">
              <span className="trend neutral"><ArrowDownLeft size={14} /> Live total</span>
              <span>Across {expenses.filter(item => item.date.slice(0, 7) === new Date().toISOString().slice(0, 7)).length} transactions</span>
            </div>
            <div className="summary-rule"></div>
            <div className="mini-bars">
              {Array.from({ length: 24 }, (_, index) => <i key={index}></i>)}
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-top">
              <span>Transactions</span>
              <span className="summary-icon pale"><CreditCard size={18} /></span>
            </div>
            <div className="summary-amount dark">{expenses.length}</div>
            <div className="summary-foot">
              <span className="trend positive"><ArrowUpRight size={14} /> Recorded</span>
              <span>All time</span>
            </div>
            <div className="summary-note">All recorded expenses.</div>
          </article>

          <article className="summary-card">
            <div className="summary-top">
              <span>Average expense</span>
              <span className="summary-icon pale"><CalendarDays size={18} /></span>
            </div>
            <div className="summary-amount dark">
              {money(expenses.length ? Math.round(expenses.reduce((sum, item) => sum + item.amount, 0) / expenses.length) : 0)}
            </div>
            <div className="summary-foot">
              <span className="trend neutral">Per transaction</span>
              <span>Based on all entries</span>
            </div>
            <div className="summary-note">Summary of your recorded spending.</div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel transactions-panel" id="transactions">
            <div className="panel-heading">
              <div><h2>Recent transactions</h2><p>{apiMessage}</p></div>
              <button className="text-button" onClick={exportCsv}><Download size={15} /> Export</button>
            </div>

            <div className="toolbar">
              <div className="search-box">
                <Search size={16} />
                <input
                  aria-label="Search expenses"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>

              <label className="select-wrap">
                <Filter size={15} />
                <select aria-label="Filter category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
                  <option>All categories</option>
                  {categories.map(category => <option key={category}>{category}</option>)}
                </select>
                <ChevronDown size={14} />
              </label>

              <label className="select-wrap period-select">
                <select aria-label="Filter period" value={period} onChange={event => setPeriod(event.target.value)}>
                  <option>This month</option>
                  <option>All time</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>DESCRIPTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th></th></tr>
                </thead>
                <tbody>
                  {visibleExpenses.map(item => {
                    const Icon = categoryIcons[item.category] || BriefcaseBusiness;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="transaction-name">
                            <span className="category-icon"><Icon size={17} /></span>
                            <span><strong>{item.title}</strong><small>{item.payment}</small></span>
                          </div>
                        </td>
                        <td><span className="category-pill">{item.category}</span></td>
                        <td className="date-cell">
                          {new Date(item.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="amount-cell">−{money(item.amount)}</td>
                        <td>
                          <button className="delete-button" aria-label={'Delete ' + item.title} onClick={() => removeExpense(item.id)}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {visibleExpenses.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">No expenses found. Try changing your filters or add a new expense.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>Showing {visibleExpenses.length} of {expenses.length} transactions</span>
              <span className="total-visible">Filtered total <strong>{money(totalSpent)}</strong></span>
            </div>
          </article>

          <aside className="panel insights-panel" id="insights">
            <div className="panel-heading">
              <div><h2>Spending breakdown</h2><p>Where your money goes</p></div>
              <button className="more-button" aria-label="More insights"><MoreHorizontal size={19} /></button>
            </div>

            <div className="breakdown-total">
              <span>Total recorded</span>
              <strong>{money(expenses.reduce((sum, item) => sum + item.amount, 0))}</strong>
            </div>

            <div className="breakdown-bars">
              {categoryTotals.length ? (
                categoryTotals.slice(0, 5).map(item => {
                  const Icon = categoryIcons[item.category] || BriefcaseBusiness;
                  return (
                    <div className="breakdown-item" key={item.category}>
                      <div className="breakdown-label">
                        <span><Icon size={15} /> {item.category}</span>
                        <strong>{money(item.total)}</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: (item.total / maxCategory) * 100 + '%' }} />
                      </div>
                    </div>
                  );
                })
              ) : <p className="empty-insight">Add expenses to see your spending breakdown.</p>}
            </div>

            <div className="insight-tip">
              <span className="tip-spark">✳</span>
              <div><strong>Spending reminder</strong><p>Check your transactions regularly to keep your records up to date.</p></div>
            </div>
          </aside>
        </section>

        <footer className="footer">
          <span>© 2026 Ledgerly · Expense Tracker</span>
          <span>Personal expense record <span className="footer-heart">♥</span></span>
        </footer>
      </main>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget) setShowForm(false);
        }}>
          <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">NEW TRANSACTION</div>
                <h2 id="modal-title">Add an expense</h2>
                <p>Enter the details below.</p>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><X size={20} /></button>
            </div>

            <form onSubmit={addExpense}>
              <label>
                Description
                <input
                  ref={titleRef}
                  required
                  maxLength={70}
                  placeholder="e.g. Lunch at work"
                  value={form.title}
                  onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                />
              </label>

              <div className="form-row">
                <label>
                  Amount (₦)
                  <input
                    required min="1" step="1" type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={event => setForm(current => ({ ...current, amount: event.target.value }))}
                  />
                </label>
                <label>
                  Category
                  <select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))}>
                    {categories.map(category => <option key={category}>{category}</option>)}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Date
                  <input type="date" required value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} />
                </label>
                <label>
                  Payment method
                  <select value={form.payment} onChange={event => setForm(current => ({ ...current, payment: event.target.value }))}>
                    <option>Debit card</option>
                    <option>Transfer</option>
                    <option>Cash</option>
                    <option>USSD</option>
                  </select>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="primary-button"><Plus size={17} /> Save expense</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
