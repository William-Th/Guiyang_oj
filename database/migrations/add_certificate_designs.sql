-- 证书自定义设计（2026-10-07）：管理端可维护多套设计，生成/下载 PDF 时按默认设计渲染
CREATE TABLE IF NOT EXISTS certificate_designs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT '贵阳市小学生能力测评',
  subtitle VARCHAR(200) NOT NULL DEFAULT '— 认证证书 —',
  org_name VARCHAR(200) NOT NULL DEFAULT '贵阳市教育局',
  seal_text VARCHAR(100) NOT NULL DEFAULT '贵阳教育',
  border_color VARCHAR(7) NOT NULL DEFAULT '#B8860B',
  inner_border_color VARCHAR(7) NOT NULL DEFAULT '#DAA520',
  title_color VARCHAR(7) NOT NULL DEFAULT '#1890FF',
  subtitle_color VARCHAR(7) NOT NULL DEFAULT '#DAA520',
  accent_color VARCHAR(7) NOT NULL DEFAULT '#1890FF',
  background_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  background_image_url VARCHAR(500) NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 首次迁移：保证存在唯一默认设计（无任何设计时插一条与历史版式一致的设计）
INSERT INTO certificate_designs
  (name, is_default, created_by)
SELECT '默认设计', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM certificate_designs);

CREATE UNIQUE INDEX IF NOT EXISTS uq_certificate_designs_default_true
  ON certificate_designs ((is_default)) WHERE is_default;
