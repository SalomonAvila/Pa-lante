"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function ConectarGmailButton() {
  const supabase = createClient();

  return (
    <Button
      type="button"
      className="mt-4 w-full"
      onClick={() =>
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            scopes: GMAIL_SCOPE,
            queryParams: { access_type: "offline", prompt: "consent" },
          },
        })
      }
    >
      Conectar Gmail
    </Button>
  );
}
