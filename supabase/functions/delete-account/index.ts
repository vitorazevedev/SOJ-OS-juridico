import { createClient } from 'npm:@supabase/supabase-js@2'

// STORY-007 (LGPD Art. 18 — direito de eliminação): permanently deletes the caller's
// organization and everything tied to it (contracts, analyses, obligations, generated
// contracts, Storage files) plus the caller's auth user. Requires service_role because
// deleting an auth.users row is an admin-only operation.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Storage.list() only returns one level — recurse into subfolders (items with id === null)
// to collect every file path under the org's prefix (covers contracts/, generated/, logo/).
async function listAllFiles(
  client: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error || !data) return []

  const files: string[] = []
  for (const entry of data) {
    const entryPath = `${prefix}/${entry.name}`
    if (entry.id === null) {
      files.push(...(await listAllFiles(client, bucket, entryPath)))
    } else {
      files.push(entryPath)
    }
  }
  return files
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Identify the caller's org via the get_org_id() RPC, which resolves auth.uid() from
  // the JWT in the Authorization header — the same trust boundary every other Edge
  // Function in this project uses for RLS. (auth.getUser() with no argument depends on
  // an internal client session, not on the forwarded header, and fails here.)
  const { data: orgId, error: orgErr } = await userClient.rpc('get_org_id')
  if (orgErr || !orgId) {
    return jsonResponse({ error: 'User or organization not found' }, 404)
  }

  try {
    // 1. Collect every org member's auth id before the org row (and its FK-cascaded
    // `users` rows) disappear. Also collect Storage paths now, while the contract rows
    // (and thus the org prefix) still exist — the actual removal happens after the DB
    // delete succeeds (step 3), not before.
    const { data: orgUsers } = await serviceClient
      .from('users')
      .select('id')
      .eq('org_id', orgId)
    const userIds = (orgUsers ?? []).map((u: { id: string }) => u.id)

    const filePaths = await listAllFiles(serviceClient, 'contracts', orgId)

    // 2. Delete the organization — cascades to contracts, contract_contents,
    // contract_analyses, clause_risks, financial_impacts, contract_obligations,
    // generated_contracts and users (all confirmed ON DELETE CASCADE). Deliberately
    // done BEFORE Storage/auth cleanup: this is the only step wrapped in a Postgres
    // transaction, so if it fails, nothing destructive has happened yet. Storage removal
    // and auth.users deletion are separate API calls with no shared transaction — running
    // them first would risk deleting files/logins while the DB rows (and the PII in them)
    // survive a later failure, which is the worse failure mode for a "right to erasure"
    // feature.
    const { error: deleteOrgErr } = await serviceClient
      .from('organizations')
      .delete()
      .eq('id', orgId)
    if (deleteOrgErr) throw deleteOrgErr

    // 3. Delete all Storage objects under this org's prefix (contracts, generated docs, logo).
    if (filePaths.length > 0) {
      await serviceClient.storage.from('contracts').remove(filePaths)
    }

    // 4. Delete each org member's auth.users entry (admin-only operation).
    for (const id of userIds) {
      await serviceClient.auth.admin.deleteUser(id)
    }

    return jsonResponse({ success: true, deleted_users: userIds.length, deleted_files: filePaths.length })
  } catch (err) {
    console.error('delete-account error:', err)
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return jsonResponse({ error: message }, 500)
  }
})
