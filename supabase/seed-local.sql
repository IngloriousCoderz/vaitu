do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'project_url'
  ) then
    perform vault.create_secret('http://kong:8000', 'project_url');
  end if;
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'service_role_key'
  ) then
    perform vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      'service_role_key'
    );
  end if;
end;
$$;
