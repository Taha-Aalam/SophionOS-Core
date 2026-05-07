"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FilePlus,
  FolderOpen,
  Link2,
  NotebookPen,
  Pin,
  Plus,
  Settings2,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGoals } from "@/lib/hooks/use-goals";
import { useNoteDefaults, useUpdateNoteDefaults } from "@/lib/hooks/use-user-settings";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTopics } from "@/lib/hooks/use-topics";
import {
  useArchiveNoteWithUndo,
  useBulkUpdateNotes,
  useCreateNote,
  useNotes,
  useNotebooks,
  useRestoreNote,
  useToggleFavoriteNote,
  useTogglePinNote,
  NOTES_QUERY_KEY,
} from "@/lib/hooks/use-notes";
import { noteService } from "@/lib/services/note.service";
import { useAuth } from "@/components/providers/auth-provider";
import type { Note } from "@/lib/types/domain.types";
import { NOTE_STATUS, NOTE_TYPE, type NoteStatus, type NoteType } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

const SC: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const TC: Record<string, string> = {
  note: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  research: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  journal: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

const TABS: { value: string; label: string; filter: (n: Note) => boolean; ds?: NoteStatus; gb?: "topic_id" | "project_id" | "notebook" }[] = [
  { value: "inbox", label: "Inbox", filter: (n) => n.status === NOTE_STATUS.INBOX && !n.is_archived, ds: NOTE_STATUS.INBOX },
  { value: "to_review", label: "To review", filter: (n) => n.status === NOTE_STATUS.TO_REVIEW && !n.is_archived, ds: NOTE_STATUS.TO_REVIEW },
  { value: "pinned", label: "Pinned", filter: (n) => n.pin && !n.is_archived, ds: NOTE_STATUS.ACTIVE },
  { value: "edited", label: "Edited", filter: (n) => !n.is_archived, ds: NOTE_STATUS.ACTIVE },
  { value: "favorite", label: "Favorite", filter: (n) => n.favorite && !n.is_archived, ds: NOTE_STATUS.ACTIVE },
  { value: "by_topic", label: "By Topic", filter: (n) => !n.is_archived && !!n.topic_id, gb: "topic_id", ds: NOTE_STATUS.ACTIVE },
  { value: "by_project", label: "By Project", filter: (n) => !n.is_archived && !!n.project_id, gb: "project_id", ds: NOTE_STATUS.ACTIVE },
  { value: "by_notebook", label: "By Notebook", filter: (n) => !n.is_archived && !!n.notebook, gb: "notebook", ds: NOTE_STATUS.ACTIVE },
  { value: "archived", label: "Archived", filter: (n) => n.is_archived, ds: NOTE_STATUS.ARCHIVE },
  { value: "all", label: "All", filter: (n) => !n.is_archived, ds: NOTE_STATUS.INBOX },
];

function dsFor(tab: string, sd?: NoteStatus | null) {
  return TABS.find((t) => t.value === tab)?.ds ?? sd ?? NOTE_STATUS.INBOX;
}

function extractTextPreview(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content) as { content?: Array<{ content?: Array<{ text?: string }> }> };
    const texts: string[] = [];
    for (const block of parsed.content ?? []) {
      for (const node of block.content ?? []) {
        if (node.text) texts.push(node.text);
      }
      if (texts.join(" ").length > 200) break;
    }
    return texts.join(" ").slice(0, 200);
  } catch {
    return content.slice(0, 200);
  }
}
export default function NotesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [nbFilter, setNbFilter] = useState("");
  const [nn, setNn] = useState("");
  const [ns, setNs] = useState<NoteStatus>(NOTE_STATUS.INBOX);
  const [nt, setNt] = useState<NoteType>(NOTE_TYPE.NOTE);
  const [nb, setNb] = useState("");
  const [bsOpen, setBsOpen] = useState(false);
  const [bnOpen, setBnOpen] = useState(false);

  const { data: notes = [], isLoading } = useNotes({ status: "all" });
  const { data: nbs = [] } = useNotebooks();
  const { data: goals = [] } = useGoals({});
  const { data: projs = [] } = useProjects({ status: "all" });
  const { data: tops = [] } = useTopics();
  const { data: defs } = useNoteDefaults();
  const cnM = useCreateNote();
  const tf = useToggleFavoriteNote();
  const tp = useTogglePinNote();
  const ar = useArchiveNoteWithUndo();
  const rs = useRestoreNote();
  const ud = useUpdateNoteDefaults();
  const bk = useBulkUpdateNotes();

  const pMap = useMemo(() => new Map(projs.map((p) => [p.id, p.name])), [projs]);
  const tMap = useMemo(() => new Map(tops.map((t) => [t.id, t.name])), [tops]);
  const gMap = useMemo(() => new Map(goals.map((g) => [g.id, g.name])), [goals]);

  const ids = useMemo(() => notes.map((n) => n.id), [notes]);
  const { data: rCounts } = useQuery({
    queryKey: [NOTES_QUERY_KEY, "rc", user?.id, ids],
    queryFn: () => noteService.getNoteRelatedCounts(user!.id, ids),
    enabled: !!user && ids.length > 0,
  });
  const { data: gLinks } = useQuery({
    queryKey: [NOTES_QUERY_KEY, "gl", user?.id, ids],
    queryFn: () => noteService.getNoteGoalIds(user!.id, ids),
    enabled: !!user && ids.length > 0,
  });

  const dt = useMemo(() => {
    const s = new Set<string>();
    notes.forEach((n) => { if (!n.is_archived) s.add(n.type); });
    return Array.from(s).map((t) => ({ value: `type:${t}`, label: t[0].toUpperCase() + t.slice(1) }));
  }, [notes]);

  const allTabs = useMemo(() => [...TABS.map((t) => ({ value: t.value, label: t.label })), ...dt], [dt]);

  const filtered = useMemo(() => {
    let list = notes.filter((n) => {
      if (tab.startsWith("type:")) return n.type === tab.slice(5) && !n.is_archived;
      const c = TABS.find((x) => x.value === tab);
      return c ? c.filter(n) : true;
    });
    if (nbFilter.trim()) list = list.filter((n) => n.notebook?.toLowerCase().includes(nbFilter.toLowerCase()));
    list.sort((a, b) => {
      if (a.pin && !b.pin) return -1;
      if (!a.pin && b.pin) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return list;
  }, [notes, tab, nbFilter]);

  const cfg = TABS.find((t) => t.value === tab);
  const grouped = cfg?.gb;
  const sids = Array.from(sel);

  const openNew = () => {
    setNn(""); setNs(defs?.default_status ?? NOTE_STATUS.INBOX);
    setNt(defs?.default_type ?? NOTE_TYPE.NOTE); setNb(defs?.default_notebook ?? "");
    setNewOpen(true);
  };

  const doCreate = async () => {
    const note = await cnM.mutateAsync({ name: nn.trim() || "Untitled note", status: ns, type: nt, notebook: nb || null });
    setNewOpen(false); router.push(`/notes/${note.slug ?? note.id}`);
  };

  const doInline = async () => {
    const st = dsFor(tab, defs?.default_status ?? null);
    const note = await cnM.mutateAsync({ name: "Untitled note", status: st, type: defs?.default_type ?? NOTE_TYPE.NOTE, notebook: defs?.default_notebook ?? null });
    router.push(`/notes/${note.slug ?? note.id}`);
  };

  const toggle = (id: string) => {
    setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const toggleAll = () => {
    if (sel.size === filtered.length && filtered.length > 0) setSel(new Set());
    else setSel(new Set(filtered.map((n) => n.id)));
  };
  const renderRow = (note: Note) => {
    const isSel = sel.has(note.id);
    const rc = rCounts?.get(note.id) ?? 0;
    const gs = (gLinks?.get(note.id) ?? []).slice(0, 2).map((gid) => ({ id: gid, name: gMap.get(gid) ?? "Goal" }));
    return (
      <TableRow key={note.id} data-state={isSel ? "selected" : undefined} className="group cursor-pointer"
        onClick={(e) => { if ((e.target as HTMLElement).closest("[data-sc]")) return; router.push(`/notes/${note.slug ?? note.id}`); }}>
        <TableCell className="w-8"><div data-sc><Checkbox checked={isSel} onCheckedChange={() => toggle(note.id)} /></div></TableCell>
        <TableCell className="w-8">
          <button data-sc type="button" onClick={() => tp.mutate({ id: note.id, pin: !note.pin })}
            className={cn("rounded p-1 transition-colors", note.pin ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100")} title={note.pin ? "Unpin" : "Pin"}>
            <Pin className={cn("size-3.5", note.pin && "fill-current")} />
          </button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-medium">{note.name}</span>
            {rc > 0 && <Badge variant="outline" className="h-4 px-1 text-[10px]"><Link2 className="mr-0.5 size-2.5" />{rc}</Badge>}
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className={cn("text-xs", TC[note.type])}>{note.type}</Badge></TableCell>
        <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className={cn("text-xs", SC[note.status])}>{note.status.replace("_", " ")}</Badge></TableCell>
        <TableCell className="hidden md:table-cell">
          {note.notebook ? <Badge variant="outline" className="text-xs"><BookOpen className="mr-1 size-2.5" />{note.notebook}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {note.project_id && pMap.has(note.project_id) ? (
            <Badge variant="outline" className="cursor-pointer text-xs hover:bg-muted" onClick={(e) => { e.stopPropagation(); router.push(`/projects/${note.project_id}`); }}>
              <FolderOpen className="mr-1 size-2.5" />{pMap.get(note.project_id)}
            </Badge>
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <div className="flex flex-wrap gap-1">
            {gs.map((g) => (
              <Badge key={g.id} variant="outline" className="cursor-pointer text-xs hover:bg-muted" onClick={(e) => { e.stopPropagation(); router.push(`/goals/${g.id}`); }}>
                <Tag className="mr-1 size-2.5" />{g.name}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="w-8">
          <button data-sc type="button" onClick={() => tf.mutate({ id: note.id, favorite: !note.favorite })}
            className={cn("rounded p-1 transition-colors", note.favorite ? "text-rose-500" : "text-muted-foreground opacity-0 group-hover:opacity-100")} title={note.favorite ? "Unfavorite" : "Favorite"}>
            <Star className={cn("size-3.5", note.favorite && "fill-current")} />
          </button>
        </TableCell>
        <TableCell className="w-8">
          {note.is_archived ? (
            <button data-sc type="button" onClick={() => rs.mutate(note.id)} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Restore">
              <ArchiveRestore className="size-3.5" />
            </button>
          ) : (
            <button data-sc type="button" onClick={() => ar.mutate(note.id)} className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground" title="Archive">
              <Archive className="size-3.5" />
            </button>
          )}
        </TableCell>
        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
          {new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </TableCell>
      </TableRow>
    );
  };

  const renderTable = (list: Note[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"><Checkbox checked={sel.size === list.length && list.length > 0} onCheckedChange={toggleAll} /></TableHead>
          <TableHead className="w-8" />
          <TableHead>Name</TableHead>
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead className="hidden sm:table-cell">Status</TableHead>
          <TableHead className="hidden md:table-cell">Notebook</TableHead>
          <TableHead className="hidden lg:table-cell">Project</TableHead>
          <TableHead className="hidden lg:table-cell">Goals</TableHead>
          <TableHead className="w-8" />
          <TableHead className="w-8" />
          <TableHead className="hidden sm:table-cell w-20">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{list.map(renderRow)}</TableBody>
    </Table>
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const renderGrouped = () => {
    const by = grouped!;
    const map = new Map<string, Note[]>();
    for (const n of filtered) {
      const k = by === "notebook" ? (n.notebook ?? "Uncategorized") : (n[by] ?? "Uncategorized");
      const a = map.get(k) ?? []; a.push(n); map.set(k, a);
    }
    const groups = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return (
      <div className="space-y-2">
        {groups.map(([k, g]) => {
          const isO = openGroups.has(k) || groups.length <= 3;
          return (
            <div key={k} className="rounded-lg border">
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50"
                onClick={() => setOpenGroups((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
                {isO ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                {by === "topic_id" ? tMap.get(k) : by === "project_id" ? pMap.get(k) : k}
                <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">{g.length}</Badge>
              </button>
              {isO && <div className="border-t">{renderTable(g)}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNew} disabled={cnM.isPending}><FilePlus className="mr-2 size-4" />New Note</Button>
          <Popover open={setOpen} onOpenChange={setSetOpen}>
            <PopoverTrigger className={buttonVariants({ variant: "outline", size: "icon" })}>
              <Settings2 className="size-4" />
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-3" align="end">
              <p className="text-sm font-medium">Note Defaults</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Default Status</Label>
                <Select value={ns} onValueChange={(v) => setNs(v as NoteStatus)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOTE_STATUS.INBOX}>Inbox</SelectItem>
                    <SelectItem value={NOTE_STATUS.TO_REVIEW}>To Review</SelectItem>
                    <SelectItem value={NOTE_STATUS.ACTIVE}>Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Default Type</Label>
                <Select value={nt} onValueChange={(v) => setNt(v as NoteType)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOTE_TYPE.NOTE}>Note</SelectItem>
                    <SelectItem value={NOTE_TYPE.RESEARCH}>Research</SelectItem>
                    <SelectItem value={NOTE_TYPE.JOURNAL}>Journal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Default Notebook</Label>
                <Input value={nb} onChange={(e) => setNb(e.target.value)} placeholder="e.g. Work Notes" className="h-8 text-sm" />
              </div>
              <Button size="sm" className="w-full" onClick={() => { ud.mutate({ default_status: ns as "inbox" | "to_review" | "active" | undefined, default_type: nt, default_notebook: nb || null }); setSetOpen(false); }} disabled={ud.isPending}>Save Defaults</Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {sids.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
          <span className="text-sm font-medium">{sids.length} selected</span>
          <Button variant="outline" size="sm" onClick={() => bk.archive.mutate(sids)} disabled={bk.archive.isPending}><Archive className="mr-1.5 size-3.5" />Archive</Button>
          <Popover open={bsOpen} onOpenChange={setBsOpen}>
            <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Tag className="mr-1.5 size-3.5" />Change status
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              <div className="flex flex-col gap-0.5">
                {([NOTE_STATUS.INBOX, NOTE_STATUS.TO_REVIEW, NOTE_STATUS.ACTIVE, NOTE_STATUS.ARCHIVE] as NoteStatus[]).map((s) => (
                  <button key={s} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted text-left" onClick={() => { bk.updateStatus.mutate({ noteIds: sids, status: s }); setBsOpen(false); setSel(new Set()); }}>{s.replace("_", " ")}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={bnOpen} onOpenChange={setBnOpen}>
            <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
              <BookOpen className="mr-1.5 size-3.5" />Move to notebook
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search notebook…" />
                <CommandList>
                  <CommandEmpty>No notebooks found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={() => { bk.updateNotebook.mutate({ noteIds: sids, notebook: null }); setBnOpen(false); setSel(new Set()); }}><X className="mr-2 size-3.5" />No notebook</CommandItem>
                    {nbs.map((b) => (
                      <CommandItem key={b} onSelect={() => { bk.updateNotebook.mutate({ noteIds: sids, notebook: b }); setBnOpen(false); setSel(new Set()); }}><BookOpen className="mr-2 size-3.5" />{b}</CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="destructive" size="sm" onClick={() => { bk.delete.mutate(sids); setSel(new Set()); }} disabled={bk.delete.isPending}><Trash2 className="mr-1.5 size-3.5" />Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setSel(new Set())}>Clear</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <BookOpen className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={nbFilter} onChange={(e) => setNbFilter(e.target.value)} placeholder="Filter notebook…" className="h-8 w-48 pl-8 text-sm" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setSel(new Set()); }}>
        <TabsList className="flex-wrap h-auto">
          {allTabs.map((t) => {
            const count = notes.filter((n) => {
              if (t.value.startsWith("type:")) return n.type === t.value.slice(5) && !n.is_archived;
              const c = TABS.find((x) => x.value === t.value);
              return c ? c.filter(n) : true;
            }).length;
            return (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                {count > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{count}</Badge>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {allTabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={NotebookPen} title={`No ${t.label.toLowerCase()} notes`} description="Try a different filter or create a new note." actionLabel="New Note" onAction={openNew} />
            ) : grouped ? (
              renderGrouped()
            ) : (
              <div className="rounded-lg border">
                {renderTable(filtered)}
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50"
                  onClick={doInline}
                >
                  <Plus className="size-4" />
                  New page
                </button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
            <DialogDescription>Create a new note with pre-filled defaults.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={nn} onChange={(e) => setNn(e.target.value)} placeholder="Note title" className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={ns} onValueChange={(v) => setNs(v as NoteStatus)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOTE_STATUS.INBOX}>Inbox</SelectItem>
                    <SelectItem value={NOTE_STATUS.TO_REVIEW}>To Review</SelectItem>
                    <SelectItem value={NOTE_STATUS.ACTIVE}>Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={nt} onValueChange={(v) => setNt(v as NoteType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOTE_TYPE.NOTE}>Note</SelectItem>
                    <SelectItem value={NOTE_TYPE.RESEARCH}>Research</SelectItem>
                    <SelectItem value={NOTE_TYPE.JOURNAL}>Journal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notebook</Label>
              <div className="relative">
                <BookOpen className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={nb} onChange={(e) => setNb(e.target.value)} placeholder="Select or create notebook" className="h-9 pl-8" list="notebook-list" />
                <datalist id="notebook-list">
                  {nbs.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={doCreate} disabled={cnM.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}