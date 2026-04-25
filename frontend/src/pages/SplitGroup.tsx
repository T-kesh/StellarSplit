import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Users,
  TrendingUp,
  Clock,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Badge } from "@components/ui/badge";
import { cn, formatCurrency } from "@utils/format";
import { type Group } from "@src/types/split-group";
import { GroupCard } from "@components/SplitGroup/GroupCard";
import { CreateGroupModal } from "@components/SplitGroup/CreateGroupModal";
import { getSplitGroupDataSource } from "@src/services/splitGroupDataSource";

type SortKey = "recent" | "name" | "spent";

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-20 w-20 rounded-3xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center mb-5 text-4xl">
        👥
      </div>
      <h3 className="text-lg font-bold text-zinc-200 mb-2">No groups yet</h3>
      <p className="text-sm text-zinc-500 max-w-xs mb-6">
        Create a group to start splitting expenses with friends, family, or
        housemates.
      </p>
      <Button
        onClick={onCreate}
        className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold gap-2"
      >
        <Plus className="h-4 w-4" />
        Create your first group
      </Button>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: (accent ?? "#f59e0b") + "18" }}
      >
        <span style={{ color: accent ?? "#f59e0b" }}>{icon}</span>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-bold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

export default function SplitGroup() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [splitFeedback, setSplitFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const ds = getSplitGroupDataSource();
    ds.list()
      .then((loaded) => {
        if (mounted) setGroups(loaded);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const recentGroups = useMemo(
    () =>
      [...groups]
        .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
        .slice(0, 3),
    [groups],
  );

  const filteredGroups = useMemo(() => {
    let list = [...groups];

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (group) =>
          group.name.toLowerCase().includes(q) ||
          group.description?.toLowerCase().includes(q) ||
          group.members.some((member) => member.name.toLowerCase().includes(q)),
      );
    }

    if (sort === "recent") {
      list.sort(
        (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
      );
    }

    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sort === "spent") {
      list.sort((a, b) => b.totalSpent - a.totalSpent);
    }

    return list;
  }, [groups, query, sort]);

  const totalSpent = useMemo(
    () => groups.reduce((sum, group) => sum + group.totalSpent, 0),
    [groups],
  );
  const totalMembers = useMemo(
    () =>
      new Set(groups.flatMap((group) => group.members.map((member) => member.id)))
        .size,
    [groups],
  );

  const handleCreated = async (group: Group) => {
    const optimistic = [group, ...groups];
    setGroups(optimistic);
    await getSplitGroupDataSource().create(group);
  };
  const handleUpdate = async (group: Group) => {
    const previous = groups;
    const optimistic = previous.map((entry) =>
      entry.id === group.id ? group : entry,
    );
    setGroups(optimistic);
    try {
      await getSplitGroupDataSource().update(group);
    } catch {
      setGroups(previous);
    }
  };
  const handleDelete = async (id: string) => {
    const previous = groups;
    const optimistic = previous.filter((group) => group.id !== id);
    setGroups(optimistic);
    try {
      await getSplitGroupDataSource().remove(id);
    } catch {
      setGroups(previous);
    }
  };
  const handleCreateSplit = async (group: Group) => {
    const updated = await getSplitGroupDataSource().touchSplit(group.id);
    if (updated) {
      setGroups((prev) =>
        prev.map((entry) => (entry.id === updated?.id ? updated : entry)),
      );
    }
    setSplitFeedback(`Split creation started for "${group.name}".`);
    window.setTimeout(() => setSplitFeedback(null), 2500);
  };

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "recent", label: "Recent" },
    { key: "name", label: "A-Z" },
    { key: "spent", label: "Spent" },
  ];

  return (
    <div className="min-h-screen p-6">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 0%, rgba(245, 158, 11, 0.04) 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 100%, rgba(59, 130, 246, 0.04) 0%, transparent 60%)`,
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">💳</span>
              <h1 className="text-2xl font-extrabold text-theme tracking-tight">
                Groups
              </h1>
              {groups.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 text-xs border-zinc-700 text-zinc-400 bg-zinc-800/60"
                >
                  {groups.length}
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500">
              Manage shared expenses with your people
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold gap-1.5 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30"
          >
            <Plus className="h-4 w-4" />
            New Group
          </Button>
        </div>

        {splitFeedback && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {splitFeedback}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-zinc-500 py-8">Loading groups...</div>
        ) : groups.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatPill
              icon={<Users className="h-4 w-4" />}
              label="Total groups"
              value={`${groups.length}`}
              accent="#f59e0b"
            />
            <StatPill
              icon={<TrendingUp className="h-4 w-4" />}
              label="Total spent"
              value={formatCurrency(totalSpent)}
              accent="#10b981"
            />
            <StatPill
              icon={<Users className="h-4 w-4" />}
              label="Unique members"
              value={`${totalMembers}`}
              accent="#3b82f6"
            />
          </div>
        )}

        {recentGroups.length > 0 && !query && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Recently Active
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isRecent
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onCreateSplit={handleCreateSplit}
                />
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search groups, members…"
              className="pl-9 pr-9 bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50 h-10"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-zinc-800/60 border border-zinc-700 rounded-lg p-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500 ml-1.5 mr-0.5" />
            {sortOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setSort(option.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  sort === option.key
                    ? "bg-amber-500 text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? null : filteredGroups.length === 0 && query ? (
          <div className="text-center py-16 text-zinc-500">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No groups match &ldquo;{query}&rdquo;</p>
            <button
              onClick={() => setQuery("")}
              className="text-amber-500 text-sm mt-1 hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div>
            {!query && (
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  All Groups
                </h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onCreateSplit={handleCreateSplit}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateGroupModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
