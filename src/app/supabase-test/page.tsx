import { createClient } from "@/utils/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  // Test session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Test database query
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*");

  return (
    <main style={{ padding: "40px" }}>
      <h1>Supabase Test Page</h1>

      <h2>Session</h2>
      <pre>{JSON.stringify(session, null, 2)}</pre>

      <h2>Profiles</h2>

      {error ? (
        <pre>{JSON.stringify(error, null, 2)}</pre>
      ) : (
        <pre>{JSON.stringify(profiles, null, 2)}</pre>
      )}
    </main>
  );
}