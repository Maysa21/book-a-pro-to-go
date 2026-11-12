<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Ordinary data access goes directly from the browser through the Cloud client with RLS; booking overlap is enforced by a DB trigger and free slots come from the get_busy_slots RPC so clients never read other people's bookings.
- Self-account deletion is an authenticated server function with no caller-supplied user ID; it revalidates Auth, removes owner photos via Storage API, then deletes the caller through Auth admin. Profile cascade triggers remove the owner's establishment and associated records atomically, including deletion outside the app.
- Account type (client/professional) lives in `user_roles`, set by the signup trigger from sign-up metadata.
- Self-account editing uses owner-scoped browser profile updates and Auth for passwords; account type changes use the authenticated set_my_account_type RPC, which accepts only client/professional for auth.uid() and preserves admin roles and existing records.
- Establishment photos use owner-prefixed paths in private Cloud storage; storage reads are owner-only, and published photos get expiring URLs from a public server function that checks the business is published and owns the path.
- Meu espaço uses local overview/create/details navigation; service controls are rendered only for a saved establishment explicitly opened from the overview, keeping creation separate from service management.
