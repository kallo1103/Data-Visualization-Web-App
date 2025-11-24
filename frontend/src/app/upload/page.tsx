import { UploadZone } from "@/components/UploadZone"

export default function UploadPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto py-12">
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Upload Data</h1>
            <p className="text-muted-foreground">
                Upload your dataset to begin the analysis. We support various formats for your convenience.
            </p>
        </div>
        
        <UploadZone />
    </div>
  )
}

