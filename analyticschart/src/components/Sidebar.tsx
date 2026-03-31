import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, Plus, Trash2, Settings, Download, Edit2, Check, X, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { ChartConfig, ChartNote, DataPoint, DatasetConfig } from '../types';
import { cn, parseCSVDate } from '../lib/utils';

interface SidebarProps {
  config: ChartConfig;
  setConfig: (config: ChartConfig) => void;
  notes: ChartNote[];
  setNotes: (notes: ChartNote[]) => void;
  setData: (data: DataPoint[]) => void;
  availableDates: string[];
  onExport: (format: 'png' | 'jpeg') => void;
}

const PRESET_COLORS = ['#185FA5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  setConfig,
  notes,
  setNotes,
  setData,
  availableDates,
  onExport,
}) => {
  const [newNote, setNewNote] = useState({ date: '', label: '', colorChange: '' });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ChartNote | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) return;
        
        const headers = Object.keys(results.data[0]);
        const dateKey = headers.find(h => h.toLowerCase() === 'date') || headers[0];
        const valueKeys = headers.filter(h => h !== dateKey && h.toLowerCase() !== 'total');
        
        // If no specific value keys found (like just Date and Total), use Total
        const keysToUse = valueKeys.length > 0 ? valueKeys : [headers.find(h => h.toLowerCase() === 'total') || headers[1]];

        const parsedData: DataPoint[] = results.data
          .map((row: any) => {
            const point: DataPoint = { date: parseCSVDate(row[dateKey]) };
            keysToUse.forEach(key => {
              point[key] = parseFloat(row[key]) || 0;
            });
            return point;
          })
          .filter((d) => d.date && d.date !== 'Invalid Date')
          .sort((a, b) => a.date.localeCompare(b.date));

        if (parsedData.length > 0) {
          setData(parsedData);
          
          // Auto-configure datasets based on found keys
          const newDatasets: DatasetConfig[] = keysToUse.map((key, i) => ({
            key,
            label: key,
            color: PRESET_COLORS[i % PRESET_COLORS.length]
          }));
          
          setConfig({
            ...config,
            datasets: newDatasets,
            stackedKeys: keysToUse // Default all to stacked if stacked is enabled
          });
        }
      },
    });
  };

  const toggleStackedKey = (key: string) => {
    const newKeys = config.stackedKeys.includes(key)
      ? config.stackedKeys.filter(k => k !== key)
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
      setNotes(notes.map(n => n.id === editForm.id ? editForm : n));
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
      datasets: config.datasets.map(ds => ds.key === key ? { ...ds, color } : ds)
    });
  };

  return (
    <div className="w-80 h-full bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto flex flex-col gap-8">
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
          <Download size={14} /> Export Chart
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => onExport('png')}
            className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            PNG
          </button>
          <button 
            onClick={() => onExport('jpeg')}
            className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            JPG
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
          <Upload size={14} /> Data Import
        </h2>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span>
            </p>
            <p className="text-xs text-gray-400">CSV (Date, iOS, Android...)</p>
          </div>
          <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
        </label>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
          <Settings size={14} /> Chart Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chart Title</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Datasets</label>
            {config.datasets.map((ds, index) => (
              <div key={ds.key} className="flex flex-col gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <button 
                        onClick={() => moveDataset(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-gray-400 hover:text-blue-500 disabled:opacity-30"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button 
                        onClick={() => moveDataset(index, 'down')}
                        disabled={index === config.datasets.length - 1}
                        className="p-0.5 text-gray-400 hover:text-blue-500 disabled:opacity-30"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <span className="text-xs font-medium truncate max-w-[100px]">{ds.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.stacked && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">Stack</span>
                        <input 
                          type="checkbox"
                          checked={config.stackedKeys.includes(ds.key)}
                          onChange={() => toggleStackedKey(ds.key)}
                          className="w-3 h-3"
                        />
                      </div>
                    )}
                    <input 
                      type="color" 
                      value={ds.color} 
                      onChange={(e) => updateDatasetColor(ds.key, e.target.value)}
                      className="w-6 h-6 p-0.5 bg-white border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Layers size={14} /> Stacked
            </label>
            <input
              type="checkbox"
              checked={config.stacked}
              onChange={(e) => setConfig({ ...config, stacked: e.target.checked, overlap: e.target.checked ? false : config.overlap })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Layers size={14} className="rotate-90" /> Overlap Bars
            </label>
            <input
              type="checkbox"
              checked={config.overlap}
              onChange={(e) => setConfig({ ...config, overlap: e.target.checked, stacked: e.target.checked ? false : config.stacked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Value-based Gradient</label>
            <input
              type="checkbox"
              checked={config.valueBasedGradient}
              onChange={(e) => setConfig({ ...config, valueBasedGradient: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
          {!config.valueBasedGradient && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Area Gradient</label>
              <input
                type="checkbox"
                checked={config.useGradient}
                onChange={(e) => setConfig({ ...config, useGradient: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Show Moving Avg</label>
            <input
              type="checkbox"
              checked={config.showMovingAverage}
              onChange={(e) => setConfig({ ...config, showMovingAverage: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
          {config.showMovingAverage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MA Period (Months)</label>
              <input
                type="number"
                value={config.movingAveragePeriod}
                onChange={(e) => setConfig({ ...config, movingAveragePeriod: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
        </div>
      </section>

      <section className="flex-1 pb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
          <Plus size={14} /> Annotations & Events
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
            <select
              value={newNote.date}
              onChange={(e) => setNewNote({ ...newNote, date: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
            >
              <option value="">Select Date</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Event Label"
              value={newNote.label}
              onChange={(e) => setNewNote({ ...newNote, label: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
            />
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="colorChangeToggle"
                  checked={!!newNote.colorChange}
                  onChange={(e) => setNewNote({ ...newNote, colorChange: e.target.checked ? '#185FA5' : '' })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="colorChangeToggle" className="text-xs font-medium text-gray-700">Change color?</label>
              </div>
              {newNote.colorChange && (
                <input
                  type="color"
                  value={newNote.colorChange}
                  onChange={(e) => setNewNote({ ...newNote, colorChange: e.target.value })}
                  className="w-6 h-6 p-0.5 bg-white border border-gray-300 rounded cursor-pointer"
                />
              )}
            </div>
            <button
              onClick={addNote}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Note
            </button>
          </div>

          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="p-3 bg-white border border-gray-200 rounded-lg group">
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm?.label}
                      onChange={(e) => setEditForm({ ...editForm!, label: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={!!editForm?.colorChange}
                          onChange={(e) => setEditForm({ ...editForm!, colorChange: e.target.checked ? '#185FA5' : '' })}
                          className="w-3 h-3"
                        />
                        <span className="text-[10px] text-gray-500">Color?</span>
                        {editForm?.colorChange && (
                          <input
                            type="color"
                            value={editForm.colorChange}
                            onChange={(e) => setEditForm({ ...editForm!, colorChange: e.target.value })}
                            className="w-4 h-4 p-0"
                          />
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14}/></button>
                        <button onClick={() => setEditingNoteId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><X size={14}/></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold truncate">{note.label}</p>
                      <p className="text-[10px] text-gray-400">{note.date}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(note)}
                        className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => removeNote(note.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
