import React, { useState, useMemo } from "react";
import { useChangelog, ChangelogFilters, AuditLogEntry } from "@/hooks/use-changelog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isSameDay, startOfDay, parseISO } from "date-fns";
import { 
  History, Search, Filter, Calendar as CalendarIcon, 
  RotateCcw, Info, User, Activity, Database, Download,
  Loader2, ShieldCheck, ShieldAlert, Shield, ClipboardList,
  Eye, FileJson, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ChangelogManagement = () => {
  const [filters, setFilters] = useState<ChangelogFilters>({
    actionType: "ALL",
    targetTable: "ALL",
    role: "ALL"
  });
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  
  // PAGINATION: Track which "day page" we are on
  const [currentPage, setCurrentPage] = useState(0);
  
  const { data: logs, isLoading, error } = useChangelog({ ...filters, search });

  const resetFilters = () => {
    setFilters({ actionType: "ALL", targetTable: "ALL", role: "ALL" });
    setSearch("");
    setCurrentPage(0);
  };

  // Group logs by day and identify unique days
  const { groupedLogs, sortedDays } = useMemo(() => {
    const groups: { [key: string]: AuditLogEntry[] } = {};
    if (!logs) return { groupedLogs: groups, sortedDays: [] };

    logs.forEach(log => {
      const day = format(startOfDay(new Date(log.timestamp)), "yyyy-MM-dd");
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(log);
    });

    const days = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return { groupedLogs: groups, sortedDays: days };
  }, [logs]);

  // The logs for the currently selected "page" (day)
  const currentDay = sortedDays[currentPage];
  const currentLogs = currentDay ? groupedLogs[currentDay] : [];

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold uppercase tracking-wider text-[10px]">CREATE</Badge>;
      case 'UPDATE': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold uppercase tracking-wider text-[10px]">UPDATE</Badge>;
      case 'DELETE': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold uppercase tracking-wider text-[10px]">DELETE</Badge>;
      default: return <Badge variant="outline" className="font-bold uppercase tracking-wider text-[10px]">{action}</Badge>;
    }
  };

  const exportToCSV = () => {
    if (!logs || logs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Timestamp", "User", "Action", "Table", "Description", "Record ID"];
    const csvData = logs.map(log => [
        format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
        log.username || "System",
        log.action_type,
        log.target_table,
        log.description,
        log.target_record_id
      ]
    );

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_all_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("All fetched logs exported successfully");
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const dayStr = format(date, "yyyy-MM-dd");
    const index = sortedDays.indexOf(dayStr);
    if (index !== -1) {
      setCurrentPage(index);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground font-display">Audit Logs</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight opacity-70">
              Page {sortedDays.length > 0 ? currentPage + 1 : 0} of {sortedDays.length} Days
            </p>
          </div>
        </div>

        {/* DATE NAVIGATOR PAGINATION (Top) */}
        {sortedDays.length > 0 && (
          <div className="flex items-center gap-2 bg-card/30 border border-border/50 p-1.5 rounded-xl shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage === sortedDays.length - 1}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
              title="Older Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-1 flex flex-col items-center min-w-[140px] hover:bg-primary/5 rounded-lg transition-all group">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1 flex items-center gap-1 group-hover:scale-110 transition-transform">
                    DATE <CalendarIcon className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                  </span>
                  <span className="text-xs font-bold text-foreground whitespace-nowrap border-b border-dashed border-primary/30 group-hover:border-primary transition-colors">
                    {currentDay ? format(new Date(currentDay + 'T00:00:00'), "MMMM do, yyyy") : "No Data"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-border shadow-2xl z-50" align="center">
                <Calendar
                  mode="single"
                  selected={currentDay ? new Date(currentDay + 'T00:00:00') : undefined}
                  onSelect={handleDateSelect}
                  disabled={(date) => !sortedDays.includes(format(date, "yyyy-MM-dd"))}
                  initialFocus
                  className="glass rounded-xl"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
              title="Newer Day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Search Database</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search user, ID, or action..." 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(0);
                }}
                className="pl-10 bg-card/50 border-border h-10"
              />
            </div>
          </div>

          <div className="w-40 space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Action Type</label>
            <Select 
              value={filters.actionType} 
              onValueChange={(v) => {
                setFilters(prev => ({ ...prev, actionType: v }));
                setCurrentPage(0);
              }}
            >
              <SelectTrigger className="bg-card/50 border-border capitalize h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass border-border">
                <SelectItem value="ALL">All Actions</SelectItem>
                <SelectItem value="INSERT">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={resetFilters} className="text-muted-foreground hover:text-primary h-10 w-10" title="Reset Filters">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={exportToCSV} className="text-muted-foreground hover:text-primary border-border bg-card/50 h-10 w-10" title="Export All to CSV">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5" />
          Failed to load audit logs. Check your database connection.
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden border-border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 border-border">
              <TableHead className="w-[120px] text-xs uppercase tracking-wider font-bold">Time</TableHead>
              <TableHead className="w-[150px] text-xs uppercase tracking-wider font-bold">Initiator</TableHead>
              <TableHead className="w-[100px] text-xs uppercase tracking-wider font-bold">Action</TableHead>
              <TableHead className="w-[150px] text-xs uppercase tracking-wider font-bold">Table</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-bold">Event Description</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Scanning Audit Trail...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : currentLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-display text-lg">No activity found</p>
                  <p className="text-xs">Adjust your filters or try a different day</p>
                </TableCell>
              </TableRow>
            ) : (
              currentLogs.map((log) => (
                <TableRow key={log.id} className="border-border hover:bg-white/5 group transition-colors">
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {format(new Date(log.timestamp), "HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{log.username || "System"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action_type)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-xs text-muted-foreground font-mono uppercase tracking-tighter bg-muted/30 px-1.5 py-0.5 rounded border border-border/50">
                        {log.target_table}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-foreground font-medium leading-snug">{log.description}</span>
                      <span className="text-[9px] text-muted-foreground font-mono opacity-50 group-hover:opacity-100 transition-opacity">
                        REF: {log.target_record_id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* FOOTER DAY PAGINATION */}
      {sortedDays.length > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/20">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === sortedDays.length - 1}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="border-border hover:bg-primary/10 hover:text-primary gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Day
          </Button>
          
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
            {currentPage + 1} / {sortedDays.length}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="border-border hover:bg-primary/10 hover:text-primary gap-2"
          >
            Next Day
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* JSON Detail Viewer */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="glass border-border sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <FileJson className="w-5 h-5 text-primary" />
                Audit Explorer
              </DialogTitle>
              {selectedLog && getActionBadge(selectedLog.action_type)}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-black/5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-card/30 border border-border/30">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Target Object</label>
                <div className="text-xs font-mono text-primary font-bold">{selectedLog?.target_table}</div>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-card/30 border border-border/30">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Timestamp</label>
                <div className="text-xs font-mono text-foreground">
                  {selectedLog && format(new Date(selectedLog.timestamp), "HH:mm:ss.SSS")}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Action Context</label>
              <div className="text-sm p-4 bg-primary/5 rounded-xl border border-primary/10 leading-relaxed font-medium italic text-foreground/90">
                "{selectedLog?.description}"
              </div>
            </div>

            {selectedLog?.old_data && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-destructive tracking-widest ml-1 flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3" /> Pre-Change State
                </label>
                <pre className="text-[11px] bg-black/60 p-4 rounded-xl border border-border/50 overflow-x-auto text-muted-foreground font-mono leading-relaxed shadow-inner">
                  {JSON.stringify(selectedLog.old_data, null, 2)}
                </pre>
              </div>
            )}
            
            {selectedLog?.new_data && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest ml-1 flex items-center gap-1.5">
                  <History className="w-3 h-3" /> Post-Change State
                </label>
                <pre className="text-[11px] bg-black/60 p-4 rounded-xl border border-emerald-500/20 text-muted-foreground overflow-x-auto font-mono leading-relaxed shadow-inner">
                  {JSON.stringify(selectedLog.new_data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/50 bg-white/5 flex justify-end">
            <Button onClick={() => setSelectedLog(null)} variant="secondary" className="px-8 font-bold">Close Explorer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChangelogManagement;
