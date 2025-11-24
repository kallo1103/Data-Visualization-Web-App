import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Upload your data to generate insights and visualizations.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Dashboard stats placeholders */}
        <div className="p-6 bg-card rounded-xl border shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Total Uploads</div>
          <div className="text-2xl font-bold">0</div>
        </div>
      </div>
    </div>
  );
}

