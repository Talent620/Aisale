"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Podaj poprawny e-mail"),
  password: z.string().min(1, "Podaj hasło"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Błędny e-mail lub hasło");
      return;
    }
    router.push(params.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full">
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Witaj ponownie</h1>
        <p className="text-sm text-muted-foreground">Zaloguj się do swojego systemu sprzedaży.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Hasło</Label>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
          {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zaloguj się"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Załóż je
        </Link>
      </p>

      <div className="mt-8 rounded-md border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Logowanie demo</p>
        <p className="mt-1">owner@northstar.studio · demo1234</p>
      </div>
    </div>
  );
}
