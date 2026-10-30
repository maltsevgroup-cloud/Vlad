\set ON_ERROR_STOP 0
\pset tuples_only on
insert into auth.users(id,email) values
 ('11111111-1111-1111-1111-111111111111','a@x'),('22222222-2222-2222-2222-222222222222','b@x'),
 ('33333333-3333-3333-3333-333333333333','c@x'),('44444444-4444-4444-4444-444444444444','d@x');
create or replace function t_as(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub',u,false) $$;
grant execute on function t_as(text) to authenticated;
set role authenticated;
-- A
select t_as('11111111-1111-1111-1111-111111111111');
select 'A me', gm2_me()->>'duo' is not null;
select 'A push athlete', gm2_push('athletes','11111111-1111-1111-1111-111111111111','{"name":"A"}') > 0;
select 'A push session', gm2_push('sessions','11111111-1111-1111-1111-111111111111_s1','{"x":1}') > 0;
select 'A push bw', gm2_push('bw','11111111-1111-1111-1111-111111111111','{"kg":80}') > 0;
select 'A push custom', gm2_push('custom','c1','{"n":"kabel"}') > 0;
do $$ begin perform gm2_push('athletes','22222222-2222-2222-2222-222222222222','{}'); raise notice 'FOUT: A kon B schrijven'; exception when others then raise notice 'OK geweigerd: %', sqlerrm; end $$;
do $$ begin perform gm2_push('sessions','22222222-2222-2222-2222-222222222222_s','{}'); raise notice 'FOUT'; exception when others then raise notice 'OK geweigerd sessie: %', sqlerrm; end $$;
do $$ begin perform gm2_push('nope','x','{}'); raise notice 'FOUT'; exception when others then raise notice 'OK geweigerd col: %', sqlerrm; end $$;
-- B, eigen duo, mag A niet zien
select t_as('22222222-2222-2222-2222-222222222222');
select 'B ziet A niet (0)', count(*) from gm2_pull(0);
select 'B get A bw null', gm2_get('bw','11111111-1111-1111-1111-111111111111') is null;
select 'B get A athlete null', gm2_get('athletes','11111111-1111-1111-1111-111111111111') is null;
select 'B push athlete', gm2_push('athletes','22222222-2222-2222-2222-222222222222','{"name":"B"}')>0;
select 'B push bw', gm2_push('bw','22222222-2222-2222-2222-222222222222','{"kg":60}')>0;
-- A nodigt uit, B voegt toe
select t_as('11111111-1111-1111-1111-111111111111');
select set_config('t.code', gm2_invite(), false);
select t_as('22222222-2222-2222-2222-222222222222');
select 'B join members=2', jsonb_array_length(gm2_join(current_setting('t.code'))->'members');
select 'B ziet nu A+eigen (geen bw):', string_agg(col||':'||left(id,8), ', ' order by col,id) from gm2_pull(0);
select 'B get eigen bw', gm2_get('bw','22222222-2222-2222-2222-222222222222');
select 'B get A bw null', gm2_get('bw','11111111-1111-1111-1111-111111111111') is null;
do $$ begin perform gm2_push('custom','c1','{"n":"kaapt"}'); raise notice 'FOUT: B wijzigt A custom'; exception when others then raise notice 'OK custom van A beschermd: %', sqlerrm; end $$;
select 'B bericht aan A', gm2_push('msgs','11111111-1111-1111-1111-111111111111','{"t":"top"}')>0;
-- C probeert dezelfde code opnieuw / volle duo
select t_as('33333333-3333-3333-3333-333333333333');
do $$ begin perform gm2_join(current_setting('t.code')); raise notice 'FOUT: code 2x bruikbaar'; exception when others then raise notice 'OK code gebruikt: %', sqlerrm; end $$;
select 'C ziet 0', count(*) from gm2_pull(0);
select t_as('11111111-1111-1111-1111-111111111111');
do $$ begin perform gm2_invite(); raise notice 'FOUT: invite bij volle duo'; exception when others then raise notice 'OK duo vol: %', sqlerrm; end $$;
select 'A export (eigen bw wel, B bw niet):', string_agg(col||':'||left(id,8), ', ' order by col,id) from gm2_export();
-- B verlaat duo: eigen data mee
select t_as('22222222-2222-2222-2222-222222222222');
select 'B leave members=1', jsonb_array_length(gm2_leave()->'members');
select 'B na leave ziet:', string_agg(col||':'||left(id,8), ', ' order by col,id) from gm2_pull(0);
select t_as('11111111-1111-1111-1111-111111111111');
select 'A na leave ziet:', string_agg(col||':'||left(id,8), ', ' order by col,id) from gm2_pull(0);
-- stats zonder admin
do $$ begin perform gm2_stats(); raise notice 'FOUT stats'; exception when others then raise notice 'OK geen admin: %', sqlerrm; end $$;
-- niet ingelogd
select t_as('');
do $$ begin perform gm2_pull(0); raise notice 'FOUT anoniem'; exception when others then raise notice 'OK anoniem geweigerd: %', sqlerrm; end $$;
-- rechtstreekse tabel
do $$ begin perform 1 from gm2.docs; raise notice 'FOUT tabel open'; exception when others then raise notice 'OK tabel dicht: %', sqlerrm; end $$;
-- B verwijdert account
select t_as('22222222-2222-2222-2222-222222222222');
select 'B delete', gm2_delete_me();
reset role;
select 'docs van B over', count(*) from gm2.docs where owner='22222222-2222-2222-2222-222222222222';
select 'B user weg', not exists(select 1 from auth.users where id='22222222-2222-2222-2222-222222222222');
set role anon;
do $$ begin perform gm2_me(); raise notice 'FOUT anon execute'; exception when others then raise notice 'OK anon geen execute: %', sqlerrm; end $$;
