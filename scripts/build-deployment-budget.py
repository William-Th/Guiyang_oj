"""生成合法合规部署预算 Excel 文档。

按财务申报习惯组织多 sheet：
- 01 封面与说明
- 02 总览（三档方案对比）
- 03 合规费用明细
- 04 外部服务明细
- 05 安全产品明细
- 06 云资源明细
- 07 第三方软件明细
- 08 人力成本明细
- 09 三档方案汇总
- 10 易忽略成本

金额为区间，列：项目 / 备注 / 最小值 / 最大值 / 推荐值。汇总用 SUM 公式。
"""
import argparse
from openpyxl import Workbook
from openpyxl.styles import (
    Font, Alignment, Border, Side, PatternFill, NamedStyle
)
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

# ---- 样式 ----
TITLE_FONT = Font(name='微软雅黑', bold=True, size=16, color='FFFFFF')
HEADER_FONT = Font(name='微软雅黑', bold=True, size=11)
SUBHEADER_FONT = Font(name='微软雅黑', bold=True, size=11, color='1F4E78')
NORMAL_FONT = Font(name='微软雅黑', size=10)
NOTE_FONT = Font(name='微软雅黑', size=9, italic=True, color='595959')
TOTAL_FONT = Font(name='微软雅黑', bold=True, size=11)

TITLE_FILL = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
HEADER_FILL = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
SUBHEADER_FILL = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')
TOTAL_FILL = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
NOTE_FILL = PatternFill(start_color='FFFFFF', end_color='FFFFFF', fill_type='solid')

THIN = Side(style='thin', color='BFBFBF')
BORDER = Border(top=THIN, bottom=THIN, left=THIN, right=THIN)

CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
LEFT = Alignment(horizontal='left', vertical='center', wrap_text=True)
RIGHT = Alignment(horizontal='right', vertical='center', wrap_text=True)


def style_title(cell):
    cell.font = TITLE_FONT
    cell.fill = TITLE_FILL
    cell.alignment = CENTER
    cell.border = BORDER


def style_header(cell):
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = CENTER
    cell.border = BORDER


def style_subheader(cell):
    cell.font = SUBHEADER_FONT
    cell.fill = SUBHEADER_FILL
    cell.alignment = LEFT
    cell.border = BORDER


def style_normal(cell, align='left'):
    cell.font = NORMAL_FONT
    cell.alignment = CENTER if align == 'center' else (RIGHT if align == 'right' else LEFT)
    cell.border = BORDER


def style_total(cell, align='left'):
    cell.font = TOTAL_FONT
    cell.fill = TOTAL_FILL
    cell.alignment = CENTER if align == 'center' else (RIGHT if align == 'right' else LEFT)
    cell.border = BORDER


def style_note(cell):
    cell.font = NOTE_FONT
    cell.fill = NOTE_FILL
    cell.alignment = LEFT
    cell.border = BORDER


def money_fmt(cell):
    cell.number_format = '¥#,##0;[Red]-¥#,##0'


def set_widths(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


# ---- 数据定义 ----
# （来源：docs/DEVELOPMENT_BUDGET.md，金额单位：元）

COMPLIANCE_ITEMS = [
    # (项目, 费用类型, 最小值, 最大值, 推荐值, 备注)
    ('ICP 备案', '免费', 0, 0, 0, '工信部系统自办'),
    ('公安备案', '免费', 0, 0, 0, '拿到 ICP 后 30 天内自行操作'),
    ('等保测评（三级）', '一次性', 80000, 150000, 110000, '测评机构报价，含测评 + 出报告'),
    ('整改 + 复测（如需要）', '一次性', 20000, 60000, 40000, '测评不通过时'),
    ('等保备案', '免费', 0, 0, 0, '公安网安部门'),
    ('教育部 App 备案', '免费', 0, 0, 0, '自行在 app.edu.cn 提交'),
    ('个人信息保护影响评估（PIA）', '一次性', 30000, 80000, 55000, '律所报价；含 6~8 份法律文件'),
    ('隐私政策 / 用户协议 / 监护人授权书 起草', '一次性', 20000, 50000, 35000, '律所'),
    ('儿童个人信息保护制度建设', '一次性', 10000, 30000, 20000, '律所 + 内规'),
    ('算法备案', '免费', 0, 0, 0, '自评可自写；委托代写 ¥5,000 ~ 15,000'),
    ('DPA 数据处理协议（短信/CDN/OSS 等）', '一次性', 5000, 20000, 12000, '看供应商数量'),
    ('未成年人民事行为能力公证（个别地区要求）', '一次性', 5000, 20000, 12000, '看当地要求'),
    ('应急演练与培训（首年）', '一次性+每年', 10000, 30000, 20000, '律所 + 安全顾问'),
    ('应急演练与培训（后续每年）', '每年', 5000, 15000, 10000, '律所 + 安全顾问'),
    ('主管单位书面同意函', '免费', 0, 0, 0, '教育局出函（时间成本高）'),
]

EXTERNAL_ITEMS = [
    ('短信（注册/改密/通知）', '按量', 24000, 96000, 60000, '0.045 元/条，月 5 万条起；未成年场景必接'),
    ('对象存储 OSS/COS', '按量', 18000, 60000, 39000, '含归档存储；贵阳节点'),
    ('CDN（可选）', '按量', 6000, 36000, 21000, '公网访问量大时考虑'),
    ('WAF（Web 应用防火墙）', '按量', 24000, 96000, 60000, '等保会查；云厂商自带基础版'),
    ('SSL 证书', '按年', 0, 5000, 3000, '¥0（Let’s Encrypt）或国产 CA'),
    ('域名', '按年', 50, 200, 100, '.com / .cn / .edu.cn'),
    ('日志服务（Loki/ELK 自建可省）', '按量', 0, 5000, 3000, '等保要求 ≥180 天'),
    ('邮件通知', '按量', 1200, 6000, 3600, '触发式业务，量不大'),
    ('监控告警（短信 + 电话）', '按量', 6000, 24000, 15000, '等保要求'),
    ('渗透测试 / 漏洞扫描（每年 ≥1 次）', '按年', 30000, 80000, 55000, '等保 + App 备案要这个'),
]

SECURITY_PRODUCTS = [
    ('WAF（云厂商基础版 + 商业版）', '按年', 1000, 50000, 25000, '云厂商套餐已含部分'),
    ('主机安全 / EDR', '按年', 5000, 30000, 17500, '等保三级要求'),
    ('数据库审计', '按年', 8000, 40000, 24000, '等保三级要求'),
    ('日志审计平台 / SIEM', '按年', 10000, 80000, 45000, '等保三级要求'),
    ('堡垒机', '按年', 5000, 30000, 17500, '等保要求'),
    ('漏洞扫描（每年至少 1 次）', '按次', 10000, 30000, 20000, '每年至少 1 次'),
    ('VPN / 零信任', '按年', 5000, 50000, 27500, '远程运维需要'),
    ('DDoS 高防', '按年', 10000, 100000, 55000, '视业务风险定'),
]

CLOUD_COMPUTE = [
    ('Nginx 主备', '4C8G', 2, '台', '¥800 ~ 1,500/月（共）'),
    ('Backend 容器（应用节点）', '4C8G', 3, '节点', '¥3,000 ~ 5,000/月'),
    ('Frontend 静态', '2C4G', 2, '台', '¥600 ~ 1,500/月（含 CDN）'),
    ('Judge worker', '8C16G', 3, '节点', '¥5,000 ~ 8,000/月'),
    ('日志 / 监控 / 备份机', '4C8G', 1, '台', '¥800 ~ 1,500/月'),
]

CLOUD_STORAGE = [
    ('PostgreSQL 主库（8C16G + 1TB SSD）', 1, '台', '¥1,500 ~ 3,000/月'),
    ('PostgreSQL 从库', 1, '台', '¥1,200 ~ 2,500/月'),
    ('Redis 主从（4C8G）', 2, '台', '¥1,500 ~ 3,000/月'),
    ('OSS / COS 存储（题库/头像/证书）', 1, 'TB 起', '¥500 ~ 2,000/月'),
    ('备份归档 OSS（≥30 天）', 500, 'GB 起', '¥200 ~ 800/月'),
]

CLOUD_NETWORK = [
    ('公网带宽（贵阳节点）', '¥500 ~ 2,000/月'),
    ('弹性 IP / NAT', '¥200 ~ 500/月'),
    ('内部 LB（CLB / SLB）', '¥200 ~ 1,000/月'),
]

SOFTWARE_ITEMS = [
    ('PostgreSQL / Redis / Nginx / Node.js / React', '开源', 0, 0, 0, '本项目全栈开源'),
    ('Let’s Encrypt 证书', '免费', 0, 0, 0, '一年一续'),
    ('监控告警（Grafana / Prometheus / Zabbix）', '自建免费 / SaaS', 0, 10000, 5000, '自建 ¥0，SaaS ¥10,000/年'),
    ('APM（应用性能监控）', '自建免费 / SaaS', 0, 30000, 15000, '自建 SkyWalking ¥0，Datadog 等 SaaS'),
    ('日志系统（ELK / Loki，自建）', '自建', 0, 0, 0, '本项目无 SaaS 依赖'),
]

HUMAN_ITEMS = [
    ('后端 / 前端 全栈改造', '1~2 人 × 1 个月', 30000, 80000, 55000, '技术合规改造'),
    ('安全工程师（贯穿全程）', '0.3 ~ 0.5 FTE × 6 个月', 50000, 150000, 100000, '合规 + 安全'),
    ('DBA / 运维', '0.3 FTE（首年）', 30000, 80000, 55000, '数据库 + 系统运维'),
    ('法务对接（PIA + 文件）', '兼职', 20000, 50000, 35000, 'PIA + 6~8 份法律文件'),
    ('项目管理 / 协调', '兼职', 10000, 30000, 20000, '跨部门协调'),
]

HIDDEN_COSTS = [
    '数据迁移 / 演练工时（季度演练占运维 1~2 人日）',
    'DDoS 高防应急（上线后实际一定会碰到至少一次攻击）',
    '短信超量风险（黑产薅羊毛可烧掉几万元，建议配每日上限）',
    '教师培训费（多校教师系统培训会）',
    '回收 / 销毁过期数据（等保查数据生命周期，每年清理）',
    '多端适配（家长端 App / 微信小程序：+¥5 万 ~ 20 万）',
    '考试监考录像服务（严肃测评需录像；存储审查成本另算）',
    '节假日短信峰值（寒暑假开学前后短信量是平时的 5~10 倍）',
]


def write_sheet_cover(wb):
    """01 封面与说明"""
    ws = wb.create_sheet('01-封面与说明')

    ws.merge_cells('A1:F1')
    ws['A1'] = '贵阳市小学生测评服务平台'
    style_title(ws['A1'])
    ws.row_dimensions[1].height = 32

    ws.merge_cells('A2:F2')
    ws['A2'] = '合法合规部署预算文档'
    c = ws['A2']
    c.font = Font(name='微软雅黑', bold=True, size=14, color='1F4E78')
    c.alignment = CENTER
    c.fill = HEADER_FILL
    ws.row_dimensions[2].height = 26

    rows = [
        ('文档版本', 'v1.0'),
        ('最后更新', '2026-07-30'),
        ('适用范围', '项目面向贵阳市小学生测评服务平台的合法合规部署（公网场景、市级规模）'),
        ('密级', '内部参考'),
        ('部署规模', '市级公网、用户 > 1 万人、并发 2,000~5,000'),
        ('数据安全等级', '等保三级、敏感字段加密'),
        ('存储预估', '题库 + 学生作品 + 证书 ≥ 1 TB / 年'),
    ]
    row = 4
    for label, val in rows:
        ws.cell(row=row, column=1, value=label)
        style_subheader(ws.cell(row=row, column=1))
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=6)
        ws.cell(row=row, column=2, value=val)
        style_normal(ws.cell(row=row, column=2), 'left')
        row += 1

    row += 1
    ws.cell(row=row, column=1, value='📋 工作表索引')
    style_subheader(ws.cell(row=row, column=1))
    ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=6)
    row += 1

    sheets = [
        ('01', '封面与说明', '本文档'),
        ('02', '总览', '三档方案对比 + 一次性/经常性比例'),
        ('03', '合规费用明细', '法规合规相关费用'),
        ('04', '外部服务明细', '短信 / OSS / CDN / WAF 等按量计费'),
        ('05', '安全产品明细', 'WAF / EDR / 数据库审计 / 堡垒机等'),
        ('06', '云资源明细', '计算 / 存储 / 网络三类'),
        ('07', '第三方软件', '本项目全栈开源明细'),
        ('08', '人力成本', '增量外包部分'),
        ('09', '三档方案汇总', '最小/标准/稳妥方案首年与每年汇总'),
        ('10', '易忽略成本', '8 项典型陷阱 + 10% 缓冲建议'),
    ]
    for num, name, desc in sheets:
        ws.cell(row=row, column=1, value=num)
        style_normal(ws.cell(row=row, column=1), 'center')
        ws.cell(row=row, column=2, value=name)
        style_subheader(ws.cell(row=row, column=2))
        ws.merge_cells(start_row=row, start_column=3, end_row=row, end_column=6)
        ws.cell(row=row, column=3, value=desc)
        style_normal(ws.cell(row=row, column=3), 'left')
        row += 1

    row += 1
    ws.cell(row=row, column=1, value='⚠ 阅读须知')
    style_subheader(ws.cell(row=row, column=1))
    ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=6)
    row += 1
    notices = [
        '1. 本预算文档为合法合规部署的整体费用估算，覆盖法规合规 + 技术合规 + 安全合规 + 基础资源四大类。',
        '2. 所有金额均为人民币，含税，按市级公网 + 用户 > 1 万估算。',
        '3. 表格中列出的区间是通常市场行情，不是商务报价，最终金额以实际询价/合同为准。',
        '4. 法规合规费用（测评 / 律所 / 备案）请委托贵州省内有相应资质的供应商。',
        '5. 云资源费用建议优先评估市级教育云 / 政务云政府采购价方案。',
    ]
    for note in notices:
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
        ws.cell(row=row, column=1, value=note)
        style_note(ws.cell(row=row, column=1))
        row += 1

    set_widths(ws, [12, 22, 22, 22, 22, 22])


def write_sheet_overview(wb):
    """02 总览 — 三档方案对比"""
    ws = wb.create_sheet('02-总览')

    ws.merge_cells('A1:E1')
    ws['A1'] = '三档方案对比（首年 + 后续每年）'
    style_title(ws['A1'])
    ws.row_dimensions[1].height = 28

    headers = ['方案', '首年合计', '后续每年', '适合场景', '说明']
    for i, h in enumerate(headers, start=1):
        ws.cell(row=3, column=i, value=h)
        style_header(ws.cell(row=3, column=i))

    rows = [
        ('🟢 最小合规方案（自建机房 / 教育云）', 600000, 380000,
         '已有机房或教育云资源',
         '自建 / 政务云，依赖已有 IT 资源'),
        ('🟡 标准推荐方案（云厂商整套方案）', 1050000, 630000,
         '大多数市级项目',
         '阿里云 / 腾讯云贵阳节点 + 完整安全产品'),
        ('🔴 稳妥 / 重保方案（多重安全设备）', 1570000, 930000,
         '区/市重点工作或示范工程',
         '多重安全设备 + 完整人力外包'),
    ]
    row = 4
    for name, y1, y2, scene, desc in rows:
        ws.cell(row=row, column=1, value=name)
        style_normal(ws.cell(row=row, column=1), 'left')
        ws.cell(row=row, column=2, value=y1)
        style_normal(ws.cell(row=row, column=2), 'right')
        money_fmt(ws.cell(row=row, column=2))
        ws.cell(row=row, column=3, value=y2)
        style_normal(ws.cell(row=row, column=3), 'right')
        money_fmt(ws.cell(row=row, column=3))
        ws.cell(row=row, column=4, value=scene)
        style_normal(ws.cell(row=row, column=4), 'left')
        ws.cell(row=row, column=5, value=desc)
        style_normal(ws.cell(row=row, column=5), 'left')
        row += 1

    row += 2
    ws.cell(row=row, column=1, value='一次性 vs 经常性比例')
    style_subheader(ws.cell(row=row, column=1))
    ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=5)
    row += 1

    headers2 = ['类别', '金额范围', '说明', '', '']
    for i, h in enumerate(headers2, start=1):
        ws.cell(row=row, column=i, value=h)
        style_header(ws.cell(row=row, column=i))
    row += 1

    rows2 = [
        ('一次性投入', '¥40 ~ 70 万',
         '合规首评 + 安全产品采购 + 整改'),
        ('每年固定运转', '¥38 ~ 90 万',
         '最大持续成本（云资源 + 短信 + 维护）'),
    ]
    for label, amt, desc in rows2:
        ws.cell(row=row, column=1, value=label)
        style_normal(ws.cell(row=row, column=1), 'left')
        ws.cell(row=row, column=2, value=amt)
        style_total(ws.cell(row=row, column=2), 'right')
        ws.cell(row=row, column=3, value=desc)
        style_normal(ws.cell(row=row, column=3), 'left')
        row += 1

    set_widths(ws, [28, 18, 18, 28, 38])


def write_items_sheet(wb, sheet_name, title, items):
    """通用：写一个含项目/备注/最小/最大/推荐 的明细表"""
    ws = wb.create_sheet(sheet_name)

    ws.merge_cells('A1:F1')
    ws['A1'] = title
    style_title(ws['A1'])
    ws.row_dimensions[1].height = 28

    headers = ['序号', '项目', '费用类型', '最小值（元）', '最大值（元）', '推荐值（元）']
    for i, h in enumerate(headers, start=1):
        c = ws.cell(row=3, column=i, value=h)
        style_header(c)

    # 数据
    row = 4
    start_row = row
    for idx, item in enumerate(items, start=1):
        if len(item) == 6:
            name, ftype, mn, mx, rec, note = item
        else:
            name, ftype, mn, mx, rec = item
            note = ''

        ws.cell(row=row, column=1, value=idx)
        style_normal(ws.cell(row=row, column=1), 'center')
        ws.cell(row=row, column=2, value=name)
        style_normal(ws.cell(row=row, column=2), 'left')
        ws.cell(row=row, column=3, value=ftype)
        style_normal(ws.cell(row=row, column=3), 'center')
        for col, val in zip([4, 5, 6], [mn, mx, rec]):
            ws.cell(row=row, column=col, value=val)
            style_normal(ws.cell(row=row, column=col), 'right')
            money_fmt(ws.cell(row=row, column=col))
        row += 1

    end_row = row - 1

    # 合计行（用 SUM 公式）
    ws.cell(row=row, column=1, value='合计')
    style_total(ws.cell(row=row, column=1), 'center')
    ws.cell(row=row, column=2, value=f'共 {len(items)} 项')
    style_total(ws.cell(row=row, column=2), 'left')
    ws.cell(row=row, column=3, value='—')
    style_total(ws.cell(row=row, column=3), 'center')
    for col in [4, 5, 6]:
        col_letter = get_column_letter(col)
        ws.cell(row=row, column=col,
                value=f'=SUM({col_letter}{start_row}:{col_letter}{end_row})')
        style_total(ws.cell(row=row, column=col), 'right')
        money_fmt(ws.cell(row=row, column=col))
    total_row = row

    # 备注区
    row += 2
    ws.cell(row=row, column=1, value='项目备注')
    style_subheader(ws.cell(row=row, column=1))
    ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=6)
    row += 1

    for idx, item in enumerate(items, start=1):
        if len(item) >= 6:
            note = item[5]
        else:
            note = ''
        if note:
            ws.cell(row=row, column=1, value=idx)
            style_normal(ws.cell(row=row, column=1), 'center')
            ws.cell(row=row, column=2, value=item[0])
            style_normal(ws.cell(row=row, column=2), 'left')
            ws.merge_cells(start_row=row, start_column=3, end_row=row, end_column=6)
            ws.cell(row=row, column=3, value=note)
            style_note(ws.cell(row=row, column=3))
            row += 1

    set_widths(ws, [6, 32, 14, 14, 14, 14])


def write_sheet_cloud(wb):
    """06 云资源明细（结构特殊）"""
    ws = wb.create_sheet('06-云资源明细')

    ws.merge_cells('A1:F1')
    ws['A1'] = '云资源费用明细（贵阳节点，按年估算）'
    style_title(ws['A1'])
    ws.row_dimensions[1].height = 28

    # 6.1 计算资源
    row = 3
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    ws.cell(row=row, column=1, value='6.1 计算资源')
    style_subheader(ws.cell(row=row, column=1))
    row += 1

    headers = ['角色', '规格', '数量', '单位', '月费区间', '备注']
    for i, h in enumerate(headers, start=1):
        ws.cell(row=row, column=i, value=h)
        style_header(ws.cell(row=row, column=i))
    row += 1

    for role, spec, qty, unit, fee in CLOUD_COMPUTE:
        ws.cell(row=row, column=1, value=role)
        style_normal(ws.cell(row=row, column=1), 'left')
        ws.cell(row=row, column=2, value=spec)
        style_normal(ws.cell(row=row, column=2), 'center')
        ws.cell(row=row, column=3, value=qty)
        style_normal(ws.cell(row=row, column=3), 'center')
        ws.cell(row=row, column=4, value=unit)
        style_normal(ws.cell(row=row, column=4), 'center')
        ws.cell(row=row, column=5, value=fee)
        style_normal(ws.cell(row=row, column=5), 'left')
        ws.cell(row=row, column=6, value='')
        style_normal(ws.cell(row=row, column=6), 'left')
        row += 1

    # 小计说明
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    ws.cell(row=row, column=1,
            value='计算小计：约 ¥10,000 ~ 17,000/月，年 ¥12 万 ~ 20 万')
    style_total(ws.cell(row=row, column=1), 'left')
    row += 2

    # 6.2 存储 / 数据库
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    ws.cell(row=row, column=1, value='6.2 存储 / 数据库')
    style_subheader(ws.cell(row=row, column=1))
    row += 1

    headers = ['资源', '数量', '单位', '月费区间', '备注', '']
    for i, h in enumerate(headers, start=1):
        ws.cell(row=row, column=i, value=h)
        style_header(ws.cell(row=row, column=i))
    row += 1

    for res, qty, unit, fee in CLOUD_STORAGE:
        ws.cell(row=row, column=1, value=res)
        style_normal(ws.cell(row=row, column=1), 'left')
        ws.cell(row=row, column=2, value=qty)
        style_normal(ws.cell(row=row, column=2), 'center')
        ws.cell(row=row, column=3, value=unit)
        style_normal(ws.cell(row=row, column=3), 'center')
        ws.cell(row=row, column=4, value=fee)
        style_normal(ws.cell(row=row, column=4), 'left')
        ws.cell(row=row, column=5, value='')
        style_normal(ws.cell(row=row, column=5), 'left')
        ws.cell(row=row, column=6, value='')
        style_normal(ws.cell(row=row, column=6), 'left')
        row += 1

    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    ws.cell(row=row, column=1,
            value='存储小计：约 ¥5,000 ~ 11,000/月，年 ¥6 万 ~ 13 万')
    style_total(ws.cell(row=row, column=1), 'left')
    row += 2

    # 6.3 网络 / 其他
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    ws.cell(row=row, column=1, value='6.3 网络 / 其他')
    style_subheader(ws.cell(row=row, column=1))
    row += 1

    headers = ['项目', '月费区间', '', '', '', '']
    for i, h in enumerate(headers, start=1):
        ws.cell(row=row, column=i, value=h)
        style_header(ws.cell(row=row, column=i))
    row += 1

    for proj, fee in CLOUD_NETWORK:
        ws.cell(row=row, column=1, value=proj)
        style_normal(ws.cell(row=row, column=1), 'left')
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=6)
        ws.cell(row=row, column=2, value=fee)
        style_normal(ws.cell(row=row, column=2), 'left')
        row += 1

    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    ws.cell(row=row, column=1,
            value='网络小计：约 ¥900 ~ 3,500/月，年 ¥1 万 ~ 4 万')
    style_total(ws.cell(row=row, column=1), 'left')
    row += 2

    # 合计
    ws.cell(row=row, column=1, value='云资源首年合计')
    style_total(ws.cell(row=row, column=1), 'left')
    ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=6)
    ws.cell(row=row, column=2, value='¥19 ~ 37 万（首年） / ¥19 ~ 37 万（后续每年）')
    style_total(ws.cell(row=row, column=2), 'left')

    set_widths(ws, [28, 18, 12, 16, 24, 24])


def write_sheet_summary(wb):
    """09 三档方案汇总"""
    ws = wb.create_sheet('09-三档方案汇总')

    ws.merge_cells('A1:G1')
    ws['A1'] = '三档方案分项汇总对比'
    style_title(ws['A1'])
    ws.row_dimensions[1].height = 28

    headers = ['分项', '最小方案 首年', '最小方案 每年',
               '标准方案 首年', '标准方案 每年',
               '稳妥方案 首年', '稳妥方案 每年']
    for i, h in enumerate(headers, start=1):
        ws.cell(row=3, column=i, value=h)
        style_header(ws.cell(row=3, column=i))

    rows = [
        ('合规费用',        150000, 10000,  250000, 20000,  350000, 30000),
        ('外部服务',        100000, 100000, 150000, 150000, 250000, 200000),
        ('安全产品',         50000,  50000, 150000, 120000, 250000, 200000),
        ('云资源',          190000, 190000, 280000, 280000, 370000, 370000),
        ('软件工具',            0,      0,  20000,  10000,  50000,  50000),
        ('人力（外包）',    100000,  30000, 200000,  50000, 300000,  80000),
    ]
    row = 4
    start_row = row
    for label, c1, c2, c3, c4, c5, c6 in rows:
        ws.cell(row=row, column=1, value=label)
        style_normal(ws.cell(row=row, column=1), 'left')
        for col, val in zip([2, 3, 4, 5, 6, 7], [c1, c2, c3, c4, c5, c6]):
            ws.cell(row=row, column=col, value=val)
            style_normal(ws.cell(row=row, column=col), 'right')
            money_fmt(ws.cell(row=row, column=col))
        row += 1
    end_row = row - 1

    # 合计行（SUM 公式）
    ws.cell(row=row, column=1, value='合计')
    style_total(ws.cell(row=row, column=1), 'left')
    for col in [2, 3, 4, 5, 6, 7]:
        cl = get_column_letter(col)
        ws.cell(row=row, column=col,
                value=f'=SUM({cl}{start_row}:{cl}{end_row})')
        style_total(ws.cell(row=row, column=col), 'right')
        money_fmt(ws.cell(row=row, column=col))
    row += 2

    # 表格说明
    notes = [
        '最小方案：自建机房 / 教育云，依赖已有 IT 资源',
        '标准方案：阿里云 / 腾讯云贵阳节点 + 完整安全产品',
        '稳妥方案：多重安全设备 + 完整人力外包',
    ]
    for n in notes:
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
        ws.cell(row=row, column=1, value=n)
        style_note(ws.cell(row=row, column=1))
        row += 1

    set_widths(ws, [22, 18, 18, 18, 18, 18, 18])


def write_sheet_hidden(wb):
    """10 易忽略成本"""
    ws = wb.create_sheet('10-易忽略成本')

    ws.merge_cells('A1:C1')
    ws['A1'] = '易忽略成本（建议额外加 10% 缓冲）'
    style_title(ws['A1'])
    ws.row_dimensions[1].height = 28

    headers = ['序号', '项目', '说明']
    for i, h in enumerate(headers, start=1):
        ws.cell(row=3, column=i, value=h)
        style_header(ws.cell(row=3, column=i))

    row = 4
    for idx, cost in enumerate(HIDDEN_COSTS, start=1):
        ws.cell(row=row, column=1, value=idx)
        style_normal(ws.cell(row=row, column=1), 'center')
        ws.cell(row=row, column=2, value=cost)
        style_subheader(ws.cell(row=row, column=2))
        ws.cell(row=row, column=3, value='')
        style_normal(ws.cell(row=row, column=3), 'left')
        row += 1

    row += 2
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=3)
    ws.cell(row=row, column=1,
            value='✅ 建议：在最终预算上额外加 10% 作为风险缓冲')
    style_total(ws.cell(row=row, column=1), 'left')

    set_widths(ws, [8, 36, 60])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    wb = Workbook()
    # 删除默认 Sheet
    wb.remove(wb.active)

    write_sheet_cover(wb)
    write_sheet_overview(wb)
    write_items_sheet(wb, '03-合规费用明细', '合规费用明细（一次性为主，部分按年续）', COMPLIANCE_ITEMS)
    write_items_sheet(wb, '04-外部服务明细', '外部服务明细（按年按量计费）', EXTERNAL_ITEMS)
    write_items_sheet(wb, '05-安全产品明细', '安全产品 / 设备费用明细', SECURITY_PRODUCTS)
    write_sheet_cloud(wb)
    write_items_sheet(wb, '07-第三方软件', '第三方软件 / 工具明细（本项目全栈开源）', SOFTWARE_ITEMS)
    write_items_sheet(wb, '08-人力成本', '人力成本明细（增量外包部分）', HUMAN_ITEMS)
    write_sheet_summary(wb)
    write_sheet_hidden(wb)

    wb.save(args.output)
    print(f'表格已生成：{args.output}')


if __name__ == '__main__':
    main()