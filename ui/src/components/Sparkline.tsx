interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export default function Sparkline({
  data,
  width = 60,
  height = 24,
  color = '#10b981',
  fillColor = 'rgba(16, 185, 129, 0.1)',
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className="opacity-20">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#3f3f46" strokeWidth="1" />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id={`gradient-${Math.random()}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
