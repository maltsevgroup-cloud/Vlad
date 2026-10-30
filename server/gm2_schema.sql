-- Gymmaat 3: accounts voor veel gebruikers, in duo's.
-- Volledig apart van de huidige app: nieuw schema gm2, nieuwe functies gm2_*.
-- De bestaande tabellen gm_docs / gm_spaces en functies gm_* worden NIET aangeraakt.

create schema if not exists gm2;
revoke all on schema gm2 from public, anon, authenticated;

create sequence if not exists gm2.rev;

-- Eén rij per account (auth.users), plus wanneer laatst gezien.
create table if not exists gm2.profiles (
  uid uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

-- Een duo = jij en (straks) je trainingsmaat. Iedereen zit in precies één duo, eerst alleen.
create table if not exists gm2.duos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists gm2.members (
  duo_id uuid not null references gm2.duos(id) on delete cascade,
  uid uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (duo_id, uid),
  unique (uid)
);

-- Uitnodigingen: alleen de hash van de code wordt bewaard, 7 dagen geldig, één keer bruikbaar.
create table if not exists gm2.invites (
  hash text primary key,
  duo_id uuid not null references gm2.duos(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);

-- Alle app-gegevens, per duo, met de eigenaar erbij.
create table if not exists gm2.docs (
  duo_id uuid not null references gm2.duos(id) on delete cascade,
  owner uuid not null references auth.users(id) on delete cascade,
  col text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  rev bigint not null default nextval('gm2.rev'),
  updated_at timestamptz not null default now(),
  primary key (duo_id, col, id)
);
create index if not exists docs_duo_rev on gm2.docs (duo_id, rev);
create index if not exists docs_owner on gm2.docs (owner);

-- Beheerders van de hele app (alleen tellingen, nooit inhoud).
create table if not exists gm2.admins (uid uuid primary key references auth.users(id) on delete cascade);

-- Eenvoudige rem tegen misbruik: aantal schrijfacties per account per minuut.
create table if not exists gm2.rate (uid uuid not null, minute timestamptz not null, n int not null default 0, primary key (uid, minute));

alter table gm2.profiles enable row level security;
alter table gm2.duos enable row level security;
alter table gm2.members enable row level security;
alter table gm2.invites enable row level security;
alter table gm2.docs enable row level security;
alter table gm2.admins enable row level security;
alter table gm2.rate enable row level security;
-- Geen policies: niemand kan rechtstreeks aan de tabellen. Alles loopt via de functies hieronder.

-- ---------- hulpfuncties ----------
create or replace function gm2.me() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  return u;
end $$;

-- Zorgt dat het account een profiel en een duo heeft; geeft de duo terug.
create or replace function gm2.my_duo() returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); d uuid;
begin
  insert into gm2.profiles(uid) values (u) on conflict (uid) do update set last_seen = now();
  select m.duo_id into d from gm2.members m where m.uid = u;
  if d is null then
    insert into gm2.duos(created_by) values (u) returning id into d;
    insert into gm2.members(duo_id, uid) values (d, u);
  end if;
  return d;
end $$;

create or replace function gm2.bump() returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); m timestamptz := date_trunc('minute', now()); n int;
begin
  insert into gm2.rate(uid, minute, n) values (u, m, 1)
  on conflict (uid, minute) do update set n = gm2.rate.n + 1 returning gm2.rate.n into n;
  if n > 600 then raise exception 'too_many' using errcode = '54000'; end if;
  delete from gm2.rate where minute < now() - interval '10 minutes';
end $$;

-- ---------- functies voor de app ----------
-- Wie ben ik, in welke duo, met wie.
create or replace function public.gm2_me() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); d uuid := gm2.my_duo();
begin
  return jsonb_build_object('uid', u, 'duo', d,
    'members', (select coalesce(jsonb_agg(m.uid order by m.joined_at), '[]') from gm2.members m where m.duo_id = d),
    'admin', exists(select 1 from gm2.admins a where a.uid = u));
end $$;

-- Nieuwe gegevens van de duo sinds p_rev. Lichaamsgewicht (bw) van de ander nooit.
create or replace function public.gm2_pull(p_rev bigint) returns table(col text, id text, data jsonb, deleted boolean, rev bigint)
language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); d uuid := gm2.my_duo();
begin
  return query select x.col, x.id, x.data, x.deleted, x.rev from gm2.docs x
   where x.duo_id = d and x.rev > coalesce(p_rev, 0) and x.col <> 'bw'
   order by x.rev limit 2000;
end $$;

create or replace function public.gm2_get(p_col text, p_id text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); d uuid := gm2.my_duo(); r jsonb;
begin
  if p_col = 'bw' and p_id <> u::text then return null; end if;
  select x.data into r from gm2.docs x where x.duo_id = d and x.col = p_col and x.id = p_id and not x.deleted;
  return r;
end $$;

-- Opslaan. Je schrijft alleen je eigen gegevens; berichten aan je maat en schema's binnen de duo mogen ook.
create or replace function public.gm2_push(p_col text, p_id text, p_data jsonb) returns bigint language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); d uuid := gm2.my_duo(); us text := u::text; old_owner uuid; mine boolean; r bigint;
begin
  perform gm2.bump();
  if p_col not in ('athletes','plans','sessions','live','custom','bw','schemas','msgs') then raise exception 'bad_col'; end if;
  if p_id is null or length(p_id) = 0 or length(p_id) > 120 then raise exception 'bad_id'; end if;
  if p_data is not null and octet_length(p_data::text) > 262144 then raise exception 'too_large'; end if;
  if (select count(*) from gm2.docs x where x.duo_id = d) > 20000 then raise exception 'full'; end if;

  mine := case p_col
    when 'athletes' then p_id = us
    when 'live' then p_id = us
    when 'bw' then p_id = us
    when 'sessions' then left(p_id, length(us) + 1) = us || '_'
    when 'plans' then p_id in (select m.uid::text from gm2.members m where m.duo_id = d)
    when 'msgs' then p_id in (select m.uid::text from gm2.members m where m.duo_id = d)
    else true end;
  if not mine then raise exception 'not_yours' using errcode = '42501'; end if;

  select x.owner into old_owner from gm2.docs x where x.duo_id = d and x.col = p_col and x.id = p_id;
  -- Eigen schema's en oefeningen: alleen de maker past ze aan.
  if p_col in ('custom','schemas') and old_owner is not null and old_owner <> u then raise exception 'not_yours' using errcode = '42501'; end if;

  -- Berichten en schema's horen bij wie ze bedoeld zijn (die neemt ze mee bij vertrek of verwijdering).
  insert into gm2.docs as x (duo_id, owner, col, id, data, deleted)
  values (d, case when p_col in ('plans','msgs') then p_id::uuid else coalesce(old_owner, u) end, p_col, p_id, p_data, p_data is null)
  on conflict (duo_id, col, id) do update
    set data = excluded.data, deleted = excluded.deleted, rev = nextval('gm2.rev'), updated_at = now()
  returning x.rev into r;
  return r;
end $$;

create or replace function public.gm2_export() returns table(col text, id text, data jsonb) language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); d uuid := gm2.my_duo();
begin
  return query select x.col, x.id, x.data from gm2.docs x
   where x.duo_id = d and not x.deleted and x.data is not null and (x.col <> 'bw' or x.id = u::text) order by x.col, x.id;
end $$;

-- Uitnodiging maken (alleen zolang je nog alleen bent). Geeft de code één keer terug.
create or replace function public.gm2_invite() returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); d uuid := gm2.my_duo(); c text;
begin
  perform gm2.bump();
  if (select count(*) from gm2.members m where m.duo_id = d) >= 2 then raise exception 'duo_full'; end if;
  if (select count(*) from gm2.invites i where i.created_by = u and i.created_at > now() - interval '1 day') >= 10 then raise exception 'too_many'; end if;
  c := lower(substr(replace(encode(extensions.gen_random_bytes(9), 'base64'), '/', 'x'), 1, 10));
  c := regexp_replace(c, '[^a-z0-9]', 'k', 'g');
  insert into gm2.invites(hash, duo_id, created_by) values (encode(extensions.digest(c, 'sha256'), 'hex'), d, u);
  return c;
end $$;

-- Uitnodiging aanvaarden: je eigen gegevens verhuizen mee naar de duo van wie je uitnodigde.
create or replace function public.gm2_join(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); mine uuid := gm2.my_duo(); inv gm2.invites; n int;
begin
  perform gm2.bump();
  select * into inv from gm2.invites i where i.hash = encode(extensions.digest(lower(trim(coalesce(p_code,''))), 'sha256'), 'hex');
  if inv.hash is null or inv.used_by is not null or inv.expires_at < now() then raise exception 'bad_invite'; end if;
  if inv.duo_id = mine then raise exception 'own_invite'; end if;
  select count(*) into n from gm2.members m where m.duo_id = inv.duo_id;
  if n >= 2 then raise exception 'duo_full'; end if;
  if (select count(*) from gm2.members m where m.duo_id = mine) > 1 then raise exception 'leave_first'; end if;
  -- eigen gegevens meenemen (botsingen kunnen niet: alles draagt je eigen id)
  update gm2.docs x set duo_id = inv.duo_id, rev = nextval('gm2.rev'), updated_at = now() where x.duo_id = mine and x.owner = u;
  delete from gm2.members m where m.uid = u;
  delete from gm2.duos o where o.id = mine and not exists (select 1 from gm2.members m where m.duo_id = mine);
  insert into gm2.members(duo_id, uid) values (inv.duo_id, u);
  update gm2.invites i set used_by = u, used_at = now() where i.hash = inv.hash;
  return public.gm2_me();
end $$;

-- Duo verlaten: je neemt je eigen gegevens mee naar een nieuwe duo voor jou alleen.
create or replace function public.gm2_leave() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); old uuid := gm2.my_duo(); nd uuid;
begin
  if (select count(*) from gm2.members m where m.duo_id = old) < 2 then return public.gm2_me(); end if;
  insert into gm2.duos(created_by) values (u) returning id into nd;
  update gm2.docs x set duo_id = nd, rev = nextval('gm2.rev'), updated_at = now() where x.duo_id = old and x.owner = u;
  -- berichten en schema's voor jou gaan mee, die voor je ex-maat blijven bij hem of haar
  delete from gm2.members m where m.uid = u;
  insert into gm2.members(duo_id, uid) values (nd, u);
  return public.gm2_me();
end $$;

-- Account en alle eigen gegevens definitief verwijderen.
create or replace function public.gm2_delete_me() returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me(); d uuid := gm2.my_duo();
begin
  delete from gm2.docs x where x.owner = u;
  delete from gm2.members m where m.uid = u;
  delete from gm2.duos o where o.id = d and not exists (select 1 from gm2.members m where m.duo_id = d);
  delete from auth.users where id = u;
  return true;
end $$;

-- Tellingen voor de app-beheerder, zonder inhoud.
create or replace function public.gm2_stats() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := gm2.me();
begin
  if not exists (select 1 from gm2.admins a where a.uid = u) then raise exception 'no_admin' using errcode = '42501'; end if;
  return jsonb_build_object(
    'accounts', (select count(*) from gm2.profiles),
    'actief_vandaag', (select count(*) from gm2.profiles p where p.last_seen > now() - interval '1 day'),
    'actief_week', (select count(*) from gm2.profiles p where p.last_seen > now() - interval '7 days'),
    'duos', (select count(*) from (select m.duo_id from gm2.members m group by m.duo_id having count(*) = 2) z),
    'trainingen_vandaag', (select count(*) from gm2.docs x where x.col = 'sessions' and x.updated_at > now() - interval '1 day'));
end $$;

revoke all on all functions in schema gm2 from public, anon, authenticated;
revoke all on function public.gm2_me(), public.gm2_pull(bigint), public.gm2_get(text,text), public.gm2_push(text,text,jsonb),
  public.gm2_export(), public.gm2_invite(), public.gm2_join(text), public.gm2_leave(), public.gm2_delete_me(), public.gm2_stats() from public, anon;
grant execute on function public.gm2_me(), public.gm2_pull(bigint), public.gm2_get(text,text), public.gm2_push(text,text,jsonb),
  public.gm2_export(), public.gm2_invite(), public.gm2_join(text), public.gm2_leave(), public.gm2_delete_me(), public.gm2_stats() to authenticated;
