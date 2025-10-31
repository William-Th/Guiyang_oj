// 使用Node.js原生模块的题库导入脚本
const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function login() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = {
    username: 'admin',
    password: 'password123'
  };

  const response = await makeRequest(options, data);
  return response.token;
}

async function createQuestion(token, question) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/question-bank/bank',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  return await makeRequest(options, question);
}

// 只导入前10道单选题作为测试
const questions = [
  {type:'single',subject:'数学',grade:'七年级',content:'下列各数中，最小的数是（）',options:['A. -5','B. -3','C. 0','D. 2'],correct_answer:'A',score:5,difficulty:'easy',explanation:'负数小于零，负数中绝对值越大的数越小，所以-5最小'},
  {type:'single',subject:'数学',grade:'七年级',content:'已知∠A=35°，则∠A的余角是（）',options:['A. 55°','B. 65°','C. 145°','D. 155°'],correct_answer:'A',score:5,difficulty:'easy',explanation:'余角是两个角的和为90°，90°-35°=55°'},
  {type:'single',subject:'数学',grade:'八年级',content:'下列运算正确的是（）',options:['A. a²+a²=a⁴','B. a³·a²=a⁵','C. (a²)³=a⁵','D. a⁶÷a²=a³'],correct_answer:'B',score:5,difficulty:'medium',explanation:'同底数幂相乘，底数不变，指数相加：a³·a²=a⁵'},
  {type:'single',subject:'数学',grade:'八年级',content:'在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）',options:['A. (3,2)','B. (-3,-2)','C. (3,-2)','D. (-3,2)'],correct_answer:'B',score:5,difficulty:'medium',explanation:'关于x轴对称，x坐标不变，y坐标变为相反数'},
  {type:'single',subject:'物理',grade:'八年级',content:'下列物理量中，以科学家的名字命名的单位是（）',options:['A. 长度','B. 时间','C. 力','D. 速度'],correct_answer:'C',score:5,difficulty:'easy',explanation:'力的单位是牛顿(N)，以科学家牛顿的名字命名'},
  {type:'single',subject:'化学',grade:'九年级',content:'下列变化属于化学变化的是（）',options:['A. 冰雪融化','B. 铁生锈','C. 玻璃破碎','D. 汽油挥发'],correct_answer:'B',score:5,difficulty:'easy',explanation:'铁生锈是铁与氧气、水等发生化学反应，生成新物质，属于化学变化'},
  {type:'single',subject:'生物',grade:'七年级',content:'细胞的控制中心是（）',options:['A. 细胞膜','B. 细胞质','C. 细胞核','D. 线粒体'],correct_answer:'C',score:5,difficulty:'easy',explanation:'细胞核内含有遗传物质，是细胞的控制中心'},
  {type:'single',subject:'计算机',grade:'七年级',content:'下列设备中，属于输入设备的是（）',options:['A. 显示器','B. 打印机','C. 键盘','D. 音响'],correct_answer:'C',score:5,difficulty:'easy',explanation:'键盘是输入设备，用于向计算机输入数据和指令'},
  {type:'multiple',subject:'数学',grade:'八年级',content:'下列函数中，y随x增大而增大的有（）',options:['A. y=2x+1','B. y=-x+3','C. y=x²(x>0)','D. y=1/x(x>0)'],correct_answer:['A','C'],score:10,difficulty:'medium',explanation:'A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大'},
  {type:'blank',subject:'数学',grade:'七年级',content:'一个数的相反数是-5，这个数是______。',options:['5'],correct_answer:'5',score:5,difficulty:'easy',explanation:'相反数的定义：只有符号不同的两个数互为相反数'}
];

async function main() {
  try {
    console.log('正在登录...');
    const token = await login();
    console.log('登录成功！\n');

    let success = 0, fail = 0;

    for (let i = 0; i < questions.length; i++) {
      try {
        await createQuestion(token, questions[i]);
        success++;
        console.log(`✓ [${i+1}/${questions.length}] ${questions[i].subject} - ${questions[i].content.substring(0,30)}...`);
      } catch (e) {
        fail++;
        console.log(`✗ [${i+1}/${questions.length}] 失败: ${e.message}`);
      }
    }

    console.log(`\n完成！成功:${success} 失败:${fail}`);
  } catch (e) {
    console.error('错误:', e.message);
  }
}

main();
