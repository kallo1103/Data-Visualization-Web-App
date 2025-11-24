"use client"

import * as React from "react"
import { Upload, FileType, Loader2, CheckCircle, XCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function UploadZone() {
  const [isDragging, setIsDragging] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = React.useState<"idle" | "uploading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [taskId, setTaskId] = React.useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = React.useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploadStatus("uploading")
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      setTaskId(response.data.task_id)
      setUploadStatus("success")
      pollStatus(response.data.task_id)
    } catch (error) {
        console.error(error)
      setUploadStatus("error")
      setErrorMessage("Upload failed. Please try again.")
    }
  }

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/status/${id}`)
        const status = response.data.status
        setProcessingStatus(status)
        
        if (status === "SUCCESS" || status === "FAILURE") {
          if (status === "FAILURE") {
             setErrorMessage(response.data.error || "Processing failed")
             setUploadStatus("error")
          }
          clearInterval(interval)
        }
      } catch (error) {
        clearInterval(interval)
        console.error("Error polling status:", error)
      }
    }, 2000)
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploadStatus === "success" && "border-green-500 bg-green-50/10",
          uploadStatus === "error" && "border-red-500 bg-red-50/10"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
          accept=".csv,.xlsx,.xls,.json,.parquet"
        />
        
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center space-y-4"
            >
              <div className="p-4 bg-background rounded-full shadow-sm">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold">Drop file here</p>
                <p className="text-sm text-muted-foreground">or click to upload</p>
              </div>
              <Button variant="outline" onClick={() => document.getElementById("file-upload")?.click()}>
                Select File
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Supported: CSV, Excel, JSON, Parquet
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center space-y-4"
            >
              <div className="p-4 bg-background rounded-full shadow-sm">
                <FileType className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold truncate max-w-[200px]">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              
              {uploadStatus === "idle" && (
                <div className="flex gap-2">
                   <Button variant="outline" onClick={() => setFile(null)}>Cancel</Button>
                   <Button onClick={handleUpload}>Upload & Analyze</Button>
                </div>
              )}

              {uploadStatus === "uploading" && (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading...</span>
                </div>
              )}

              {uploadStatus === "success" && (
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Uploaded!</span>
                    </div>
                    {processingStatus && (
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm text-muted-foreground capitalize">Status: {processingStatus}</p>
                            {processingStatus === "SUCCESS" && (
                                <Button asChild size="sm" variant="secondary">
                                    <a href={`/analytics?taskId=${taskId}`}>View Analysis</a>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
              )}
              
               {uploadStatus === "error" && (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

