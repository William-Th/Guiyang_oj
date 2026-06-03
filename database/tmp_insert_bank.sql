
-- 将草稿发布到题库 (question_bank)
-- scope: assessment=测评, practice_municipal=市级练习, practice_district=区级练习
INSERT INTO question_bank (draft_id, scope, district_id, school_id, status, published_by, published_at, is_active, question_code)
SELECT 
  id, 
  'assessment', 
  NULL, 
  NULL, 
  'published', 
  created_by, 
  NOW(), 
  true,
  'MATH-' || LPAD(id::text, 4, '0')
FROM question_drafts WHERE subject = '数学'
ON CONFLICT DO NOTHING;

INSERT INTO question_bank (draft_id, scope, district_id, school_id, status, published_by, published_at, is_active, question_code)
SELECT 
  id, 
  'assessment', 
  NULL, 
  NULL, 
  'published', 
  created_by, 
  NOW(), 
  true,
  'IT-' || LPAD(id::text, 4, '0')
FROM question_drafts WHERE subject = '信息科技'
ON CONFLICT DO NOTHING;
