import { useState, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DataChart, ChartHandle } from './components/Chart';
import { ChartConfig, ChartNote, DataPoint } from './types';
import { BarChart3, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const DEFAULT_DATA: DataPoint[] = [
  { date: '2023-01-01', total: 120 },
  { date: '2023-02-01', total: 150 },
  { date: '2023-03-01', total: 180 },
  { date: '2023-04-01', total: 140 },
  { date: '2023-05-01', total: 200 },
  { date: '2023-06-01', total: 250 },
  { date: '2023-07-01', total: 220 },
  { date: '2023-08-01', total: 280 },
  { date: '2023-09-01', total: 310 },
  { date: '2023-10-01', total: 290 },
  { date: '2023-11-01', total: 350 },
  { date: '2023-12-01', total: 400 },
  { date: '2024-01-01', total: 380 },
  { date: '2024-02-01', total: 420 },
  { date: '2024-03-01', total: 450 },
];

export default function App() {
  const [data, setData] = useState<DataPoint[]>(DEFAULT_DATA);
  const [notes, setNotes] = useState<ChartNote[]>([
    { id: '1', date: '2023-06-01', label: 'Product Launch', colorChange: '#185FA5' }
  ]);
  const [config, setConfig] = useState<ChartConfig>({
    title: 'Monthly Performance',
    yAxisTitle: 'Values',
    movingAverageColor: '#9FE1CB',
    chartBackgroundColor: '#ffffff',
    datasets: [{ key: 'total', label: 'Total', color: '#185FA5' }],
    stacked: false,
    stackedKeys: ['total'],
    overlap: false,
    useGradient: true,
    valueBasedGradient: false,
    showMovingAverage: true,
    movingAveragePeriod: 7,
  });

  const chartRef = useRef<ChartHandle>(null);
  const availableDates = data.map(d => d.date);

  // KPI Calculations
  const getPointTotal = (p: DataPoint | undefined) => {
    if (!p) return 0;
    return config.datasets.reduce((sum, ds) => sum + (p[ds.key] || 0), 0);
  };
  
  const totalValue = data.length > 0 ? data.reduce((acc, curr) => acc + getPointTotal(curr), 0) : 0;
  const avgValue = data.length > 0 ? Math.round(totalValue / data.length) : 0;
  const peakPoint = data.length > 0 ? [...data].sort((a, b) => getPointTotal(b) - getPointTotal(a))[0] : null;
  const latestPoint = data.length > 0 ? data[data.length - 1] : null;
  const dateRange = data.length > 0 
    ? `${format(parseISO(data[0].date), 'MMM yyyy')} – ${format(parseISO(data[data.length - 1].date), 'MMM yyyy')}`
    : 'No data';

  return (
    <div className="flex h-screen min-h-0 min-w-0 bg-white text-gray-900 font-sans">
      <Sidebar 
        config={config}
        setConfig={setConfig}
        notes={notes}
        setNotes={setNotes}
        data={data}
        setData={setData}
        availableDates={availableDates}
        onExport={(format) => chartRef.current?.exportImage(format)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 min-h-0 min-w-0">
        <header className="h-16 border-b border-gray-200 bg-white px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#185FA5] rounded-lg text-white">
              <BarChart3 size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">AnalyticsChart</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1.5">
              <Info size={16} /> Documentation
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 p-6 md:p-10 overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-full space-y-8">
            {/* KPI Grid - Matching Reference Aesthetic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#f5f5f3] rounded-lg p-4 shadow-sm border border-gray-100">
                <div className="text-[12px] text-[#73726c] mb-1 font-medium">Total</div>
                <div className="text-[24px] font-semibold tracking-tight">{totalValue.toLocaleString()}</div>
                <div className="text-[11px] text-gray-400 mt-1">{dateRange}</div>
              </div>
              <div className="bg-[#f5f5f3] rounded-lg p-4 shadow-sm border border-gray-100">
                <div className="text-[12px] text-[#73726c] mb-1 font-medium">Monthly average</div>
                <div className="text-[24px] font-semibold tracking-tight">{avgValue.toLocaleString()}</div>
                <div className="text-[11px] text-gray-400 mt-1">units per month</div>
              </div>
              <div className="bg-[#f5f5f3] rounded-lg p-4 shadow-sm border border-gray-100">
                <div className="text-[12px] text-[#73726c] mb-1 font-medium">Peak month</div>
                <div className="text-[24px] font-semibold tracking-tight">{getPointTotal(peakPoint || undefined).toLocaleString()}</div>
                <div className="text-[11px] text-gray-400 mt-1">{peakPoint ? format(parseISO(peakPoint.date), 'MMM yyyy') : '-'}</div>
              </div>
              <div className="bg-[#f5f5f3] rounded-lg p-4 shadow-sm border border-gray-100">
                <div className="text-[12px] text-[#73726c] mb-1 font-medium">Latest month</div>
                <div className="text-[24px] font-semibold tracking-tight">{getPointTotal(latestPoint || undefined).toLocaleString()}</div>
                <div className="text-[11px] text-gray-400 mt-1">{latestPoint ? format(parseISO(latestPoint.date), 'MMM yyyy') : '-'}</div>
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-gray-800">{config.title}</h2>
              </div>
              <div className="w-full min-h-[360px] lg:min-h-[460px] min-w-0">
                <DataChart ref={chartRef} data={data} notes={notes} config={config} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

