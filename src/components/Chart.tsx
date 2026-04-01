import React, { useMemo, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import { format, parseISO } from 'date-fns';
import { DataPoint, ChartNote, ChartConfig } from '../types';
import { calculateMovingAverage, getGradient, adjustColorOpacity } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

interface ChartProps {
  data: DataPoint[];
  notes: ChartNote[];
  config: ChartConfig;
}

export interface ChartHandle {
  exportImage: (format: 'png' | 'jpeg') => void;
}

export const DataChart = forwardRef<ChartHandle, ChartProps>(({ data, notes, config }, ref) => {
  const chartRef = useRef<any>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => chartRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useImperativeHandle(ref, () => ({
    exportImage: (imageFormat: 'png' | 'jpeg') => {
      if (chartRef.current) {
        const link = document.createElement('a');
        link.download = `chart-${new Date().getTime()}.${imageFormat}`;
        link.href = chartRef.current.toBase64Image(imageFormat, 1);
        link.click();
      }
    },
  }));

  const chartData: ChartData<'bar' | 'line'> = useMemo(() => {
    const labels = data.map((d) => {
      try {
        return format(parseISO(d.date), 'MMM-yy');
      } catch (e) {
        return d.date;
      }
    });

    const sortedNotes = [...notes].sort((a, b) => a.date.localeCompare(b.date));

    const datasets: any[] = config.datasets.map((dsConfig, dsIndex) => {
      const values = data.map((d) => d[dsConfig.key] || 0);
      const maxValue = values.length > 0 ? Math.max(...values) : 0;

      const backgroundColors = data.map((d) => {
        let currentColor = dsConfig.color;
        let isNoteColor = false;
        for (const note of sortedNotes) {
          if (d.date >= note.date && note.colorChange) {
            currentColor = note.colorChange;
            isNoteColor = true;
          }
        }

        // Intelligent opacity for multi-dataset notes
        if (isNoteColor && config.datasets.length > 1) {
          const opacityStep = config.datasets.length > 1 ? 0.7 / (config.datasets.length - 1) : 0;
          const opacity = 1.0 - (dsIndex * opacityStep);
          currentColor = adjustColorOpacity(currentColor, opacity);
        }

        if (config.valueBasedGradient) {
          const val = d[dsConfig.key] || 0;
          const ratio = val / (maxValue || 1);
          const opacity = 0.2 + (ratio * 0.8);
          return adjustColorOpacity(currentColor, opacity);
        }

        return currentColor;
      });

      const isStacked = config.stacked && config.stackedKeys.includes(dsConfig.key);

      return {
        type: 'bar' as const,
        label: dsConfig.label,
        data: values,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          const color = backgroundColors[context.dataIndex] || dsConfig.color;
          
          if (!chartArea || !config.useGradient || config.valueBasedGradient) return color;
          try {
            return getGradient(ctx, chartArea, color);
          } catch (e) {
            return color;
          }
        },
        borderRadius: 2,
        borderWidth: 0,
        order: 2,
        // Use a common stack ID for items that should stack
        stack: isStacked ? 'stacked-group' : `unstacked-${dsConfig.key}`,
        // Overlap logic: grouped=false makes bars overlap at the same x-position
        grouped: !config.overlap,
        barPercentage: config.overlap ? 0.8 : 0.9,
        categoryPercentage: config.overlap ? 0.8 : 0.9,
      };
    });

    if (config.showMovingAverage && config.datasets.length > 0) {
      const primaryDs = config.datasets[0];
      const values = data.map((d) => {
        if (config.stacked) {
          // Calculate total of stacked items for MA
          return config.stackedKeys.reduce((sum, key) => sum + (d[key] || 0), 0);
        }
        return d[primaryDs.key] || 0;
      });
      
      const movingAverage = calculateMovingAverage(values, config.movingAveragePeriod);

      datasets.push({
        type: 'line' as const,
        label: `${config.movingAveragePeriod}-month avg`,
        data: movingAverage,
        borderColor: config.movingAverageColor,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: false,
        order: 1,
        spanGaps: true,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [data, notes, config]);

  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.1,
    layout: {
      padding: {
        top: notes.length > 0 ? 28 : 8,
      },
    },
    plugins: {
      title: {
        display: true,
        text: config.title,
        align: 'center',
        font: { size: 18, weight: 'bold' },
        padding: { top: 10, bottom: 20 },
        color: '#1f2937',
      },
      legend: {
        display: config.datasets.length + (config.showMovingAverage ? 1 : 0) > 1,
        position: 'top',
        align: 'center',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { size: 11 },
          generateLabels: (chart) => {
            const defaultLabels = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
            return defaultLabels.map((label) => {
              const dataset = chart.data.datasets[label.datasetIndex];
              if (dataset?.type === 'line') {
                return {
                  ...label,
                  pointStyle: 'line',
                };
              }
              return label;
            });
          },
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      },
      annotation: {
        annotations: notes.reduce((acc, note, noteIndex) => {
          const dataIndex = data.findIndex((d) => d.date === note.date);
          if (dataIndex === -1) return acc;

          acc[`note-${note.id}`] = {
            type: 'line',
            xMin: dataIndex,
            xMax: dataIndex,
            borderColor: 'rgba(115, 114, 108, 0.55)',
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
              display: true,
              content: note.label,
              position: 'end',
              backgroundColor: 'rgba(245, 245, 243, 0.8)',
              color: 'rgba(55, 65, 81, 0.8)',
              font: { size: 11, weight: 'bold' },
              padding: { top: 5, bottom: 5, left: 8, right: 8 },
              borderRadius: 6,
              yAdjust: -6,
              xAdjust: noteIndex % 2 === 0 ? -6 : 6,
            },
          };
          return acc;
        }, {} as any),
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: { size: 10, family: 'sans-serif' },
          autoSkip: true,
          maxTicksLimit: 18,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f0f0f0',
        },
        ticks: {
          font: { size: 10, family: 'sans-serif' },
        },
        title: {
          display: true,
          text: config.yAxisTitle,
          font: { size: 12, weight: 'bold' },
          color: '#73726c',
        }
      },
    },
  };

  return (
    <div
      ref={chartContainerRef}
      className="relative w-full h-full min-h-[360px] min-w-0 p-6 rounded-xl border border-gray-100"
      style={{ backgroundColor: config.chartBackgroundColor }}
    >
      <Chart ref={chartRef} type="bar" data={chartData} options={options} />
    </div>
  );
});

DataChart.displayName = 'DataChart';
