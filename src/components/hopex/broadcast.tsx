import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GlassCard } from "@/components/hopex/glass";
import { cn } from "@/lib/utils";
import { useAction, useMutation } from "convex/react";
import { BellRing, Megaphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminData } from "@/hooks/use-admin";

type AdminUserRow = {
  userId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

function filterUsers(users: AdminUserRow[], list: Set<string>, q: string) {
  return users.filter((u) =>
    q.trim()
      ? `${u.name} ${u.phone ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q.toLowerCase()) ||
        list.has(u.userId)
      : true,
  );
}

function toggleIn(list: Set<string>, setList: (v: Set<string>) => void, id: string) {
  const next = new Set(list);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setList(next);
}

function TargetPicker({
  target,
  setTarget,
}: {
  target: "all" | "specific";
  setTarget: (t: "all" | "specific") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary/50 p-1">
      {(["all", "specific"] as const).map((t) => (
        <button
          type="button"
          key={t}
          onClick={() => setTarget(t)}
          className={cn(
            "rounded-xl py-2 text-center text-sm font-semibold transition",
            target === t ? "gradient-cool text-primary-foreground shadow" : "text-muted-foreground",
          )}
        >
          {t === "all" ? "All users" : "Specific users"}
        </button>
      ))}
    </div>
  );
}

function UserPicker({
  users,
  list,
  setList,
  search,
  setSearch,
}: {
  users: AdminUserRow[];
  list: Set<string>;
  setList: (v: Set<string>) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const visible = filterUsers(users, list, search);
  return (
    <div className="rounded-2xl border border-border/60 p-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users…"
        className="h-10 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
      />
      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
        {visible.map((u) => {
          const on = list.has(u.userId);
          return (
            <label
              key={u.userId}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-accent/40"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggleIn(list, setList, u.userId)}
                className="h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.name}</span>
              <span className="shrink-0 truncate text-[11px] text-muted-foreground">
                {u.phone ?? u.email ?? ""}
              </span>
            </label>
          );
        })}
        {visible.length === 0 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">No users found.</p>
        ) : null}
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">{list.size} selected</p>
    </div>
  );
}

export function AppBroadcastPanel() {
  const { users } = useAdminData();
  const broadcast = useMutation(api.notifications.adminBroadcast);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [target, setTarget] = useState<"all" | "specific">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return toast.error("Title and message are required.");
    if (target === "specific" && selected.size === 0) return toast.error("Select at least one user.");
    setBusy(true);
    try {
      const userIds = target === "all" ? undefined : (Array.from(selected) as Id<"users">[]);
      const n = await broadcast({
        title: title.trim(),
        body: body.trim(),
        image: image.trim() || undefined,
        userIds,
        popup: true,
      });
      toast.success(`App notification sent to ${n} user(s).`);
      setTitle("");
      setBody("");
      setImage("");
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <BellRing className="h-4 w-4" />
        </span>
        App notification broadcast
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        App aur website ke andar notification bell + top popup me dikhti hai (image ke sath bhi).
      </p>
      <form onSubmit={send} className="mt-4 space-y-3">
        <TargetPicker target={target} setTarget={setTarget} />
        {target === "specific" ? (
          <UserPicker users={users} list={selected} setList={setSelected} search={search} setSearch={setSearch} />
        ) : null}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="Image URL (optional) — popup me dikhegi"
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message"
          rows={3}
          className="w-full rounded-xl border border-input bg-background/40 p-4 text-sm outline-none"
        />
        <button
          disabled={busy}
          className="h-12 w-full rounded-xl btn-glass btn-glass-primary font-semibold disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send app notification"}
        </button>
      </form>
    </GlassCard>
  );
}

export function PushBroadcastPanel() {
  const { users } = useAdminData();
  const sendPush = useAction(api.pushNode.adminSendPush);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "specific">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return toast.error("Title and message are required.");
    if (target === "specific" && selected.size === 0) return toast.error("Select at least one user.");
    setBusy(true);
    try {
      const userIds = target === "all" ? undefined : (Array.from(selected) as Id<"users">[]);
      const devices = await sendPush({ title: title.trim(), body: body.trim(), userIds });
      toast.success(`Phone push sent to ${devices} device(s).`);
      setTitle("");
      setBody("");
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not send push");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-success/15 text-success">
          <Megaphone className="h-4 w-4" />
        </span>
        Web / phone push broadcast
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        User ke phone par real push notification — app band ho to bhi. Sirf unko jayegi jinhone app
        me notifications Allow ki hain (VAPID keys Keys tab me set karni hain).
      </p>
      <form onSubmit={send} className="mt-4 space-y-3">
        <TargetPicker target={target} setTarget={setTarget} />
        {target === "specific" ? (
          <UserPicker users={users} list={selected} setList={setSelected} search={search} setSearch={setSearch} />
        ) : null}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message"
          rows={3}
          className="w-full rounded-xl border border-input bg-background/40 p-4 text-sm outline-none"
        />
        <button
          disabled={busy}
          className="h-12 w-full rounded-xl gradient-brand font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send phone push"}
        </button>
      </form>
    </GlassCard>
  );
}
