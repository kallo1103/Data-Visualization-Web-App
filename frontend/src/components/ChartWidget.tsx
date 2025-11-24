"use client"

import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartWidgetProps {
  title: string;
  option: any; // ECharts option object
  className?: string;
}

export function ChartWidget({ title, option, className }: ChartWidgetProps) {
  // Heatmap và các biểu đồ lớn cần chiều cao lớn hơn
  const isLargeChart = title.includes("Heatmap") || title.includes("Ma trận");
  const chartHeight = isLargeChart ? '500px' : '300px';
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: chartHeight, width: '100%' }} />
      </CardContent>
    </Card>
  );
}

