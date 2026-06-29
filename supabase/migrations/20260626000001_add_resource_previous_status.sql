--- Remembers the status a resource held before it was completed, so un-completing
--- can restore it. Nullable; only set while a resource is in the completed state.
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS previous_status resource_status;
