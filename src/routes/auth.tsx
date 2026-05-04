import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Study Buddy" }] }),
});

const emailSchema = z.string().email("Enter a valid email").max(255);
const passSchema = z.string().min(6, "At least 6 characters").max(72);

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleEmail = async (mode: "signin" | "signup") => {
    try {
      emailSchema.parse(email);
      passSchema.parse(password);
    } catch (e) {
      const msg = e instanceof z.ZodError ? e.issues[0].message : "Invalid input";
      return toast.error(msg);
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome! Check your inbox to verify, or sign in if already verified.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/dashboard` });
      if (result.error) throw new Error(result.error.message || "Google sign in failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign in failed");
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex relative items-center justify-center bg-gradient-to-br from-primary/10 via-cyan/10 to-sunshine/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50 blur-3xl" />
        <div className="relative text-center px-8 z-10">
          <Mascot size={260} />
          <h2 className="text-3xl font-bold mt-6 max-w-sm">Your study buddy is waiting.</h2>
          <p className="text-muted-foreground mt-3 max-w-sm">Join thousands of students grinding chapters together.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md glass rounded-3xl p-8 shadow-glow animate-slide-up">
          <h1 className="text-3xl font-bold mb-2">Hey there! 👋</h1>
          <p className="text-muted-foreground mb-6 text-sm">Sign in or create an account to find your buddy.</p>

          <Button onClick={handleGoogle} variant="outline" className="w-full mb-4 rounded-xl h-11">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C40.9 35.4 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full rounded-xl">
              <TabsTrigger value="signin" className="rounded-lg">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-3 mt-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl" /></div>
              <Button disabled={busy} onClick={() => handleEmail("signin")} className="w-full rounded-xl bg-gradient-to-r from-primary to-cyan h-11">{busy ? "..." : "Sign in"}</Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 mt-4">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" className="rounded-xl" maxLength={60} /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl" /></div>
              <Button disabled={busy} onClick={() => handleEmail("signup")} className="w-full rounded-xl bg-gradient-to-r from-primary to-cyan h-11">{busy ? "..." : "Create account"}</Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
