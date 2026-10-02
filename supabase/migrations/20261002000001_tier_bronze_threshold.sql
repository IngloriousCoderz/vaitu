-- Vaitu · bronze needs 75 points; below that the seeker has no tier.
-- Amends 20261002000000_tier_points.sql (append-only, never edit applied ones).

drop view if exists public.seeker_stats;

create view public.seeker_stats
with (security_invoker = true) as
select
  scored.applicant_id,
  scored.applications_count,
  scored.shortlists_count,
  scored.selections_count,
  scored.points,
  case
    when scored.points >= (select value from public.app_config where key = 'tier_gold_min_points')
      then 'gold'
    when scored.points >= (select value from public.app_config where key = 'tier_silver_min_points')
      then 'silver'
    when scored.points >= (select value from public.app_config where key = 'tier_bronze_min_points')
      then 'bronze'
    else null
  end as tier
from (
  select
    p.id as applicant_id,
    count(a.id) as applications_count,
    count(a.id) filter (where a.status = 'shortlisted') as shortlists_count,
    count(a.id) filter (where a.status = 'selected') as selections_count,
    (
      count(a.id) * (select value from public.app_config where key = 'points_per_application')
      + (count(a.id) filter (where a.status in ('shortlisted', 'selected')))
        * (select value from public.app_config where key = 'points_per_shortlist')
      + (count(a.id) filter (where a.status = 'selected'))
        * (select value from public.app_config where key = 'points_per_selection')
    ) as points
  from public.profiles p
  left join public.applications a on a.applicant_id = p.id
  where p.role = 'seeker'
  group by p.id
) scored;

grant select on public.seeker_stats to anon, authenticated;

insert into public.app_config (key, value, description) values
  ('tier_bronze_min_points', 75, 'Minimum points for bronze tier.')
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description;
