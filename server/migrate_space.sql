-- Gymmaat 3: de bestaande gegevens (oude app met toegangscode) KOPIËREN naar de accounts.
-- De oude tabel gm_docs wordt alleen gelezen, nooit gewijzigd of gewist. Zo kan de oude app blijven werken tot iedereen over is.
-- Volgorde:
--   1. Elke persoon vult op de nieuwe app zijn e-mailadres in en vraagt de inlogmail (het account bestaat dan), maar maakt nog GEEN profiel.
--   2. Beheerder voert uit:  select gm2.migrate_space('{"<space-id-1>":"gebruiker1@...","<space-id-2>":"gebruiker2@..."}'::jsonb, 'beheerder@...');
--   3. Daarna inloggen met de code uit de mail: alles staat er.
create or replace function gm2.migrate_space(p_map jsonb, p_admin_email text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare sp text; k text; v_uid uuid; m jsonb := '{}'; d uuid; n int := 0; r record; nid text; owner_ uuid; dat jsonb; first_uid uuid;
begin
  -- 1. oude ruimte zoeken: die waarin al deze profielen staan
  select g.space into sp from public.gm_docs g where g.col='athletes' and g.id in (select jsonb_object_keys(p_map)) and not g.deleted
   group by g.space having count(*) = (select count(*) from jsonb_object_keys(p_map));
  if sp is null then raise exception 'oude profielen niet samen gevonden'; end if;
  if (select count(*) from jsonb_object_keys(p_map)) > 2 then raise exception 'maximaal 2 personen per duo'; end if;
  -- 2. accounts opzoeken (moeten al bestaan: inlogmail aangevraagd)
  for k in select jsonb_object_keys(p_map) loop
    select u.id into v_uid from auth.users u where lower(u.email) = lower(p_map->>k);
    if v_uid is null then raise exception 'geen account voor %; laat eerst de inlogmail aanvragen', p_map->>k; end if;
    if exists(select 1 from gm2.docs x where x.owner = v_uid) then raise exception '% heeft al gegevens in de nieuwe app; migratie gestopt, er is niets gewijzigd', p_map->>k; end if;
    m := m || jsonb_build_object(k, v_uid::text); if first_uid is null then first_uid := v_uid; end if;
  end loop;
  -- 3. één duo met beiden
  insert into gm2.duos(created_by) values (first_uid) returning id into d;
  for k in select jsonb_object_keys(m) loop
    v_uid := (m->>k)::uuid;
    insert into gm2.profiles(uid) values (v_uid) on conflict (uid) do nothing;
    delete from gm2.members x where x.uid = v_uid;
    insert into gm2.members(duo_id, uid) values (d, v_uid);
  end loop;
  delete from gm2.duos o where o.id <> d and not exists (select 1 from gm2.members x where x.duo_id = o.id) and o.created_by in (select (value #>> '{}')::uuid from jsonb_each(m));
  -- 4. documenten kopiëren met nieuwe id's
  for r in select g.col, g.id, g.data from public.gm_docs g where g.space = sp and not g.deleted and g.data is not null loop
    nid := null; owner_ := null; dat := r.data;
    if r.col in ('athletes','plans','live','bw') then
      if m ? r.id then nid := m->>r.id; owner_ := nid::uuid;
        if r.col = 'athletes' then dat := dat - 'pinH' - 'dev'; if coalesce(dat->>'loc','') = '' then dat := dat || '{"loc":"MyGym Hoeselt"}'; end if; end if; end if;  -- vroegere standaardlocatie behouden
    elsif r.col = 'sessions' then
      if m ? (dat->>'aid') then owner_ := (m->>(dat->>'aid'))::uuid; nid := owner_::text || substr(r.id, length(dat->>'aid') + 1);
        if left(r.id, length(dat->>'aid') + 1) <> (dat->>'aid') || '_' then nid := owner_::text || '_' || r.id; end if;
        dat := jsonb_set(dat, '{aid}', to_jsonb(owner_::text)); end if;
    elsif r.col = 'schemas' then
      if m ? (dat->>'owner') then owner_ := (m->>(dat->>'owner'))::uuid; nid := r.id; dat := jsonb_set(dat, '{owner}', to_jsonb(owner_::text)); end if;
    elsif r.col = 'msgs' then
      if m ? r.id then nid := m->>r.id; owner_ := nid::uuid;
        dat := jsonb_set(dat, '{items}', coalesce((select jsonb_agg(case when m ? (i->>'from') then jsonb_set(i, '{from}', to_jsonb(m->>(i->>'from'))) else i end)
                 from jsonb_array_elements(coalesce(dat->'items','[]')) i), '[]')); end if;
    elsif r.col = 'custom' then
      nid := r.id;  -- eigen oefening: bij wie hem in het schema heeft, anders de beheerder
      select (m->>g.id)::uuid into owner_ from public.gm_docs g where g.space = sp and g.col = 'plans' and m ? g.id and g.data::text like '%"' || r.id || '"%' limit 1;
      if owner_ is null then select u.id into owner_ from auth.users u where lower(u.email) = lower(p_admin_email); end if;
      if owner_ is null then owner_ := first_uid; end if;
    end if;
    if nid is not null then
      insert into gm2.docs(duo_id, owner, col, id, data) values (d, owner_, r.col, nid, dat)
      on conflict (duo_id, col, id) do update set data = excluded.data, owner = excluded.owner, rev = nextval('gm2.rev'), updated_at = now();
      n := n + 1;
    end if;
  end loop;
  insert into gm2.admins(uid) select u.id from auth.users u where lower(u.email) = lower(p_admin_email) on conflict do nothing;
  return jsonb_build_object('duo', d, 'gekopieerd', n, 'ids', m);
end $$;
revoke all on function gm2.migrate_space(jsonb, text) from public, anon, authenticated;
