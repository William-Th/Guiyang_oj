
INSERT INTO points_transactions (student_id, points_change, transaction_type, source_type, description, balance_before, balance_after, created_at) VALUES
(25, 50, 'achievement', 'achievement', '获得成就：第一滴血', 0, 50, NOW() - INTERVAL '1 day'),
(25, 30, 'achievement', 'achievement', '获得成就：初体验', 50, 80, NOW() - INTERVAL '1 day'),
(25, 150, 'achievement', 'achievement', '获得成就：满分学霸', 80, 230, NOW() - INTERVAL '1 hour'),
(26, 50, 'achievement', 'achievement', '获得成就：第一滴血', 0, 50, NOW() - INTERVAL '1 day'),
(26, 30, 'achievement', 'achievement', '获得成就：初体验', 50, 80, NOW() - INTERVAL '1 day'),
(27, 50, 'achievement', 'achievement', '获得成就：第一滴血', 0, 50, NOW() - INTERVAL '2 days'),
(27, 30, 'achievement', 'achievement', '获得成就：初体验', 50, 80, NOW() - INTERVAL '2 days'),
(27, 150, 'achievement', 'achievement', '获得成就：满分学霸', 80, 230, NOW() - INTERVAL '1 day');
