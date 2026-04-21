import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { CheckSquare, Download, X } from "lucide-react";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import { PipelineStatus, isValidTransition } from "@/data/types";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";

const columnDefs: { id: PipelineStatus; title: string }[] = [
  { id: "applied", title: "Applied" },
  { id: "shortlisted", title: "Shortlisted" },
  { id: "interview", title: "Interview" },
  { id: "selected", title: "Selected" },
  { id: "rejected", title: "Rejected" },
];

const Hierarchy = () => {
  const { applications, updateApplicationStatus, bulkUpdateStatus, jobs, loadJobs, loadApplications } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobFilter = searchParams.get("job") || "all";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  // Load jobs and applications from API on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadJobs(), loadApplications()]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({ title: "Error", description: "Failed to load hierarchy data", variant: "destructive" });
      }
    };
    loadData();
  }, [loadJobs, loadApplications]);

  const filteredApps = jobFilter === "all" ? applications : applications.filter((a) => a.job_id === jobFilter);

  const columns = columnDefs.map((col) => ({
    ...col,
    items: filteredApps.filter((a) => a.status === col.id),
  }));

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const targetStatus = destination.droppableId as PipelineStatus;
    const app = applications.find((a) => a.id === draggableId);
    if (!app) return;

    if (!isValidTransition(app.status, targetStatus)) {
      const message = `Backward or invalid movement is not allowed. Current: "${app.status}", Target: "${targetStatus}".`;
      
      toast({ title: "Invalid move", description: message, variant: "destructive" });
      return;
    }

    // Call updateApplicationStatus and await it
    const success = await updateApplicationStatus(draggableId, targetStatus);
    if (success) {
      toast({ title: "Status updated", description: `${app.candidate_name} moved to ${targetStatus}.` });
    } else {
      toast({ title: "Error", description: "Failed to update candidate status.", variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleBulkMove = (status: PipelineStatus) => {
    const count = bulkUpdateStatus(selectedIds, status);
    toast({ title: `${count} candidates moved`, description: `Moved to ${status}.` });
    setSelectedIds([]);
    setBulkMode(false);
  };

  const exportColumn = (colId: PipelineStatus, title: string) => {
    const items = filteredApps.filter((a) => a.status === colId);
    const csv = ["Name,Email,Phone,CGPA,Score,Skills"]
      .concat(items.map((a) => `${a.candidate_name},${a.candidate_email},${a.phone || ""},${a.cgpa || ""},${a.score},${a.skills.join(";")}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}_candidates.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${title} candidates exported as CSV.` });
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hierarchy</h1>
          <p className="text-muted-foreground mt-1">Drag candidates forward only (applied → shortlisted → interview → selected, or reject from active stages)</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={jobFilter}
            onChange={(e) => setSearchParams(e.target.value === "all" ? {} : { job: e.target.value })}
            className="bg-muted rounded-xl px-4 py-2.5 text-sm outline-none border-0 text-foreground"
          >
            <option value="all">All Jobs</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedIds([]); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${bulkMode ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"}`}
          >
            <CheckSquare className="w-4 h-4" /> {bulkMode ? "Cancel" : "Select"}
          </button>
        </div>
      </div>

      {bulkMode && selectedIds.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-secondary rounded-xl flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-foreground">{selectedIds.length} selected</span>
          {(["shortlisted", "interview", "selected", "rejected"] as PipelineStatus[]).map((s) => (
            <button key={s} onClick={() => handleBulkMove(s)} className="px-3 py-1.5 bg-card rounded-lg text-xs font-medium text-foreground hover:bg-muted border border-border transition-colors capitalize">
              → {s}
            </button>
          ))}
          <button onClick={() => setSelectedIds([])} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 mt-8 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} className="min-w-[220px] flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{col.items.length}</span>
                  <button onClick={() => exportColumn(col.id, col.title)} className="p-1 rounded hover:bg-muted transition-colors" title="Export CSV">
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`space-y-3 min-h-[200px] p-3 rounded-2xl transition-colors ${snapshot.isDraggingOver ? "bg-secondary" : "bg-muted/50"}`}>
                    {col.items.map((item, idx) => (
                      <Draggable key={item.id} draggableId={item.id} index={idx}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`bg-card rounded-xl border border-border p-4 shadow-card transition-shadow ${snapshot.isDragging ? "shadow-hover" : ""}`}>
                            <div className="flex items-center gap-3">
                              {bulkMode && (
                                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" />
                              )}
                              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">{item.avatar}</div>
                              <div className="flex-1 min-w-0">
                                <Link to={`/candidates/${item.id}`} className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors block">{item.candidate_name}</Link>
                                <p className="text-xs text-muted-foreground">{item.role}</p>
                              </div>
                              <span className="text-xs font-bold text-accent-foreground">{item.score}%</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </PageLayout>
  );
};

export default Hierarchy;
