"use client"

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ChartWidget } from '@/components/ChartWidget';
import { Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) {
        setLoading(false);
        return;
    }

    let pollingInterval: NodeJS.Timeout | null = null;
    let pollCount = 0;
    const MAX_POLLS = 30;

    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/status/${taskId}`);
        console.log("API Response:", response.data);
        
        if (response.data.status === 'SUCCESS') {
          // Stop polling when successful
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          
          // Check response structure
          const resultData = response.data.result;
          console.log("Result data:", resultData);
          
          // Could be result.data or result directly
          if (resultData && resultData.data) {
            setData(resultData.data);
          } else if (resultData) {
            setData(resultData);
          } else {
            setError("Invalid data from server");
          }
          setLoading(false);
        } else if (response.data.status === 'FAILURE') {
            if (pollingInterval) {
              clearInterval(pollingInterval);
            }
            setError(response.data.error || "Analysis failed with unknown error");
            setLoading(false);
        } else if (response.data.status === 'PENDING' || response.data.status === 'PROCESSING') {
            // Still processing, continue polling
            pollCount++;
            if (pollCount >= MAX_POLLS) {
              if (pollingInterval) {
                clearInterval(pollingInterval);
              }
              setError("Processing took too long. Please try again.");
              setLoading(false);
            }
            // Continue polling (already setup below)
        }
      } catch (error: any) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        console.error("Failed to fetch analysis data", error);
        setError(error.response?.data?.detail || error.message || "Failed to connect to server");
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchData();
    
    // Setup polling if no result yet
    pollingInterval = setInterval(() => {
      fetchData();
    }, 2000);

    // Cleanup
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [taskId]);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
            <div className="text-red-500 font-semibold text-xl">Analysis Failed</div>
            <div className="text-muted-foreground">{error}</div>
        </div>
    )
  }

  if (!data) {
    return <div className="p-12 text-center">No data found or analysis still processing.</div>;
  }

  // Debug: Log data to check
  console.log("Analytics Data:", data);
  console.log("Description keys:", data.description ? Object.keys(data.description) : "No description");
  console.log("Columns:", data.columns);

  // Create multiple chart types automatically based on data
  const chartOptions = [];

  // Check if data.description exists
  if (!data.description || typeof data.description !== 'object') {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">Analytics Report</h2>
          <div className="text-sm text-muted-foreground">
            File: {data.filename} | Rows: {data.rows} | Cols: {data.cols}
          </div>
        </div>
        <div className="text-center p-12 text-red-500">
          Error: Invalid description data. Cannot create charts.
          <pre className="mt-4 text-xs text-left overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    );
  }

  // Get list of numeric and categorical columns from description
  const numericCols = Object.keys(data.description || {}).filter(col => {
    const desc = data.description[col];
    return desc && typeof desc === 'object' && ('mean' in desc || 'count' in desc || '25%' in desc);
  });
  
  // Improve numeric column detection from preview data (if description doesn't detect them)
  const inferredNumericCols = data.columns.filter((col: string) => {
    if (numericCols.includes(col)) return true;
    if (!data.preview || data.preview.length === 0) return false;
    
    // Get sample of 10 values
    const sampleValues = data.preview.slice(0, 10).map((row: any) => row[col]);
    const validValues = sampleValues.filter((v: any) => v !== null && v !== undefined && v !== '');
    
    if (validValues.length === 0) return false;
    
    // Check if can parse to number
    const numericCount = validValues.filter((v: any) => !isNaN(parseFloat(v)) && isFinite(v)).length;
    return numericCount === validValues.length; // If all sample values are numbers
  });

  const effectiveNumericCols = Array.from(new Set([...numericCols, ...inferredNumericCols]));
  const effectiveCategoricalCols = data.columns.filter((col: string) => !effectiveNumericCols.includes(col));

  console.log("Original Numeric cols:", numericCols);
  console.log("Effective Numeric cols:", effectiveNumericCols);
  
  // --- CHARTS ALWAYS DISPLAYED (NO STRICT CONDITIONS) ---

  // 0. Data Overview (Pie Chart)
  const otherColsCount = (data.columns?.length || 0) - effectiveNumericCols.length - effectiveCategoricalCols.length;
  chartOptions.push({
    title: "Data Structure (Data Types)",
    option: {
      tooltip: { trigger: 'item' },
      legend: { top: '5%', left: 'center' },
      series: [{
        name: 'Column Type',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}' },
        data: [
          { value: effectiveNumericCols.length, name: 'Numeric' },
          { value: effectiveCategoricalCols.length, name: 'Categorical' },
          { value: otherColsCount > 0 ? otherColsCount : 0, name: 'Other' }
        ].filter(item => item.value > 0)
      }]
    }
  });

  // 0.1. Data Volume (Gauge Chart) - Always display row count
  chartOptions.push({
      title: "Data Volume (Rows)",
      option: {
          tooltip: { formatter: '{a} <br/>{b} : {c}' },
          series: [{
              name: 'Volume',
              type: 'gauge',
              max: Math.max(data.rows * 1.2, 100),
              detail: { formatter: '{value}' },
              data: [{ value: data.rows, name: 'Total Rows' }]
          }]
      }
  });

  // 0.2. Missing Values Analysis (Bar Chart) - Always display data quality
  if (data.preview && data.preview.length > 0) {
      const nullCounts: Record<string, number> = {};
      data.columns.forEach((col: string) => {
          // Count null/empty in preview (estimate)
          nullCounts[col] = data.preview.filter((row: any) => row[col] === null || row[col] === undefined || row[col] === '').length;
      });
      
      const nullData = Object.entries(nullCounts).filter(([, count]) => count > 0);
      if (nullData.length > 0) {
          chartOptions.push({
              title: "Data Quality (Missing Values - Preview)",
              option: {
                  tooltip: { trigger: 'axis' },
                  xAxis: { type: 'category', data: nullData.map(d => d[0]), axisLabel: { rotate: -45 } },
                  yAxis: { type: 'value' },
                  series: [{
                      data: nullData.map(d => d[1]),
                      type: 'bar',
                      itemStyle: { color: '#ef4444' },
                      name: 'Empty Rows'
                  }]
              }
          });
      } else {
           // If data is completely clean, show text chart
           chartOptions.push({
              title: "Data Quality",
              option: {
                  graphic: {
                      elements: [{
                          type: 'text', left: 'center', top: 'center',
                          style: { text: 'Clean Data (No Nulls in Preview)', font: 'bold 14px sans-serif', fill: '#10b981' }
                      }]
                  }
              }
           });
      }
  }

  // --- ANALYSIS CHARTS GROUP (BASED ON INFERRED COLS) ---

  // 1. Bar Chart - Mean/Sample values
  if (effectiveNumericCols.length > 0) {
    // If description exists use mean, otherwise calculate mean from preview
    const barData = effectiveNumericCols.map(col => {
      if (data.description && data.description[col] && data.description[col]['mean']) {
          return data.description[col]['mean'];
      }
      // Fallback calculate mean from preview
      const values = data.preview.map((row: any) => parseFloat(row[col])).filter((v: number) => !isNaN(v));
      return values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    });

    chartOptions.push({
          title: "Mean Values (Bar Chart)",
          option: {
              tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
              xAxis: { type: 'category', data: effectiveNumericCols.slice(0, 20), axisLabel: { rotate: -45, interval: 0, fontSize: 10 } },
              yAxis: { type: 'value' },
              series: [{ data: barData.slice(0, 20), type: 'bar', itemStyle: { color: '#5470c6' } }]
          }
      });
  }

  // 3b. Trend Line Chart (Values by index)
  if (effectiveNumericCols.length > 0 && data.preview && data.preview.length > 0) {
      const colsToShow = effectiveNumericCols.slice(0, 2);
      colsToShow.forEach(col => {
          const values = data.preview.map((row: any, idx: number) => row[col]);
          chartOptions.push({
              title: `Value Trend: ${col} (Top 50)`,
              option: {
                  tooltip: { trigger: 'axis' },
                  xAxis: { type: 'category', data: data.preview.map((_: any, i: number) => i + 1) },
                  yAxis: { type: 'value', scale: true },
                  series: [{
                      data: values,
                      type: 'line', smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#3ba272' }
                  }]
              }
          });
      });
  }

  // 4b. Bar Chart for Categorical Columns (Top values)
  if (effectiveCategoricalCols.length > 0 && data.preview && data.preview.length > 0) {
      const catsToShow = effectiveCategoricalCols.slice(0, 4); // Show top 4 cols
      catsToShow.forEach((col: string) => {
          const valueCounts: Record<string, number> = {};
          data.preview.forEach((row: any) => {
            const val = String(row[col] || 'N/A');
            valueCounts[val] = (valueCounts[val] || 0) + 1;
          });
          
          const barData = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
          
          chartOptions.push({
              title: `Distribution: ${col} (Top 10)`,
              option: {
                  tooltip: { trigger: 'axis' },
                  xAxis: { type: 'category', data: barData.map(d => d[0]), axisLabel: { rotate: -45 } },
                  yAxis: { type: 'value' },
                  series: [{ data: barData.map(d => d[1]), type: 'bar', itemStyle: { color: '#73c0de' } }]
              }
          });
      });
  }

  // 6. Scatter Plot (Pairwise)
  if (effectiveNumericCols.length >= 2 && data.preview.length > 0) {
    const pairs = [];
    for (let i = 0; i < Math.min(effectiveNumericCols.length - 1, 3); i++) {
      pairs.push([effectiveNumericCols[i], effectiveNumericCols[i+1]]);
    }

    pairs.forEach(([xCol, yCol]) => {
        const scatterData = data.preview
          .map((row: any) => {
            const x = parseFloat(row[xCol]);
            const y = parseFloat(row[yCol]);
            return (!isNaN(x) && !isNaN(y)) ? [x, y] : null;
          })
          .filter((point: any) => point !== null);

        if (scatterData.length > 0) {
          chartOptions.push({
              title: `Correlation: ${xCol} vs ${yCol}`,
              option: {
                  tooltip: { trigger: 'item' },
                  xAxis: { type: 'value', name: xCol, scale: true },
                  yAxis: { type: 'value', name: yCol, scale: true },
                  series: [{ type: 'scatter', data: scatterData, symbolSize: 6, itemStyle: { color: '#ee6666' } }]
              }
          });
        }
    });
  }
  
  // 8. Correlation Heatmap
  if (effectiveNumericCols.length >= 2 && data.preview.length > 0) {
    const correlations: number[][] = [];
    const colsToUse = effectiveNumericCols.slice(0, Math.min(20, effectiveNumericCols.length));

    for (let i = 0; i < colsToUse.length; i++) {
      correlations[i] = [];
      for (let j = 0; j < colsToUse.length; j++) {
        if (i === j) {
          correlations[i][j] = 1;
        } else {
          const x = data.preview.map((row: any) => parseFloat(row[colsToUse[i]])).filter((v: number) => !isNaN(v));
          const y = data.preview.map((row: any) => parseFloat(row[colsToUse[j]])).filter((v: number) => !isNaN(v));
          
          if (x.length > 0 && y.length > 0) {
            const meanX = x.reduce((a: number, b: number) => a + b, 0) / x.length;
            const meanY = y.reduce((a: number, b: number) => a + b, 0) / y.length;
            let cov = 0, varX = 0, varY = 0;
            for (let k = 0; k < Math.min(x.length, y.length); k++) {
              cov += (x[k] - meanX) * (y[k] - meanY);
              varX += Math.pow(x[k] - meanX, 2);
              varY += Math.pow(y[k] - meanY, 2);
            }
            const corr = varX > 0 && varY > 0 ? cov / Math.sqrt(varX * varY) : 0;
            correlations[i][j] = Math.round(corr * 100) / 100;
          } else {
            correlations[i][j] = 0;
          }
        }
      }
    }

    chartOptions.push({
        title: "Correlation Matrix (Heatmap)",
        option: {
            tooltip: { position: 'top', formatter: (params: any) => `${colsToUse[params.data[0]]} vs ${colsToUse[params.data[1]]}: ${params.data[2]}` },
            grid: { height: '60%', top: '10%' },
            xAxis: { type: 'category', data: colsToUse, splitArea: { show: true }, axisLabel: { rotate: -45, interval: 0 } },
            yAxis: { type: 'category', data: colsToUse, splitArea: { show: true } },
            visualMap: {
              min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: '0%',
              inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'] }
            },
            series: [{
                name: 'Correlation', type: 'heatmap',
                data: correlations.flatMap((row, i) => row.map((val, j) => [j, i, val])),
                label: { show: true }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
            }]
        }
    });
  }

  // 9. Radar Chart
  if (effectiveNumericCols.length >= 3) {
      const cols = effectiveNumericCols.slice(0, 6);
      
      // Calculate mean manually if description doesn't have it
      const means = cols.map(col => {
         if (data.description?.[col]?.mean) return data.description[col].mean;
         const values = data.preview.map((row: any) => parseFloat(row[col])).filter((v: number) => !isNaN(v));
         return values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
      });
      
      const maxMean = Math.max(...means) || 1;
      
      chartOptions.push({
          title: "Radar Chart (Mean Values)",
          option: {
              tooltip: { trigger: 'item' },
              radar: { indicator: cols.map(col => ({ name: col, max: maxMean * 1.2 })) },
              series: [{
                  name: 'Mean Values', type: 'radar',
                  data: [{ value: means, name: 'Mean' }], areaStyle: { opacity: 0.2 }
              }]
          }
      });
  }

  // FINAL FALLBACK
  if (chartOptions.length === 0) {
    chartOptions.push({
      title: "Data Status",
      option: {
        title: { text: 'No charts created', left: 'center', top: 'center', textStyle: { color: '#999', fontSize: 14 } },
        series: []
      }
    });
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <a href="/history" className="text-sm text-muted-foreground hover:underline">&larr; Back to History</a>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics Report</h2>
            <p className="text-sm text-muted-foreground mt-1">
                Displaying automatic analysis for uploaded file
            </p>
        </div>
        <div className="text-sm bg-muted px-4 py-2 rounded-md border">
            <div className="font-medium">File: {data.filename}</div>
            <div className="text-xs text-muted-foreground mt-1">
                {data.rows} rows | {data.cols} columns ({effectiveNumericCols.length} numeric, {effectiveCategoricalCols.length} categorical)
            </div>
        </div>
      </div>

      {/* Debug info */}
      {chartOptions.length <= 1 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded text-xs">
              <strong>Diagnostic Info:</strong> 
              <span className="ml-2">Numeric Cols: {effectiveNumericCols.join(', ')}</span> | 
              <span className="ml-2">Categorical Cols: {effectiveCategoricalCols.join(', ')}</span>
          </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {chartOptions.map((chart, idx) => {
          const isLarge = chart.title.includes("Heatmap") || chart.title.includes("Correlation Matrix") || chart.title.includes("Radar") || chart.title.includes("Data Structure");
          return (
            <ChartWidget 
              key={idx} 
              title={chart.title} 
              option={chart.option} 
              className={isLarge ? "col-span-2" : ""}
            />
          );
        })}
      </div>
      
      {/* Data Preview Table */}
      <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted p-4 border-b">
                <h3 className="text-lg font-semibold">Detailed Data (Preview First 50 Rows)</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                            {data.columns.map((col: string) => <th key={col} className="p-3 font-medium border-b whitespace-nowrap bg-muted/50">{col}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.preview.map((row: any, idx: number) => (
                            <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                                {data.columns.map((col: string) => (
                                    <td key={col} className="p-3 border-r last:border-r-0 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                                        {row[col] !== null ? String(row[col]) : <span className="text-muted-foreground italic">null</span>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>}>
      <AnalyticsContent />
    </Suspense>
  );
}