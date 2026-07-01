import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createClientCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; handle: string }) => {
    const name = input.name.trim();
    const handle = input.handle.trim().replace(/^@/, "").toLowerCase();
    if (!name) throw new Error("Nome obrigatório");
    if (!/^[a-z0-9._-]{2,}$/.test(handle)) throw new Error("Handle inválido");
    return { name, handle };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const newId = crypto.randomUUID();
    const { data: created, error } = await supabaseAdmin
      .from("profiles")
      .insert({ id: newId, name: data.name, handle: data.handle })
      .select("id, access_pin")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Falha ao criar empresa");

    return { ok: true as const, userId: created.id, pin: created.access_pin };
  });

export const deleteClientCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("posts").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
