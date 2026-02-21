
const fs = require('fs');
const path = require('path');

const SEVERITIES = {
    CRITICAL: '🔴 CRITICAL',
    MEDIUM: '🟡 MEDIUM',
    LOW: '🟢 LOW'
};

const CHECKS = [
    {
        name: 'Insecure JWT Fallback',
        regex: /JWT_SECRET\s*\|\|\s*["'].+["']/,
        severity: SEVERITIES.CRITICAL,
        suggestion: 'Never use a fallback for JWT_SECRET in production code.',
        files: ['functions/**/*.js']
    },
    {
        name: 'Vulnerable localStorage Token',
        regex: /localStorage\.(getItem|setItem|removeItem)\s*\(\s*["']auth_token["']/,
        severity: SEVERITIES.CRITICAL,
        suggestion: 'Use httpOnly cookies instead of localStorage for authentication tokens.',
        files: ['src/**/*.tsx', 'src/**/*.ts', 'components/**/*.tsx']
    },
    {
        name: 'Potential SQL Injection',
        regex: /\.prepare\s*\(\s*`[^`]*\$\{.*?\}[^`]*`/,
        severity: SEVERITIES.CRITICAL,
        suggestion: 'Use .bind() parameters instead of template literals in SQL queries.',
        files: ['functions/**/*.js']
    },
    {
        name: 'XSS Risk: Dangerous HTML',
        regex: /dangerouslySetInnerHTML/,
        severity: SEVERITIES.MEDIUM,
        suggestion: 'Avoid dangerouslySetInnerHTML. Sanitize data if strictly required.',
        files: ['src/**/*.tsx', 'components/**/*.tsx']
    },
    {
        name: 'Sensitive Info in Logs',
        regex: /console\.log\s*\(.*?(key|secret|password|token|auth).*?\)/i,
        severity: SEVERITIES.MEDIUM,
        suggestion: 'Do not log sensitive variables to the console.',
        files: ['functions/**/*.js', 'src/**/*.tsx']
    },
    {
        name: 'Weak CSP: Unsafe-Inline',
        regex: /['"]unsafe-inline['"]/,
        severity: SEVERITIES.MEDIUM,
        suggestion: 'Avoid unsafe-inline in CSP; move scripts to external files.',
        files: ['functions/_middleware.js', 'index.html']
    }
];

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

function runScan() {
    console.log("🔍 Surgeon Bot: Starting Security CI Scan...\n");
    let criticalFound = 0;
    const projectRoot = process.cwd();
    const allFiles = getAllFiles(projectRoot);

    const report = [];

    CHECKS.forEach(check => {
        allFiles.forEach(file => {
            const relativePath = path.relative(projectRoot, file);
            const isMatch = check.files.some(pattern => {
                const parts = pattern.split('/');
                const baseDir = parts[0];
                const ext = parts[parts.length - 1].split('.').pop();
                return relativePath.startsWith(baseDir) && relativePath.endsWith(ext);
            });

            if (!isMatch) return;

            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                if (check.regex.test(line)) {
                    report.push({
                        check: check.name,
                        file: relativePath,
                        line: index + 1,
                        severity: check.severity,
                        content: line.trim(),
                        suggestion: check.suggestion
                    });
                    if (check.severity === SEVERITIES.CRITICAL) criticalFound++;
                }
            });
        });
    });

    if (report.length === 0) {
        console.log("✅ No security issues found. Clean scan!\n");
    } else {
        report.forEach(r => {
            console.log(`[${r.severity}] ${r.check}`);
            console.log(`File: ${r.file} (Line ${r.line})`);
            console.log(`Code: ${r.content}`);
            console.log(`Fix:  ${r.suggestion}`);
            console.log(`--------------------------------------------------`);
        });
        console.log(`\nScan Summary: Found ${report.length} issues.`);
    }

    if (criticalFound > 0) {
        console.log(`\n❌ CI BLOCKER: ${criticalFound} CRITICAL issues found. Fix them before deployment!`);
        process.exit(1);
    } else {
        console.log("\n🚀 Scan passed. Deployment ready.");
        process.exit(0);
    }
}

runScan();
