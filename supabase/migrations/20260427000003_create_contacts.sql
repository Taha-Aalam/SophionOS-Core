-- Step 19: Contacts module
-- Professional Network & Stakeholder Tracker

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text,
  organization text,
  "group" text,
  phone text,
  email text,
  linkedin text,
  website text,
  last_interaction_at timestamptz,
  follow_up_interval_days int default 14,
  favorite boolean default false,
  notes text,
  archive boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contact_projects (
  contact_id uuid not null references contacts(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  role_in_project text,
  primary key (contact_id, project_id)
);

create table if not exists contact_tasks (
  contact_id uuid not null references contacts(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  role_in_task text,
  primary key (contact_id, task_id)
);

create index if not exists contacts_user_id_idx on contacts(user_id);
create index if not exists contacts_group_idx on contacts(user_id, "group");
create index if not exists contact_projects_project_idx on contact_projects(project_id);
create index if not exists contact_tasks_task_idx on contact_tasks(task_id);

create or replace function update_contacts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_contacts_updated_at();

-- RLS
alter table contacts enable row level security;

create policy "Users can manage own contacts"
  on contacts for all
  using (auth.uid() = user_id);

create policy "Users can manage own contact_project links"
  on contact_projects for all
  using (
    exists (
      select 1 from contacts
      where contacts.id = contact_projects.contact_id
      and contacts.user_id = auth.uid()
    )
  );

create policy "Users can manage own contact_task links"
  on contact_tasks for all
  using (
    exists (
      select 1 from contacts
      where contacts.id = contact_tasks.contact_id
      and contacts.user_id = auth.uid()
    )
  );