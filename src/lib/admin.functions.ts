import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createClientCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; name: string; handle: string }) => {
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    const name = input.name.trim();
    const handle = input.handle.trim().replace(/^@/, "").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email inválido");
    if (password.length < 6) throw new Error("Senha precisa ter 6+ caracteres");
    if (!name) throw new Error("Nome obrigatório");
    if (!/^[a-z0-9._-]{2,}$/.test(handle)) throw new Error("Handle inválido");
    return { email, password, name, handle };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, handle: data.handle },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Falha ao criar usuário");

    const uid = created.user.id;

    await supabaseAdmin.from("profiles").update({
      name: data.name,
      handle: data.handle,
    }).eq("id", uid);

    const { error: credErr } = await supabaseAdmin.from("client_credentials").upsert({
      user_id: uid,
      email: data.email,
      password: data.password,
      created_by: context.userId,
    });
    if (credErr) throw new Error(credErr.message);

    return { ok: true as const, userId: uid };
  });

export const updateClientPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if (input.password.length < 6) throw new Error("Senha precisa ter 6+ caracteres");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("client_credentials")
      .update({ password: data.password })
      .eq("user_id", data.userId);
    return { ok: true as const };
  });
