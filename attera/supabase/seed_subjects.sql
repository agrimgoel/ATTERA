-- Run in Supabase SQL Editor after schema.sql.
-- These are the subjects teachers will pick from in "Set up a class".
-- Add/edit rows any time — just re-run the relevant insert line, or use
-- the SQL editor's table view (Table Editor -> subjects -> Insert row).

insert into public.subjects (name, code) values
  ('Computer Organization & Architecture', 'BCS-302'),
  ('Data Structures', 'BCS-301'),
  ('Digital Electronics', 'BOE-310'),
  ('Universal Human Values and Professional Ethics', 'BVE-301'),
  ('Discrete Structures & Theory of Logic', 'BCS-303'),
  ('Python Programming', 'BCC-302'),
  ('Data Structure Lab ', 'BCS-351'),
  ('Computer Organization and Architecture Lab', 'BCS-352'),
  ('Web Designing Workshop', 'BCS-353'),
  ('MINI PROJECT', 'BCC-351'),
  ('TT', 'CDC-M00'),
  ('APT', 'TPBTA21')
on conflict (code) do nothing;
