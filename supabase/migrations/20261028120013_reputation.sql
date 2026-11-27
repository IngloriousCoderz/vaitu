-- Scores, tiers and badges, from the whole history of a profile.

-- Security definer: a record must count all its history, not the part RLS shows
-- you. You can read your own, that of people applying to your jobs, and that
-- of posters you might work with.
create or replace function public.can_read_reputation(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_profile_id = auth.uid()
    or exists (
      select 1
      from public.applications a
      join public.jobs e on e.id = a.job_id
      where a.applicant_id = p_profile_id
        and a.status <> 'withdrawn'
        and e.poster_id = auth.uid()
        and e.deleted_at is null
    )
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.jobs e
        where e.poster_id = p_profile_id
          and e.status = 'open'
          and e.deleted_at is null
      )
    )
    or exists (
      select 1
      from public.applications a
      join public.jobs e on e.id = a.job_id
      where e.poster_id = p_profile_id
        and a.applicant_id = auth.uid()
        and a.status <> 'withdrawn'
        and e.deleted_at is null
    );
$$;

create or replace function public.profile_stats(p_profile_ids uuid[])
returns table (
  profile_id uuid,
  applications_count bigint,
  shortlists_count bigint,
  selections_count bigint,
  completed_count bigint,
  review_count bigint,
  average_rating numeric,
  payment_issues bigint,
  points bigint,
  tier text,
  badges text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with config as (
    select jsonb_object_agg(key, value) as c from public.app_config
  ),
  counted as (
    select
      p.id as profile_id,
      count(a.id) filter (
        where a.status <> 'withdrawn' and e.deleted_at is null
      ) as applications_count,
      count(a.id) filter (
        where a.status = 'shortlisted' and e.deleted_at is null
      ) as shortlists_count,
      count(a.id) filter (
        where a.status = 'selected' and e.deleted_at is null
      ) as selections_count,
      count(a.id) filter (where a.withdrawn_from is not null or a.status <> 'withdrawn') as lifetime_applications,
      count(a.id) filter (
        where a.withdrawn_from in ('pending', 'shortlisted', 'selected')
      ) as withdrawals,
      count(a.id) filter (where a.withdrawn_from = 'selected') as dropouts,
      count(r.application_id) filter (where r.outcome = 'completed') as completed_count,
      count(r.application_id) filter (where r.outcome = 'no_show') as no_shows,
      count(r.application_id) filter (
        where r.rating >= (config.c ->> 'review_good_min_stars')::int
      ) as good_reviews,
      count(r.application_id) filter (
        where r.rating <= (config.c ->> 'review_poor_max_stars')::int
      ) as poor_reviews,
      count(r.rating) as review_count,
      round(avg(r.rating), 1) as average_rating
    from config, unnest(p_profile_ids) as requested (id)
    join public.profiles p on p.id = requested.id
    left join public.applications a on a.applicant_id = p.id
    left join public.jobs e on e.id = a.job_id
    left join public.job_reviews r on r.application_id = a.id
    where public.can_read_reputation(p.id)
    group by p.id, config.c
  ),
  scored as (
    select
      counted.*,
      (
        select count(*)
        from public.jobs handed
        where handed.poster_id = counted.profile_id and handed.status = 'assigned'
      ) as handoffs,
      issues.payment_issues,
      greatest(
        0,
        issues.payment_issues * (c ->> 'points_per_payment_issue')::int
          + completed_count * (c ->> 'points_per_completed_job')::int
          + passed.completed_handoffs * (c ->> 'points_per_completed_handoff')::int
          + good_reviews * (c ->> 'points_per_good_review')::int
          + poor_reviews * (c ->> 'points_per_poor_review')::int
          + dropouts * (c ->> 'points_per_dropout')::int
          + no_shows * (c ->> 'points_per_no_show')::int
      ) as points,
      c
    from counted
    cross join config
    cross join lateral (
      -- Counts against the other side once they had the time to say otherwise.
      select count(*) as payment_issues
      from public.job_settlements s
      join public.applications a on a.id = s.application_id
      join public.jobs e on e.id = a.job_id
      where not s.is_settled
        and s.answered_at < now()
          - make_interval(days => (config.c ->> 'settlement_reply_days')::int)
        and (
          (s.role = 'winner' and e.poster_id = counted.profile_id)
          or (s.role = 'poster' and a.applicant_id = counted.profile_id)
        )
        and not exists (
          select 1 from public.job_settlements other
          where other.application_id = s.application_id
            and other.role <> s.role
        )
    ) issues
    cross join lateral (
      select count(*) as completed_handoffs
      from public.job_reviews r
      join public.applications a on a.id = r.application_id
      join public.jobs e on e.id = a.job_id
      where e.poster_id = counted.profile_id
        and r.outcome = 'completed'
    ) passed
  )
  select
    profile_id,
    applications_count,
    shortlists_count,
    selections_count,
    completed_count,
    review_count,
    average_rating,
    payment_issues,
    points,
    case
      when points >= (c ->> 'tier_gold_min_points')::int then 'gold'
      when points >= (c ->> 'tier_silver_min_points')::int then 'silver'
      when points >= (c ->> 'tier_bronze_min_points')::int then 'bronze'
    end as tier,
    array_remove(array[
      case when review_count >= (c ->> 'badge_top_rated_min_reviews')::int
        and average_rating * 10 >= (c ->> 'badge_top_rated_min_tenths')::int
        then 'top_rated' end,
      case when completed_count >= (c ->> 'badge_reliable_min_jobs')::int
        and dropouts + no_shows = 0
        then 'reliable' end,
      case when handoffs >= (c ->> 'badge_generous_min_handoffs')::int
        then 'generous' end,
      case when lifetime_applications >= (c ->> 'badge_serial_applicant_min_applications')::int
        then 'serial_applicant' end,
      case when withdrawals >= (c ->> 'badge_serial_withdrawer_min_withdrawals')::int
        and withdrawals * 100 >= lifetime_applications * (c ->> 'badge_serial_withdrawer_min_percent')::int
        then 'serial_withdrawer' end,
      case when dropouts + no_shows >= (c ->> 'badge_unreliable_min_failures')::int
        then 'unreliable' end,
      case when payment_issues >= (c ->> 'badge_payment_issues_min')::int
        then 'payment_issues' end
    ], null) as badges
  from scored;
$$;

grant execute on function public.profile_stats(uuid[]) to authenticated;

create or replace function public.profile_reviews(p_profile_ids uuid[])
returns table (
  profile_id uuid,
  application_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ranked.profile_id,
    ranked.application_id,
    ranked.rating,
    ranked.comment,
    ranked.created_at
  from (
    select
      a.applicant_id as profile_id,
      r.application_id,
      r.rating,
      r.comment,
      r.created_at,
      row_number() over (
        partition by a.applicant_id order by r.created_at desc
      ) as position
    from unnest(p_profile_ids) as requested (id)
    join public.applications a on a.applicant_id = requested.id
    join public.job_reviews r on r.application_id = a.id
    where r.outcome = 'completed'
      and r.comment is not null
      and r.hidden_at is null
      and public.can_read_reputation(requested.id)
  ) ranked
  where ranked.position <= 5
  order by ranked.created_at desc;
$$;

grant execute on function public.profile_reviews(uuid[]) to authenticated;
