import React, { useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Trash2, Flag } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { usePropertyListing } from '../../context/PropertyListingContext';
import { useRBAC } from '../../context/RBACContext';
import { useAuth } from '../../context/AuthContext';

const COLUMNS: Array<{ key: 'todo' | 'in_progress' | 'done'; label: string; icon: React.FC<{ className?: string }> }> =
  [
    { key: 'todo', label: 'To do', icon: Circle },
    { key: 'in_progress', label: 'In progress', icon: Clock },
    { key: 'done', label: 'Done', icon: CheckCircle2 },
  ];
const PRIORITY: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

/** Task board for caretakers and managers: assign, move across columns, mark done. */
export const TasksView: React.FC<{ showToast: (m: string) => void }> = ({ showToast }) => {
  const { ownerProperties } = usePropertyListing();
  const { employees } = useRBAC();
  const { isOwner, user } = useAuth();
  const canManage = isOwner || !!user?.permissions?.['customers.edit'];
  const tasks = useApiResource(() => ApiClient.operations.tasks(), [] as any[], { label: 'Could not load tasks' });
  const [draft, setDraft] = useState({
    title: '',
    propertyId: '',
    assigneeId: '',
    priority: 'medium',
    dueDate: '',
    category: 'other',
    description: '',
  });
  const [open, setOpen] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.operations.createTask({
        ...draft,
        propertyId: draft.propertyId || undefined,
        assigneeId: draft.assigneeId || undefined,
        dueDate: draft.dueDate || undefined,
      });
      setDraft({
        title: '',
        propertyId: '',
        assigneeId: '',
        priority: 'medium',
        dueDate: '',
        category: 'other',
        description: '',
      });
      setOpen(false);
      showToast('Task created');
      await tasks.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create task');
    }
  };

  const move = async (id: string, status: string) => {
    try {
      await ApiClient.operations.updateTask(id, { status });
      await tasks.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update task');
    }
  };

  const input =
    'w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">Tasks</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Cleaning, maintenance, collections and visits — assigned to your staff.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-[#a3e635] font-black text-xs rounded-full flex items-center gap-1.5 cursor-pointer font-heading self-start"
        >
          <Plus className="w-3.5 h-3.5" /> New task
        </button>
      </div>

      {open && (
        <form
          onSubmit={create}
          className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          <div className="lg:col-span-3">
            <input
              aria-label="Task title"
              required
              placeholder="What needs doing?"
              className={input}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <select
            aria-label="Property"
            className={input}
            value={draft.propertyId}
            onChange={(e) => setDraft({ ...draft, propertyId: e.target.value })}
          >
            <option value="">Any property</option>
            {ownerProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Assignee"
            className={input}
            value={draft.assigneeId}
            onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {employees
              .filter((e) => e.status === 'active')
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
          <select
            aria-label="Priority"
            className={input}
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <select
            aria-label="Category"
            className={input}
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            {['cleaning', 'maintenance', 'collection', 'visit', 'inspection', 'other'].map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <input
            aria-label="Due date"
            type="date"
            className={input}
            value={draft.dueDate}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
          />
          <button
            type="submit"
            className="h-10 rounded-xl bg-[#a3e635] text-slate-950 text-xs font-black font-heading cursor-pointer"
          >
            Create
          </button>
        </form>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = tasks.data.filter((t) => t.status === col.key);
          return (
            <section
              key={col.key}
              aria-label={col.label}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-3 space-y-2 min-h-40"
            >
              <h2 className="text-xs font-black font-heading text-slate-700 flex items-center gap-2 px-1">
                <col.icon className="w-3.5 h-3.5" /> {col.label} <span className="text-slate-400">{items.length}</span>
              </h2>
              {items.map((t) => (
                <article key={t.id} className="bg-white rounded-xl border border-slate-200 p-3 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${PRIORITY[t.priority]}`}>
                      <Flag className="w-2.5 h-2.5 inline mr-0.5" />
                      {t.priority}
                    </span>
                    <div className="font-bold text-slate-900 flex-1">{t.title}</div>
                  </div>
                  <div className="text-slate-500">
                    {[
                      t.propertyName,
                      t.assigneeName ? `→ ${t.assigneeName}` : 'Unassigned',
                      t.dueDate ? `due ${t.dueDate}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="flex items-center gap-1">
                    {col.key !== 'todo' && (
                      <button
                        type="button"
                        onClick={() => move(t.id, col.key === 'done' ? 'in_progress' : 'todo')}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold cursor-pointer hover:bg-slate-50"
                      >
                        ← Back
                      </button>
                    )}
                    {col.key !== 'done' && (
                      <button
                        type="button"
                        onClick={() => move(t.id, col.key === 'todo' ? 'in_progress' : 'done')}
                        className="px-2 py-1 rounded-lg bg-slate-900 text-[#a3e635] text-[10px] font-black cursor-pointer"
                      >
                        {col.key === 'todo' ? 'Start' : 'Mark done'} →
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        aria-label={`Delete task ${t.title}`}
                        onClick={() => ApiClient.operations.deleteTask(t.id).then(() => tasks.reload())}
                        className="ml-auto p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {items.length === 0 && <div className="text-[11px] text-slate-400 px-1">Nothing here.</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
};
