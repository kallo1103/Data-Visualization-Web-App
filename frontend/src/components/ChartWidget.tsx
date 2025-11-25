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
  // Heatmap and large charts need more height
  const isLargeChart = title.includes("Heatmap") || title.includes("Correlation Matrix");
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

