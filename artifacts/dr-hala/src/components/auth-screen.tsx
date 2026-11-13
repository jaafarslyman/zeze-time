import { useState, type FormEvent } from "react";
import { Heart, Sparkles } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthScreenProps = {
  client: SupabaseClient;
  initialError?: string;
};

export function AuthScreen({ client, initialError }: AuthScreenProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Check your email for a confirmation link, then come back to sign in.");
          setMode("sign-in");
        }
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "We couldn't complete that request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-[30px] border border-pink-100 bg-white/90 p-7 shadow-[0_22px_70px_rgba(135,91,117,.14)] sm:p-9">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-pink-50 text-[hsl(var(--primary))]">
            <Heart size={21} />
          </span>
          <p className="serif-display text-3xl text-[hsl(var(--foreground))]">zeze time</p>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {mode === "sign-in"
              ? "Your little study nook, ready when you are."
              : "Make a private space for your study plans."}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-pink-50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setError("");
              setNotice("");
            }}
            className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${mode === "sign-in" ? "bg-white text-[hsl(var(--primary))] shadow-sm" : "text-[hsl(var(--muted-foreground))]"}`}
            aria-pressed={mode === "sign-in"}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sign-up");
              setError("");
              setNotice("");
            }}
            className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${mode === "sign-up" ? "bg-white text-[hsl(var(--primary))] shadow-sm" : "text-[hsl(var(--muted-foreground))]"}`}
            aria-pressed={mode === "sign-up"}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]">
            <span>Email address</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--input))] bg-white px-3 py-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
              placeholder="you@example.com"
            />
          </label>
          <label className="block space-y-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={mode === "sign-up" ? 8 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--input))] bg-white px-3 py-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
              placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-sky-50 px-3 py-2.5 text-sm leading-5 text-sky-800">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            <Sparkles size={15} />
            {busy ? "One moment..." : mode === "sign-in" ? "Sign in to Zeze Time" : "Create my account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Your study data is private to your account.
        </p>
      </section>
    </main>
  );
}
