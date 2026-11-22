create table public.campaigns (
  id text primary key,
  data jsonb not null,
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
create policy owner_read on public.campaigns for select to authenticated
using ((select auth.jwt()->>'email') = 'owner@example.com');
-- The browser can read only. An atomic, owner-checked RPC is the sole edit path.
revoke all on public.campaigns from anon, authenticated;
grant select on public.campaigns to authenticated;
create table public.integrations (
  id text primary key check (id='blotato'),
  encrypted_key text not null,
  updated_at timestamptz not null default now()
);
alter table public.integrations enable row level security;
create policy owner_integrations on public.integrations for all to authenticated
using ((select auth.jwt()->>'email')='owner@example.com')
with check ((select auth.jwt()->>'email')='owner@example.com');
revoke all on public.integrations from anon;
grant select,insert,update on public.integrations to authenticated;
create or replace function public.update_campaign_post(post_id text, expected_version integer, new_post jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare c jsonb; current_post jsonb; updated_posts jsonb;
begin
  if coalesce(auth.jwt()->>'email','') <> 'owner@example.com' then
    raise exception 'Not allowed';
  end if;
  select data into c from public.campaigns where id='weekathon' for update;
  select p into current_post from jsonb_array_elements(c->'posts') p where p->>'id'=post_id;
  if current_post is null or (current_post->>'version')::integer <> expected_version then
    return false;
  end if;
  if new_post->>'id' <> post_id or (new_post->>'version')::integer <> expected_version+1 then
    raise exception 'Invalid revision';
  end if;
  -- No route to publish from this RPC: campaign data is an editorial workspace only.
  select jsonb_agg(case when p->>'id'=post_id then new_post else p end order by n)
  into updated_posts from jsonb_array_elements(c->'posts') with ordinality as t(p,n);
  update public.campaigns set data=jsonb_set(c,'{posts}',updated_posts),
    revision=revision+1,updated_at=now() where id='weekathon';
  return true;
end $$;
revoke all on function public.update_campaign_post(text,integer,jsonb) from public;
grant execute on function public.update_campaign_post(text,integer,jsonb) to authenticated;
