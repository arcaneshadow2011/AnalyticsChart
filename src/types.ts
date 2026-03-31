export interface DataPoint {
  date: string;
  [key: string]: any;
}

export interface DatasetConfig {
  key: string;
  label: string;
  color: string;
}

export interface ChartNote {
  id: string;
  date: string;
  label: string;
  colorChange?: string;
}

export interface ChartConfig {
  title: string;
  datasets: DatasetConfig[];
  stacked: boolean;
  stackedKeys: string[];
  overlap: boolean;
  useGradient: boolean;
  valueBasedGradient: boolean;
  showMovingAverage: boolean;
  movingAveragePeriod: number;
}
