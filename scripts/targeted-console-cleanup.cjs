const fs = require('fs');
const path = require('path');

// Only target specific console types - keep errors and warnings for debugging
const CONSOLE_PATTERNS_TO_COMMENT = [
  /^(\s*)console\.log\((.*)\);?\s*$/gm,
  /^(\s*)console\.info\((.*)\);?\s*$/gm,
  /^(\s*)console\.debug\((.*)\);?\s*$/gm
];

// Keep these patterns - don't comment them out
const KEEP_PATTERNS = [
  /console\.error/,
  /console\.warn/,
  /console\.trace/,
  /console\.assert/
];

function shouldKeepConsoleStatement(line) {
  return KEEP_PATTERNS.some(pattern => pattern.test(line));
}

function isMultilineStatement(line, lines, index) {
  // Check if this line doesn't end with ; or )
  const trimmed = line.trim();
  if (!trimmed.endsWith(';') && !trimmed.endsWith(')')) {
    // Look ahead to see if next lines complete the statement
    for (let i = index + 1; i < Math.min(lines.length, index + 3); i++) {
      const nextLine = lines[i].trim();
      if (nextLine.includes(');')) {
        return true;
      }
    }
  }
  return false;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    let commentedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip if already commented
      if (line.trim().startsWith('//')) {
        continue;
      }

      // Skip if we should keep this type of console statement
      if (shouldKeepConsoleStatement(line)) {
        continue;
      }

      // Skip multiline statements (too risky)
      if (isMultilineStatement(line, lines, i)) {
        continue;
      }

      // Check if line matches our target patterns
      for (const pattern of CONSOLE_PATTERNS_TO_COMMENT) {
        if (pattern.test(line)) {
          const match = line.match(/^(\s*)(.*)/);
          if (match) {
            lines[i] = `${match[1]}// ${match[2]}`;
            modified = true;
            commentedCount++;
            break;
          }
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${commentedCount} console statements commented`);
      return commentedCount;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function findTypeScriptFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  console.log('🧹 Starting targeted console cleanup...');
  console.log('📋 Rules:');
  console.log('  ✅ Will comment: console.log, console.info, console.debug');
  console.log('  ❌ Will keep: console.error, console.warn, console.trace, console.assert');
  console.log('  ❌ Will skip: multiline statements, already commented lines');
  console.log('');

  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found');
    process.exit(1);
  }

  const files = findTypeScriptFiles(srcDir);
  console.log(`🔍 Found ${files.length} TypeScript files to process...`);
  console.log('');

  let totalCommented = 0;
  let filesModified = 0;

  for (const file of files) {
    const commented = processFile(file);
    if (commented > 0) {
      filesModified++;
      totalCommented += commented;
    }
  }

  console.log('');
  console.log('📊 Summary:');
  console.log(`  Files processed: ${files.length}`);
  console.log(`  Files modified: ${filesModified}`);
  console.log(`  Console statements commented: ${totalCommented}`);
  console.log('');
  console.log('✅ Targeted console cleanup complete!');
}

if (require.main === module) {
  main();
}
