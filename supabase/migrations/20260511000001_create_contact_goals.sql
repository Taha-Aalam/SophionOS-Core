-- contact_goals junction table
create table if not exists contact_goals (
  contact_id uuid not null references contacts(id) on delete cascade,
  goal_id    uuid not null references goals(id)    on delete cascade,
  primary key (contact_id, goal_id)
);

create index if not exists contact_goals_goal_idx on contact_goals(goal_id);

create policy "Users can manage own contact_goal links"
  on contact_goals for all
  using (
    exists (
      select 1 from contacts
      where contacts.id = contact_goals.contact_id
        and contacts.user_id = auth.uid()
    )
  );

alter table contact_goals enable row level security;