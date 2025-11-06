#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
贵阳市小学生测评平台 - CSV进度表合并工具
功能：
1. 重新生成07.1和10的CSV文件（UTF-8 with BOM编码，避免Excel乱码）
2. 将所有模块的CSV文件合并到一个Excel工作簿中
"""

import os
import pandas as pd
from pathlib import Path

# 定义状态符号到文本的映射（用于统计）
STATUS_MAP = {
    '✅': '完成',
    '❌': '未开始',
    '🚧': '进行中',
    '🐛': '有Bug',
    '⏸️': '已暂停',
    'N/A': '不适用'
}

def write_csv_with_bom(file_path, data, columns):
    """使用UTF-8 with BOM编码写入CSV文件，避免Excel乱码"""
    try:
        df = pd.DataFrame(data, columns=columns)
        # 使用utf-8-sig编码（UTF-8 with BOM）
        df.to_csv(file_path, index=False, encoding='utf-8-sig')
        print(f"[OK] 已生成: {file_path}")
        return True
    except PermissionError:
        print(f"[WARNING] 文件被占用，跳过: {file_path}")
        print(f"          请关闭Excel后重新运行脚本")
        return False
    except Exception as e:
        print(f"[ERROR] 生成失败: {file_path}")
        print(f"        错误: {e}")
        return False

def regenerate_071_csv():
    """重新生成 07.1_活动管理功能细化.csv"""
    data = [
        ['学生端-测评中心：查看测评列表', '✅', '✅', '❌', '🐛', '❌', 'API已实现/api/student/activities/assessment，前端字段映射已修复(2025-10-31)'],
        ['学生端-测评中心：筛选测评（科目/年级/等级）', '✅', '✅', '❌', '✅', '❌', '前端3个筛选器已实现，API支持参数'],
        ['学生端-测评中心：查看测评详情', '✅', '✅', '❌', '🚧', '❌', 'API已实现，前端详情页待完善'],
        ['学生端-测评中心：检查参加资格', '✅', '✅', '❌', '🚧', '❌', 'API已有基础逻辑，需前端集成'],
        ['学生端-测评中心：开始测评', '✅', '✅', '❌', '🚧', '❌', '后端API已实现，前端跳转待完善'],
        ['学生端-测评中心：查看成绩和证书', '✅', '✅', '❌', '🚧', '❌', '复用现有成绩模块，待集成'],
        ['学生端-练习中心：查看练习列表', '✅', '✅', '❌', '🐛', '🚧', 'API已实现/api/student/activities/practice，前端字段映射已修复(2025-10-31)，STU202测试通过'],
        ['学生端-练习中心：筛选练习', '✅', '✅', '❌', '✅', '❌', '前端3个筛选器已实现（科目/年级/能力等级）'],
        ['学生端-练习中心：开始练习', '✅', '✅', '❌', '✅', '🐛', '后端和前端已实现，但测试活动缺题目配置(STU203-205失败)'],
        ['学生端-练习中心：重做练习（如允许）', '✅', '✅', '❌', '✅', '❌', '后端已实现，前端集成完成'],
        ['教师端-练习管理：只显示练习类型', '✅', '❌', '❌', '❌', '❌', '修改ActivityListPage'],
        ['教师端-练习管理：创建练习（禁止创建测评）', '✅', '❌', '❌', '❌', '❌', '修改ActivityFormPage'],
        ['教师端-练习管理：只看自己的练习', '✅', '❌', '❌', '❌', '❌', '后端API筛选'],
        ['教师端-练习管理：编辑/删除练习', '✅', '✅', '❌', '✅', '❌', '已有功能，需测试'],
        ['管理员端-测评管理：查看所有测评', '✅', '❌', '❌', '❌', '❌', '需新建API /api/activities/admin/assessments'],
        ['管理员端-测评管理：创建测评', '✅', '❌', '❌', '❌', '❌', '需新建API /api/activities/admin/assessment'],
        ['管理员端-测评管理：配置证书模板', '✅', '✅', '❌', '❌', '❌', '后端已有，需前端'],
        ['管理员端-测评管理：设置目标受众', '✅', '✅', '❌', '❌', '❌', '后端已有，需前端'],
        ['管理员端-测评管理：管理测评范围', '✅', '✅', '❌', '❌', '❌', '后端已有，需前端'],
    ]
    columns = ['功能', '数据库', '后端API', 'API测试', '前端', 'E2E测试', '备注']
    file_path = Path(__file__).parent / '07.1_活动管理功能细化.csv'
    write_csv_with_bom(file_path, data, columns)

def regenerate_10_csv():
    """重新生成 10_学生自主注册系统.csv"""
    data = [
        ['学生注册申请', '✅', '✅', '✅', '✅', '✅', 'POST /api/registration/student, StudentRegisterPage.tsx, REG103'],
        ['获取区县列表', '✅', '✅', '✅', '✅', '✅', 'GET /api/registration/config/districts, configService.js扩展'],
        ['获取学校列表', '✅', '✅', '✅', '✅', '✅', 'GET /api/registration/config/schools/:districtCode, 36所学校配置'],
        ['查询申请状态', '✅', '✅', '✅', '✅', '✅', 'GET /api/registration/status/:phone, RegisterStatusPage.tsx, REG104'],
        ['自动升级机制', '✅', '✅', '✅', 'N/A', '✅', 'registrationEscalationService.js, cron每小时检查'],
        ['管理员查看待审核列表', '✅', '✅', '✅', '✅', '✅', 'GET /api/registration/admin/requests, RegistrationApprovalPage.tsx, REG105'],
        ['管理员搜索注册申请', '✅', '✅', '✅', '✅', '✅', '按手机号/姓名搜索'],
        ['管理员批准注册申请', '✅', '✅', '✅', '✅', '✅', 'POST /api/registration/admin/approve/:id, 自动创建学生账号, REG106-109'],
        ['管理员拒绝注册申请', '✅', '✅', '✅', '✅', '❌', 'POST /api/registration/admin/reject/:id, 缺E2E测试'],
        ['查看审核历史', '✅', '❌', '❌', '❌', '❌', 'GET /api/registration/admin/history/:id (待开发)'],
    ]
    columns = ['功能', '数据库', '后端API', 'API测试', '前端', 'E2E测试', '备注']
    file_path = Path(__file__).parent / '10_学生自主注册系统.csv'
    write_csv_with_bom(file_path, data, columns)

def merge_csv_to_excel():
    """将所有CSV文件合并到一个Excel工作簿中"""
    status_dir = Path(__file__).parent
    output_file = status_dir / '功能开发状态汇总.xlsx'

    # 定义所有模块的CSV文件（按顺序）
    csv_files = [
        ('00_总表', '00_总表.csv'),
        ('01_用户认证与授权', '01_用户认证与授权.csv'),
        ('02_考试管理', '02_考试管理.csv'),
        ('03_题库管理', '03_题库管理.csv'),
        ('04_题库草稿与审核', '04_题库草稿与审核系统.csv'),
        ('05_成绩管理', '05_成绩管理.csv'),
        ('06_用户管理', '06_用户管理.csv'),
        ('07_Activity活动', '07_Activity活动系统.csv'),
        ('07.1_活动管理细化', '07.1_活动管理功能细化.csv'),
        ('07.2_时间限制优化', '07.2_练习活动时间限制优化.csv'),
        ('07.3_答题评卷', '07.3_学生答题与教师评卷功能.csv'),
        ('08_系统配置', '08_系统配置.csv'),
        ('08.1_组卷管理', '08.1_活动组卷管理系统.csv'),
        ('09_个人成长', '09_个人成长系统.csv'),
        ('10_学生注册', '10_学生自主注册系统.csv'),
        ('11_成绩查询优化', '11_成绩查询系统优化.csv'),
    ]

    # 创建Excel写入器
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        for sheet_name, csv_file in csv_files:
            csv_path = status_dir / csv_file
            if not csv_path.exists():
                print(f"[WARNING] 文件不存在，跳过: {csv_file}")
                continue

            # 读取CSV（UTF-8编码）
            try:
                df = pd.read_csv(csv_path, encoding='utf-8-sig')
            except:
                # 如果UTF-8 with BOM失败，尝试普通UTF-8
                df = pd.read_csv(csv_path, encoding='utf-8')

            # 写入Excel工作表（工作表名称有31字符限制）
            sheet_name_truncated = sheet_name[:31]
            df.to_excel(writer, sheet_name=sheet_name_truncated, index=False)
            print(f"[OK] 已添加工作表: {sheet_name_truncated}")

        print(f"\n[OK] Excel文件已生成: {output_file}")
        print(f"[INFO] 共包含 {len(csv_files)} 个工作表")

def main():
    """主函数"""
    print("=" * 60)
    print("贵阳市小学生测评平台 - CSV进度表合并工具")
    print("=" * 60)
    print()

    # 步骤1: 重新生成有问题的CSV文件
    print("步骤1: 重新生成CSV文件（UTF-8 with BOM编码）")
    print("-" * 60)
    regenerate_071_csv()
    regenerate_10_csv()
    print()

    # 步骤2: 合并所有CSV到Excel
    print("步骤2: 合并所有CSV文件到Excel工作簿")
    print("-" * 60)
    merge_csv_to_excel()
    print()

    print("=" * 60)
    print("[SUCCESS] 所有任务完成！")
    print("=" * 60)

if __name__ == '__main__':
    main()
