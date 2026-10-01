-- Vaitu · add shortlists count to seeker_stats (profile stats need all three).
-- CREATE OR REPLACE cannot insert a column mid-view, so drop + recreate.
-- Keeps security_invoker so callers only aggregate rows their RLS allows.

drop view if exists public.seeker_stats;

create view public.seeker_stats
with (security_invoker = true) as
select
  p.id as applicant_id,
  count(a.id) as applications_count,
  count(a.id) filter (where a.status = 'shortlisted') as shortlists_count,
  count(a.id) filter (where a.status = 'selected') as selections_count,
  case
    when count(a.id) filter (where a.status = 'selected') >= (select value from public.app_config where key = 'tier_gold_min_selections')
      then 'gold'
    when count(a.id) filter (where a.status = 'selected') >= (select value from public.app_config where key = 'tier_silver_min_selections')
      then 'silver'
    else 'bronze'
  end as tier
from public.profiles p
left join public.applications a on a.applicant_id = p.id
where p.role = 'seeker'
group by p.id;

grant select on public.seeker_stats to anon, authenticated;
