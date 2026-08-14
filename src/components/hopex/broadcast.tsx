import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GlassCard } from "@/components/hopex/glass";
import { cn } from "@/lib/utils";
import { useAction, useMutation } from "convex/react";
import {
  BellRing,
  CheckCircle2,
  KeyRound,
  Loader2,
  Megaphone,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
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

/**
 * VAPID key setup — the #1 reason phone pushes fail with a generic "Server
 * Error". Lets the admin paste the two keys right here (stored in the DB via
 * the apiKeys pool, provider "vapid") and verify them with a real key check
 * before ever sending a push. Env vars in the Freebuff Keys tab still win.
 */
export function VapidSetupCard() {
  const { apiKeys } = useAdminData();
  const upsert = useMutation(api.admin.adminUpsertApiKey);
  const check = useAction(api.pushNode.checkVapidSetup);
  const generate = useAction(api.pushNode.generateVapidKeys);

  const saved = (purpose: string) =>
    apiKeys.find((k) => k.provider === "vapid" && k.purpose === purpose && k.active)?.apiKey ?? "";

  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  // Prefill with any keys already saved in the panel once they load.
  useEffect(() => {
    const pub = saved("VAPID_PUBLIC_KEY");
    const prv = saved("VAPID_PRIVATE_KEY");
    if (pub) setPublicKey((v) => v || pub);
    if (prv) setPrivateKey((v) => v || prv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeys]);

  const saveKeys = async () => {
    if (!publicKey.trim() || !privateKey.trim()) {
      return setStatus({ ok: false, message: "Paste both keys first — Public VAPID Key and Private Key." });
    }
    setSaving(true);
    try {
      await upsert({
        provider: "vapid",
        label: "VAPID public key",
        apiKey: publicKey.trim(),
        purpose: "VAPID_PUBLIC_KEY",
        active: true,
      });
      await upsert({
        provider: "vapid",
        label: "VAPID private key",
        apiKey: privateKey.trim(),
        purpose: "VAPID_PRIVATE_KEY",
        active: true,
      });
      setStatus({ ok: true, message: "Keys saved. Now press Check setup to confirm they work." });
    } catch (e) {
      setStatus({ ok: false, message: e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not save keys" });
    } finally {
      setSaving(false);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await check({});
      if (res.ok) {
        setStatus({ ok: true, message: `Push is ready to send — keys verified (${res.source ?? "saved keys"}).` });
      } else {
        setStatus({ ok: false, message: res.error ?? "Setup incomplete." });
      }
    } catch (e) {
      setStatus({ ok: false, message: e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Check failed" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold/15 text-gold">
            <KeyRound className="h-4 w-4" />
          </span>
          Push keys (VAPID) — setup
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Phone pushes fail with "Server Error" when these keys are missing or wrong. Paste the two keys from
          your push service here, save, then press <b>Check setup</b> — it verifies the keys without sending
          anything. Keys set in the Freebuff Keys tab (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) automatically take
          priority.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              Public VAPID Key (browser uses this to subscribe)
            </span>
            <input
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="BLU…"
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 font-mono text-xs outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              Private VAPID Key (server signs the push)
            </span>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="k1_…"
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 font-mono text-xs outline-none"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => void saveKeys()}
            disabled={saving}
            className="btn-glass flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-black disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save keys
          </button>
          <button
            onClick={() => void runCheck()}
            disabled={checking}
            className="btn-glass btn-glass-gold flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-black disabled:opacity-60"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Check setup
          </button>
          <button
            onClick={async () => {
              if (!confirm("Generate a fresh key pair? This replaces any saved keys — devices that already allowed notifications will need to allow them once more.")) return;
              setGenerating(true);
              try {
                const pair = await generate({});
                setPublicKey(pair.publicKey);
                setPrivateKey(pair.privateKey);
                setStatus({
                  ok: true,
                  message:
                    "Fresh keys generated (guaranteed valid). Press Save keys, then Check setup. Give the PUBLIC key to your app/push service — the PRIVATE key stays here on the server.",
                });
              } catch (e) {
                setStatus({ ok: false, message: e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Generation failed" });
              } finally {
                setGenerating(false);
              }
            }}
            disabled={generating}
            className="btn-glass flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-black disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Generate pair
          </button>
        </div>

        {status ? (
          <div
            className={cn(
              "mt-4 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm",
              status.ok
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {status.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="whitespace-pre-line break-words leading-relaxed">{status.message}</span>
          </div>
        ) : null}
      </div>
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
    <>
      <VapidSetupCard />
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
    </>
  );
}
