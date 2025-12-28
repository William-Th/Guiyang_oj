# Run All New API Tests
# 运行所有新创建的API测试

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "运行所有新创建的API测试" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

$tests = @(
    @{Name="题库审核流程测试 (R403-R406)"; File="question-review-workflow-api-test.js"},
    @{Name="用户管理测试"; File="user-management-api-test.js"},
    @{Name="成绩管理测试"; File="results-management-api-test.js"},
    @{Name="题库操作测试 (搜索/删除)"; File="question-bank-operations-api-test.js"}
)

$totalTests = 0
$passedTests = 0
$failedTests = 0

foreach ($test in $tests) {
    Write-Host ""
    Write-Host "--------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "运行: $($test.Name)" -ForegroundColor Yellow
    Write-Host "文件: $($test.File)" -ForegroundColor Yellow
    Write-Host "--------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host ""

    $result = node "tests/api/$($test.File)" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] $($test.Name) 通过" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "[FAILED] $($test.Name) 失败" -ForegroundColor Red
        # Write-Host $result -ForegroundColor Red
    }
    $totalTests++
}

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "测试汇总" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "总测试套件: $totalTests" -ForegroundColor White
Write-Host "通过: $passedTests" -ForegroundColor Green
Write-Host "失败: $failedTests" -ForegroundColor Red
Write-Host ""

if ($failedTests -gt 0) {
    Write-Host "提示: 部分测试失败可能是由于权限配置或测试数据问题" -ForegroundColor Yellow
    Write-Host "      请检查失败的测试输出以获取详细信息" -ForegroundColor Yellow
}

exit $failedTests
