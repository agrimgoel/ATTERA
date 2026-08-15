-- Run in Supabase SQL Editor after schema.sql.
-- These are the subjects teachers will pick from in "Set up a class".
-- Add/edit rows any time — just re-run the relevant insert line, or use
-- the SQL editor's table view (Table Editor -> subjects -> Insert row).

insert into public.subjects (name, code) values
  ('Computer Organization & Architecture', 'COA'),
  ('Data Structures', 'DS'),
  ('Mathematics III', 'MATH3'),
  ('Digital Logic', 'DL'),
  ('Operating Systems', 'OS')
on conflict (code) do nothing;
