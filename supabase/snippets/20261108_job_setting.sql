alter table public.jobs rename column category to setting;
alter table public.jobs rename constraint jobs_category_check to jobs_setting_check;
alter index public.jobs_category_idx rename to jobs_setting_idx;

notify pgrst, 'reload schema';
