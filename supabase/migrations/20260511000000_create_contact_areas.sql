-- contact_areas junction table
create table if not exists contact_areas (
  contact_id uuid not null references contacts(id) on delete cascade,
  area_id    uuid not null references areas(id)    on delete cascade,
  primary key (contact_id, area_id)
);

create index if not exists contact_areas_area_idx on contact_areas(area_id);

create policy "Users can manage own contact_area links"
  on contact_areas for all
  using (
    exists (
      select 1 from contacts
      where contacts.id = contact_areas.contact_id
        and contacts.user_id = auth.uid()
    )
  );

alter table contact_areas enable row level security;