-- Run once in Supabase SQL Editor.
create table public.trip_shares (
 token uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 trip_id text not null,
 sections text[] not null,
 foreign key (owner_id,trip_id) references public.trips(owner_id,id) on delete cascade,
 unique(owner_id,trip_id)
);
alter table public.trip_shares enable row level security;
revoke all on public.trip_shares from anon;
grant select,insert,update,delete on public.trip_shares to authenticated;
create policy share_owner on public.trip_shares for all to authenticated
 using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create function public.shared_trip(p_token uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
 select jsonb_build_object(
 'title',t.data->'title','destination',t.data->'destination','start',t.data->'start','end',t.data->'end',
 'days',case when 'days'=any(s.sections) then (select coalesce(jsonb_agg(jsonb_build_object('date',d->'date','title',d->'title','stops',(select coalesce(jsonb_agg(jsonb_build_object('time',x->'time','title',x->'title','kind',x->'kind','status',x->'status') order by n),'[]'::jsonb) from jsonb_array_elements(d->'stops') with ordinality a(x,n))) order by i),'[]'::jsonb) from jsonb_array_elements(t.data->'days') with ordinality b(d,i)) else '[]'::jsonb end,
 'stays',case when 'stays'=any(s.sections) then (select coalesce(jsonb_agg(jsonb_build_object('name',x->'name','checkIn',x->'checkIn','checkOut',x->'checkOut')),'[]'::jsonb) from jsonb_array_elements(t.data->'stays') x) else '[]'::jsonb end,
 'flights',case when 'flights'=any(s.sections) then (select coalesce(jsonb_agg(jsonb_build_object('from',x->'from','to',x->'to','departDate',x->'departDate','departTime',x->'departTime','arriveDate',x->'arriveDate','arriveTime',x->'arriveTime','number',x->'number')),'[]'::jsonb) from jsonb_array_elements(coalesce(t.data->'flights','[]'::jsonb)) x) else '[]'::jsonb end,
 'todos',case when 'todos'=any(s.sections) then (select coalesce(jsonb_agg(jsonb_build_object('title',x->'title','done',x->'done','due',x->'due')),'[]'::jsonb) from jsonb_array_elements(coalesce(t.data->'todos','[]'::jsonb)) x) else '[]'::jsonb end,
 'places',case when 'places'=any(s.sections) then (select coalesce(jsonb_agg(jsonb_build_object('name',x->'name','address',x->'address','lat',x->'lat','lng',x->'lng')),'[]'::jsonb) from jsonb_array_elements(t.data->'places') x) else '[]'::jsonb end,
 'budget',case when 'budget'=any(s.sections) then (select coalesce(jsonb_agg(jsonb_build_object('label',x->'label','amount',x->'amount','currency',x->'currency')),'[]'::jsonb) from jsonb_array_elements(t.data->'budget') x) else '[]'::jsonb end,
 'people',case when 'people'=any(s.sections) then (select coalesce(jsonb_agg(jsonb_build_object('name',x->'name')),'[]'::jsonb) from jsonb_array_elements(t.data->'people') x) else '[]'::jsonb end
 ) from public.trip_shares s join public.trips t on t.owner_id=s.owner_id and t.id=s.trip_id where s.token=p_token;
$$;
revoke all on function public.shared_trip(uuid) from public;
grant execute on function public.shared_trip(uuid) to anon,authenticated;
