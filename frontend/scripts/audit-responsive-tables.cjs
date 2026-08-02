const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');
const globalStylesPath = path.join(sourceRoot, 'styles', 'index.css');

function collectTableFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTableFiles(entryPath);
    if (!entry.name.endsWith('.tsx')) return [];
    return fs.readFileSync(entryPath, 'utf8').includes('<Table') ? [entryPath] : [];
  });
}

const tableFiles = collectTableFiles(sourceRoot);
const styles = fs.readFileSync(globalStylesPath, 'utf8');
const mobileStyles = styles.slice(styles.indexOf('@media (max-width: 768px)'));

const requiredRules = [
  ['horizontal table scrolling', '.ant-table-wrapper'],
  ['fixed right column reset', '.ant-table-cell-fix-right'],
  ['fixed left column reset', '.ant-table-cell-fix-left'],
  ['readable table headers', '.ant-table-thead'],
  ['compact table pagination', '.ant-table-pagination'],
  ['wrapping card filters', '.ant-card-head-wrapper'],
];

const missingRules = requiredRules
  .filter(([, selector]) => !mobileStyles.includes(selector))
  .map(([label]) => label);

if (tableFiles.length === 0) {
  throw new Error('No Ant Design table components were found under src/.');
}

if (missingRules.length > 0) {
  throw new Error(`Missing mobile table protections: ${missingRules.join(', ')}`);
}

const fixedColumnFiles = tableFiles.filter((file) =>
  fs.readFileSync(file, 'utf8').includes('fixed:')
);
const horizontallyScrollableFiles = tableFiles.filter((file) =>
  fs.readFileSync(file, 'utf8').includes('scroll=')
);

console.log(
  `Responsive table audit passed: ${tableFiles.length} components, ` +
  `${fixedColumnFiles.length} with fixed columns, ` +
  `${horizontallyScrollableFiles.length} with explicit scrolling.`
);
