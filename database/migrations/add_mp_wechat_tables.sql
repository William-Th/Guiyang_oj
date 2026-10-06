-- 小程序 M3：微信登录绑定表 + 订阅消息配额表（计划书第8章）
-- 绑定：一个微信号绑一个 user（openid 唯一）；一个 user 同期只绑一个微信（user_id 唯一），换绑走设置页解绑
CREATE TABLE IF NOT EXISTS user_wechat_bindings (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    openid VARCHAR(64) NOT NULL,
    unionid VARCHAR(64),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_wechat_bindings_openid_key UNIQUE (openid),
    CONSTRAINT user_wechat_bindings_user_key UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_uwb_unionid ON user_wechat_bindings(unionid);

-- 订阅消息一次性配额（前端 requestSubscribeMessage 接受后上报累加，发送一条扣一）
CREATE TABLE IF NOT EXISTS mp_subscribe_quota (
    user_id BIGINT NOT NULL,
    template_key VARCHAR(32) NOT NULL,
    quota INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mp_subscribe_quota_pk PRIMARY KEY (user_id, template_key)
);
