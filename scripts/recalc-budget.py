"""把 formulas 库算出的 SUM 结果写回 openpyxl 缓存值。

适用场景：recalc.py 报告 0 cells 但公式实际存在的情况。
打开 .xlsx → 找公式单元格 → 用 formulas 算出 → 写回 cell.value（缓存值）。
"""
import sys
from openpyxl import load_workbook

import formulas


def force_recalc(path):
    # 先算出所有公式结果
    xl = formulas.ExcelModel().loads(path).finish()
    sol = xl.calculate()

    wb = load_workbook(path)
    updated = 0

    for sheet in wb.worksheets:
        sheet_name = sheet.title
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value is None:
                    continue
                v = str(cell.value)
                if not v.startswith('='):
                    continue
                # 拼回 formulas 用的 key：[file]sheet!cell
                key = f"'[{(path)}]{sheet_name}'!{cell.coordinate}"
                # 兼容路径里的中文字符
                key_alt = f"'[{path}]{sheet_name}'!{cell.coordinate}"
                result = sol.get(key) or sol.get(key_alt)
                if result is None:
                    continue
                # 提取值
                try:
                    inner = list(result.values())[0] if hasattr(result, 'values') else result
                    val = inner.value if hasattr(inner, 'value') else inner
                    # 解开 Range
                    while hasattr(val, 'value'):
                        val = val.value
                    if hasattr(val, '__iter__') and not isinstance(val, str):
                        val = list(val)
                        if val and hasattr(val[0], '__iter__'):
                            val = val[0]
                            if val:
                                val = val[0] if hasattr(val, '__iter__') and not isinstance(val, str) else val
                    cell.value = val
                    updated += 1
                except Exception as e:
                    pass

    wb.save(path)
    print(f'已写回 {updated} 个缓存值到 {path}')


if __name__ == '__main__':
    force_recalc(sys.argv[1])