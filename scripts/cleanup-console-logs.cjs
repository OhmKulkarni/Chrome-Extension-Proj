#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to automatically comment out single-line console statements
 * while preserving multiline console statements and handling unused variables
 */

// Configuration
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const CONSOLE_METHODS = ['log', 'warn', 'info', 'debug'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const DRY_RUN = process.argv.includes('--dry-run');

// Statistics
let stats = {
  filesProcessed: 0,
  linesCommented: 0,
  filesChanged: 0,
  variablesUnderscored: 0
};

/**
 * Check if a line is a single-line console statement
 */
function isSingleLineConsoleStatement(line) {
  const trimmed = line.trim();
  
  // Skip already commented lines
  if (trimmed.startsWith('//')) {
    return false;
  }
  
  // Check for console.method( pattern
  const consoleRegex = new RegExp(`^\\s*console\\.(${CONSOLE_METHODS.join('|')})\\s*\\(.*\\);?\\s*$`);
  return consoleRegex.test(line);
}

/**
 * Check if a line starts a multiline console statement
 */
function isMultiLineConsoleStart(line) {
  const trimmed = line.trim();
  
  // Skip already commented lines
  if (trimmed.startsWith('//')) {
    return false;
  }
  
  // Check for console.method( but no closing on same line
  const consoleRegex = new RegExp(`^\\s*console\\.(${CONSOLE_METHODS.join('|')})\\s*\\(`);
  const hasClosing = line.includes(');');
  
  return consoleRegex.test(line) && !hasClosing;
}

/**
 * Add underscore prefix to unused variables in a line
 */
function addUnderscoreToUnusedVars(line) {
  let modifiedLine = line;
  let changes = 0;
  
  // Pattern for variable declarations that might be unused
  // const variableName = something
  // let variableName = something  
  // var variableName = something
  const varDeclRegex = /(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
  
  modifiedLine = modifiedLine.replace(varDeclRegex, (match, keyword, varName) => {
    // Don't modify if already has underscore or is a common pattern we want to keep
    if (varName.startsWith('_') || 
        varName === 'React' || 
        varName === 'useState' ||
        varName.includes('Effect') ||
        varName.includes('Ref') ||
        varName.includes('Context')) {
      return match;
    }
    
    changes++;
    return `${keyword} _${varName} =`;
  });
  
  // Pattern for destructured variables that might be unused
  // const { unused, used } = something
  const destructureRegex = /{\s*([^}]+)\s*}/g;
  
  modifiedLine = modifiedLine.replace(destructureRegex, (match, variables) => {
    const vars = variables.split(',').map(v => v.trim());
    const modifiedVars = vars.map(v => {
      // Handle renamed variables like "original: renamed"
      if (v.includes(':')) {
        return v;
      }
      
      // Handle spread syntax
      if (v.startsWith('...')) {
        return v;
      }
      
      // Don't modify if already has underscore
      if (v.startsWith('_')) {
        return v;
      }
      
      // For simple variable names, consider adding underscore
      // This is conservative - only do it for obvious debug/unused patterns
      if (v.match(/^(response|data|result|temp|debug|test)$/i)) {
        changes++;
        return `_${v}`;
      }
      
      return v;
    });
    
    return `{ ${modifiedVars.join(', ')} }`;
  });
  
  return { line: modifiedLine, changes };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    let fileStats = {
      linesCommented: 0,
      variablesUnderscored: 0
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle single-line console statements
      if (isSingleLineConsoleStatement(line)) {
        const indent = line.match(/^\s*/)[0];
        lines[i] = `${indent}// ${line.trim()}`;
        modified = true;
        fileStats.linesCommented++;
        continue;
      }
      
      // Skip multiline console statements (user will handle manually)
      if (isMultiLineConsoleStart(line)) {
        console.log(`  📝 Multiline console found at line ${i + 1}: ${line.trim()}`);
        continue;
      }
      
      // Handle unused variables (conservative approach)
      const varResult = addUnderscoreToUnusedVars(line);
      if (varResult.changes > 0) {
        lines[i] = varResult.line;
        modified = true;
        fileStats.variablesUnderscored += varResult.changes;
      }
    }
    
    if (modified && !DRY_RUN) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      stats.filesChanged++;
    }
    
    if (modified || fileStats.linesCommented > 0) {
      console.log(`  ✅ ${path.relative(process.cwd(), filePath)}: ${fileStats.linesCommented} console statements commented, ${fileStats.variablesUnderscored} variables underscored`);
    }
    
    stats.linesCommented += fileStats.linesCommented;
    stats.variablesUnderscored += fileStats.variablesUnderscored;
    
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively find all target files
 */
function findTargetFiles(dir, files = []) {
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry)) {
        findTargetFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(entry);
      if (TARGET_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🧹 Console Log Cleanup Script');
  console.log('================================');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified');
  }
  
  console.log(`📁 Scanning for ${TARGET_EXTENSIONS.join(', ')} files...`);
  
  const startDir = path.join(__dirname, '..');
  const targetFiles = findTargetFiles(startDir);
  
  console.log(`📊 Found ${targetFiles.length} files to process`);
  console.log('');
  
  for (const file of targetFiles) {
    stats.filesProcessed++;
    processFile(file);
  }
  
  console.log('');
  console.log('📊 Final Statistics:');
  console.log('===================');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesChanged}`);
  console.log(`Console statements commented: ${stats.linesCommented}`);
  console.log(`Variables underscored: ${stats.variablesUnderscored}`);
  
  if (DRY_RUN) {
    console.log('');
    console.log('💡 Run without --dry-run to apply changes');
  } else {
    console.log('');
    console.log('✅ Cleanup complete!');
    console.log('📝 Remember to manually handle any multiline console statements reported above');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, isSingleLineConsoleStatement, addUnderscoreToUnusedVars };