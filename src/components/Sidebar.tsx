import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  Plus,
  Trash2,
  Settings,
  Download,
  Edit2,
  Check,
  X,
  Layers,
  ChevronUp,
  ChevronDown,
  Palette,
  BarChart3,
  Table2,
  MessageSquare,
} from 'lucide-react';
import { ChartConfig, ChartNote, DataPoint, DatasetConfig } from '../types';
import { cn, parseCSVDate } from '../lib/utils';

interface SidebarProps {
  config: ChartConfig;
  setConfig: (config: ChartConfig) => void;
  notes: ChartNote[];
  setNotes: (notes: ChartNote[]) => void;
  data: DataPoint[];
  setData: (data: DataPoint[]) => void;
  availableDates: string[];
  onExport: (format: 'png' | 'jpeg') => void;
}

const PRESET_COLORS = ['#185FA5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type SectionId = 'export' | 'import' | 'appearance' | 'series' | 'display' | 'data' | 'notes';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        disabled
          ? 'cursor-not-allowed border-slate-100 bg-slate-50/50 opacity-60'
          : 'border-slate-100 bg-slate-50/90 hover:border-slate-200 hover:bg-slate-50'
      )}
    >
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {help ? <p className="mt-0.5 text-xs leading-snug text-slate-500">{help}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/30"
      />
    </label>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
  contentClassName,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/90"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon size={16} strokeWidth={2} />
          </span>
          {title}
        </span>
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="border-t border-slate-100 p-4">
          <div
            className={cn(
              'space-y-4 max-h-[20rem] overflow-y-auto pr-1',
              contentClassName
            )}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20';

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  setConfig,
  notes,
  setNotes,
  data,
  setData,
  availableDates,
  onExport,
}) => {
  const [newNote, setNewNote] = useState({ date: '', label: '', colorChange: '' });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ChartNote | null>(null);

  const [openSection, setOpenSection] = useState<Record<SectionId, boolean>>({
    export: true,
    import: true,
    appearance: true,
    series: true,
    display: true,
    data: false,
    notes: true,
  });

  const toggleSection = (id: SectionId) => {
    setOpenSection((s) => ({ ...s, [id]: !s[id] }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) return;

        const headers = Object.keys(results.data[0] as object);
        const dateKey = headers.find((h) => h.toLowerCase() === 'date') || headers[0];
        const valueKeys = headers.filter((h) => h !== dateKey && h.toLowerCase() !== 'total');

        const keysToUse =
          valueKeys.length > 0 ? valueKeys : [headers.find((h) => h.toLowerCase() === 'total') || headers[1]];

        const parsedData: DataPoint[] = (results.data as any[])
          .map((row: any) => {
            const point: DataPoint = { date: parseCSVDate(row[dateKey]) };
            keysToUse.forEach((key) => {
              point[key] = parseFloat(row[key]) || 0;
            });
            return point;
          })
          .filter((d) => d.date && d.date !== 'Invalid Date')
          .sort((a, b) => a.date.localeCompare(b.date));

        if (parsedData.length > 0) {
          setData(parsedData);

          const newDatasets: DatasetConfig[] = keysToUse.map((key, i) => ({
            key,
            label: key,
            color: PRESET_COLORS[i % PRESET_COLORS.length],
          }));

          setConfig({
            ...config,
            datasets: newDatasets,
            stackedKeys: keysToUse,
          });
          setOpenSection((s) => ({ ...s, data: true }));
        }
      },
    });
  };

  const toggleStackedKey = (key: string) => {
    const newKeys = config.stackedKeys.includes(key)
      ? config.stackedKeys.filter((k) => k !== key)
      : [...config.stackedKeys, key];
    setConfig({ ...config, stackedKeys: newKeys });
  };

  const moveDataset = (index: number, direction: 'up' | 'down') => {
    const newDatasets = [...config.datasets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newDatasets.length) return;

    const temp = newDatasets[index];
    newDatasets[index] = newDatasets[targetIndex];
    newDatasets[targetIndex] = temp;

    setConfig({ ...config, datasets: newDatasets });
  };

  const addNote = () => {
    if (!newNote.date || !newNote.label) return;
    setNotes([...notes, { ...newNote, id: Math.random().toString(36).substr(2, 9) }]);
    setNewNote({ date: '', label: '', colorChange: '' });
  };

  const startEditing = (note: ChartNote) => {
    setEditingNoteId(note.id);
    setEditForm({ ...note });
  };

  const saveEdit = () => {
    if (editForm) {
      setNotes(notes.map((n) => (n.id === editForm.id ? editForm : n)));
      setEditingNoteId(null);
      setEditForm(null);
    }
  };

  const removeNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  const updateDatasetColor = (key: string, color: string) => {
    setConfig({
      ...config,
      datasets: config.datasets.map((ds) => (ds.key === key ? { ...ds, color } : ds)),
    });
  };

  const updateDataCell = (rowIndex: number, key: string, value: string) => {
    const nextData = [...data];
    const row = { ...nextData[rowIndex] };
    if (key === 'date') {
      row.date = parseCSVDate(value);
    } else {
      row[key] = parseFloat(value) || 0;
    }
    nextData[rowIndex] = row;
    setData(nextData);
  };

  return (
    <aside className="flex h-full w-[min(100vw-2rem,20rem)] shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/90">
      <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 backdrop-blur-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Configure</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">Chart & data</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 pb-8">
        <CollapsibleSection
          title="Export"
          icon={Download}
          open={openSection.export}
          onToggle={() => toggleSection('export')}
        >
          <p className="text-xs text-slate-500">Download the current chart as an image.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onExport('png')}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => onExport('jpeg')}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              JPG
            </button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Import data"
          icon={Upload}
          open={openSection.import}
          onToggle={() => toggleSection('import')}
        >
          <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 transition-colors hover:border-[#185FA5]/40 hover:bg-[#185FA5]/[0.03]">
            <Upload className="mb-2 h-9 w-9 text-slate-400 transition-colors group-hover:text-[#185FA5]" />
            <p className="text-center text-sm font-medium text-slate-700">
              <span className="text-[#185FA5]">Choose a CSV</span>
              <span className="text-slate-500"> or drop it here</span>
            </p>
            <p className="mt-1 text-center text-xs text-slate-400">Columns: Date, then value columns</p>
            <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
          </label>
        </CollapsibleSection>

        <CollapsibleSection
          title="Titles & appearance"
          icon={Palette}
          open={openSection.appearance}
          onToggle={() => toggleSection('appearance')}
        >
          <Field label="Chart title">
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Y-axis label">
            <input
              type="text"
              value={config.yAxisTitle}
              onChange={(e) => setConfig({ ...config, yAxisTitle: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5">
            <span className="text-sm font-medium text-slate-800">Plot background</span>
            <input
              type="color"
              value={config.chartBackgroundColor}
              onChange={(e) => setConfig({ ...config, chartBackgroundColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
              title="Chart background color"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Series"
          icon={BarChart3}
          open={openSection.series}
          onToggle={() => toggleSection('series')}
        >
          <div className="space-y-2">
            {config.datasets.map((ds, index) => (
              <div
                key={ds.key}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveDataset(index, 'up')}
                        disabled={index === 0}
                        className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-[#185FA5] disabled:opacity-25"
                        aria-label="Move series up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDataset(index, 'down')}
                        disabled={index === config.datasets.length - 1}
                        className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-[#185FA5] disabled:opacity-25"
                        aria-label="Move series down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <span className="truncate text-sm font-medium text-slate-800">{ds.label}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {config.stacked ? (
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <input
                          type="checkbox"
                          checked={config.stackedKeys.includes(ds.key)}
                          onChange={() => toggleStackedKey(ds.key)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#185FA5]"
                        />
                        Stack
                      </label>
                    ) : null}
                    <input
                      type="color"
                      value={ds.color}
                      onChange={(e) => updateDatasetColor(ds.key, e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
                      title={`Color for ${ds.label}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Display options"
          icon={Settings}
          open={openSection.display}
          onToggle={() => toggleSection('display')}
        >
          <ToggleRow
            label="Stacked bars"
            help="Sum series into one bar per period."
            checked={config.stacked}
            onChange={(v) =>
              setConfig({ ...config, stacked: v, overlap: v ? false : config.overlap })
            }
          />
          <ToggleRow
            label="Overlap bars"
            help="Draw series on top of each other (not stacked)."
            checked={config.overlap}
            onChange={(v) =>
              setConfig({ ...config, overlap: v, stacked: v ? false : config.stacked })
            }
          />
          <ToggleRow
            label="Value-based gradient"
            help="Opacity varies by bar height."
            checked={config.valueBasedGradient}
            onChange={(v) => setConfig({ ...config, valueBasedGradient: v })}
          />
          <ToggleRow
            label="Area gradient"
            help="Vertical gradient fill on bars."
            checked={config.useGradient}
            disabled={config.valueBasedGradient}
            onChange={(v) => setConfig({ ...config, useGradient: v })}
          />
          <ToggleRow
            label="Moving average line"
            help="Trend line over the primary or stacked total."
            checked={config.showMovingAverage}
            onChange={(v) => setConfig({ ...config, showMovingAverage: v })}
          />
          {config.showMovingAverage ? (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <Field label="Window (months)">
                <input
                  type="number"
                  min={1}
                  value={config.movingAveragePeriod}
                  onChange={(e) =>
                    setConfig({ ...config, movingAveragePeriod: parseInt(e.target.value, 10) || 1 })
                  }
                  className={inputClass}
                />
              </Field>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">Line color</span>
                <input
                  type="color"
                  value={config.movingAverageColor}
                  onChange={(e) => setConfig({ ...config, movingAverageColor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
                />
              </div>
            </div>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection
          title="Data editor"
          icon={Table2}
          open={openSection.data}
          onToggle={() => toggleSection('data')}
          contentClassName="max-h-[24rem]"
        >
          <p className="text-xs leading-relaxed text-slate-500">
            Edit values inline. Changes apply immediately; no need to re-upload the CSV.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm">
                  <tr>
                    <th className="min-w-[112px] px-2.5 py-2.5 text-left font-semibold text-slate-600">Date</th>
                    {config.datasets.map((ds) => (
                      <th key={ds.key} className="min-w-[88px] px-2.5 py-2.5 text-left font-semibold text-slate-600">
                        {ds.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr
                      key={`${row.date}-${rowIndex}`}
                      className="border-t border-slate-100 odd:bg-white even:bg-slate-50/50"
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={row.date}
                          onChange={(e) => updateDataCell(rowIndex, 'date', e.target.value)}
                          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-mono text-[11px] text-slate-800 hover:border-slate-200 focus:border-[#185FA5] focus:outline-none focus:ring-1 focus:ring-[#185FA5]/30"
                        />
                      </td>
                      {config.datasets.map((ds) => (
                        <td key={ds.key} className="px-2 py-1.5">
                          <input
                            type="number"
                            step="any"
                            value={row[ds.key] ?? 0}
                            onChange={(e) => updateDataCell(rowIndex, ds.key, e.target.value)}
                            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-right font-mono text-[11px] text-slate-800 tabular-nums hover:border-slate-200 focus:border-[#185FA5] focus:outline-none focus:ring-1 focus:ring-[#185FA5]/30"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Annotations"
          icon={MessageSquare}
          open={openSection.notes}
          onToggle={() => toggleSection('notes')}
          contentClassName="max-h-[24rem]"
        >
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <select
              value={newNote.date}
              onChange={(e) => setNewNote({ ...newNote, date: e.target.value })}
              className={inputClass}
            >
              <option value="">Select a date</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Label (e.g. product launch)"
              value={newNote.label}
              onChange={(e) => setNewNote({ ...newNote, label: e.target.value })}
              className={inputClass}
            />
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <label htmlFor="colorChangeToggle" className="text-sm font-medium text-slate-700">
                Tint bars after this date
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="colorChangeToggle"
                  type="checkbox"
                  checked={!!newNote.colorChange}
                  onChange={(e) => setNewNote({ ...newNote, colorChange: e.target.checked ? '#185FA5' : '' })}
                  className="h-4 w-4 rounded border-slate-300 text-[#185FA5] focus:ring-[#185FA5]/30"
                />
                {newNote.colorChange ? (
                  <input
                    type="color"
                    value={newNote.colorChange}
                    onChange={(e) => setNewNote({ ...newNote, colorChange: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5"
                  />
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={addNote}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#185FA5] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#144a84]"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add annotation
            </button>
          </div>

          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm?.label}
                      onChange={(e) => setEditForm({ ...editForm!, label: e.target.value })}
                      className={inputClass}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={!!editForm?.colorChange}
                          onChange={(e) =>
                            setEditForm({ ...editForm!, colorChange: e.target.checked ? '#185FA5' : '' })
                          }
                          className="h-3.5 w-3.5 rounded"
                        />
                        Tint
                        {editForm?.colorChange ? (
                          <input
                            type="color"
                            value={editForm.colorChange}
                            onChange={(e) => setEditForm({ ...editForm!, colorChange: e.target.value })}
                            className="h-6 w-8 cursor-pointer rounded border border-slate-200 p-0"
                          />
                        ) : null}
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                          aria-label="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                          aria-label="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{note.label}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">{note.date}</p>
                    </div>
                    <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEditing(note)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#185FA5]"
                        aria-label="Edit annotation"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeNote(note.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove annotation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </aside>
  );
};
