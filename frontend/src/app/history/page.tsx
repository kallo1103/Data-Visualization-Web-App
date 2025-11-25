"use client"

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, FileText, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface AnalysisFile {
    id: number;
    task_id: string;
    filename: string;
    status: string;
    upload_date: string;
    file_size: number;
}

export default function HistoryPage() {
    const [files, setFiles] = useState<AnalysisFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await axios.get(`${API_URL}/files`);
                setFiles(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch history", err);
                setError("Failed to load history. Please try again later.");
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-12">{error}</div>;
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">History</h1>
                    <p className="text-muted-foreground mt-1">
                        View your previously uploaded datasets and analysis reports.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/upload">Upload New File</Link>
                </Button>
            </div>

            {files.length === 0 ? (
                <Card className="text-center p-12">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="p-4 bg-muted rounded-full">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">No history found</h3>
                        <p className="text-muted-foreground">You haven't uploaded any files yet.</p>
                        <Button asChild variant="outline" className="mt-4">
                            <Link href="/upload">Start Analysis</Link>
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {files.map((file) => (
                        <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-0">
                                <div className="flex items-center p-6 gap-6">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <FileText className="h-6 w-6 text-primary" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 grid gap-1">
                                        <h4 className="text-lg font-semibold truncate" title={file.filename}>
                                            {file.filename}
                                        </h4>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{format(new Date(file.upload_date), 'MMM d, yyyy HH:mm')}</span>
                                            </div>
                                            {file.file_size && (
                                                <span>• {(file.file_size / 1024).toFixed(1)} KB</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <StatusBadge status={file.status} />
                                        
                                        {file.status === 'COMPLETED' && (
                                            <Button asChild variant="ghost" size="sm" className="ml-auto">
                                                <Link href={`/analytics?taskId=${file.task_id}`} className="gap-2">
                                                    View Report <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'COMPLETED':
        case 'SUCCESS':
            return (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex gap-1">
                    <CheckCircle className="h-3 w-3" /> Completed
                </Badge>
            );
        case 'FAILED':
        case 'FAILURE':
            return (
                <Badge variant="destructive" className="flex gap-1">
                    <XCircle className="h-3 w-3" /> Failed
                </Badge>
            );
        case 'PROCESSING':
            return (
                <Badge variant="secondary" className="flex gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Processing
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="flex gap-1">
                    <Clock className="h-3 w-3" /> Pending
                </Badge>
            );
    }
}

