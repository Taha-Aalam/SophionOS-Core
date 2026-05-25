-- Copy each note's single notebook string into the junction table.
INSERT INTO note_notebooks (note_id, notebook)
SELECT id, notebook
FROM notes
WHERE notebook IS NOT NULL AND char_length(trim(notebook)) > 0
ON CONFLICT (note_id, notebook) DO NOTHING;
