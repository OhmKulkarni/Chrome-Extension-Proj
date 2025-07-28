import initSqlJs from 'sql.js'

let db: any = null

async function initDatabase() {
  try {
    // Fetch the WASM file
    const wasmResponse = await fetch(chrome.runtime.getURL('sql-wasm.wasm'))
    const wasmBinary = await wasmResponse.arrayBuffer()
    
    const SQL = await initSqlJs({
      wasmBinary: new Uint8Array(wasmBinary)
    })
    
    db = new SQL.Database()
    
    // Drop existing tables to ensure clean schema (for development)
    try {
      db.exec(`
        DROP TABLE IF EXISTS api_calls;
        DROP TABLE IF EXISTS console_errors;
        DROP TABLE IF EXISTS token_events;
        DROP TABLE IF EXISTS minified_libraries;
      `)
      console.log('Dropped existing tables for schema update')
    } catch (e) {
      // Tables might not exist, continue
    }
    
    // Create tables with updated schema allowing NULL values
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        headers TEXT,
        payload_size INTEGER,
        status INTEGER,
        response_body TEXT,
        timestamp INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS console_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        stack_trace TEXT,
        timestamp INTEGER NOT NULL,
        severity TEXT NOT NULL,
        url TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS token_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        value_hash TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        source_url TEXT,
        expiry INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS minified_libraries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT,
        name TEXT,
        version TEXT,
        size INTEGER,
        source_map_available INTEGER NOT NULL,
        url TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_api_calls_timestamp ON api_calls(timestamp);
      CREATE INDEX IF NOT EXISTS idx_api_calls_url ON api_calls(url);
      CREATE INDEX IF NOT EXISTS idx_console_errors_timestamp ON console_errors(timestamp);
      CREATE INDEX IF NOT EXISTS idx_console_errors_severity ON console_errors(severity);
      CREATE INDEX IF NOT EXISTS idx_token_events_timestamp ON token_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_token_events_source_url ON token_events(source_url);
      CREATE INDEX IF NOT EXISTS idx_minified_libraries_timestamp ON minified_libraries(timestamp);
      CREATE INDEX IF NOT EXISTS idx_minified_libraries_domain ON minified_libraries(domain);
    `)
    
    console.log('SQLite database initialized successfully in offscreen document')
    return { success: true }
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error)
    throw error
  }
}

// API Calls operations
function insertApiCall(data: any) {
  console.log('[SQLite] insertApiCall called with data:', data);
  
  // Check if database is available
  if (!db) {
    console.error('[SQLite] Database not initialized!');
    return { id: null, error: 'Database not initialized' };
  }
  
  try {
    // Use a transaction to ensure we can get the ID properly
    const insertStmt = db.prepare(`
      INSERT INTO api_calls (url, method, headers, payload_size, status, response_body, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    const insertParams = [
      data.url || null,
      data.method || null,
      data.headers || null,
      data.payload_size || 0,
      data.status || 0,
      data.response_body || null,
      data.timestamp || Date.now()
    ];
    
    console.log('[SQLite] Executing insert with params:', insertParams);
    
    // Execute the insert
    const result = insertStmt.run(insertParams);
    insertStmt.free();
    
    // Debug logging to see what result contains
    console.log('[SQLite] Insert result:', result);
    console.log('[SQLite] Insert result keys:', Object.keys(result));
    console.log('[SQLite] changes:', result.changes);
    
    // Try to get the last inserted ID using a separate query
    let insertId = null;
    
    // Method 1: Check if result has the ID
    if (result.lastInsertRowid !== undefined && result.lastInsertRowid !== null) {
      insertId = result.lastInsertRowid;
      console.log('[SQLite] Method 1 - lastInsertRowid:', insertId);
    } else if (result.lastID !== undefined && result.lastID !== null) {
      insertId = result.lastID;
      console.log('[SQLite] Method 1 - lastID:', insertId);
    } else if (result.insertId !== undefined && result.insertId !== null) {
      insertId = result.insertId;
      console.log('[SQLite] Method 1 - insertId:', insertId);
    }
    
    // Method 2: Use SQLite built-in function
    if (!insertId || insertId === null) {
      try {
        const lastRowStmt = db.prepare("SELECT last_insert_rowid() as id");
        const lastRowResult = lastRowStmt.get();
        lastRowStmt.free();
        insertId = lastRowResult?.id;
        console.log('[SQLite] Method 2 - last_insert_rowid():', insertId);
      } catch (e) {
        console.log('[SQLite] Method 2 failed:', e);
      }
    }
    
    // Method 3: Query the table directly for the most recent record
    if (!insertId || insertId === null) {
      try {
        const maxIdStmt = db.prepare(`
          SELECT id FROM api_calls 
          WHERE url = ? AND timestamp = ? 
          ORDER BY id DESC LIMIT 1
        `);
        const maxIdResult = maxIdStmt.get([
          data.url || null,
          data.timestamp || Date.now()
        ]);
        maxIdStmt.free();
        insertId = maxIdResult?.id;
        console.log('[SQLite] Method 3 - direct query:', insertId);
      } catch (e) {
        console.log('[SQLite] Method 3 failed:', e);
      }
    }
    
    // Method 4: Get maximum ID from table (fallback)
    if (!insertId || insertId === null) {
      try {
        const maxStmt = db.prepare("SELECT MAX(id) as maxId FROM api_calls");
        const maxResult = maxStmt.get();
        maxStmt.free();
        insertId = maxResult?.maxId;
        console.log('[SQLite] Method 4 - MAX(id):', insertId);
      } catch (e) {
        console.log('[SQLite] Method 4 failed:', e);
      }
    }
    
    console.log('[SQLite] Final insertId:', insertId, 'type:', typeof insertId);
    
    const finalResult = { id: insertId };
    console.log('[SQLite] Returning result:', finalResult);
    return finalResult;
    
  } catch (error) {
    console.error('[SQLite] insertApiCall error:', error);
    const errorResult = { id: null, error: error instanceof Error ? error.message : String(error) };
    console.log('[SQLite] Returning error result:', errorResult);
    return errorResult;
  }
}

function getApiCalls(params: { limit: number, offset: number }) {
  const stmt = db.prepare(`
    SELECT id, url, method, headers, payload_size, status, response_body, timestamp
    FROM api_calls
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `)
  
  // Use bind and all() for proper multiple row retrieval
  stmt.bind([params.limit, params.offset])
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  
  return {
    data: rows
  }
}

function deleteApiCall(params: { id: number }) {
  const stmt = db.prepare('DELETE FROM api_calls WHERE id = ?')
  stmt.run([params.id])
  stmt.free()
  return { success: true }
}

// Console Errors operations
function insertConsoleError(data: any) {
  const stmt = db.prepare(`
    INSERT INTO console_errors (message, stack_trace, timestamp, severity, url)
    VALUES (?, ?, ?, ?, ?)
  `)
  const result = stmt.run([
    data.message || null,
    data.stack_trace || null,
    data.timestamp || Date.now(),
    data.severity || 'error',
    data.url || null
  ])
  stmt.free()
  return { id: result.lastID }
}

function getConsoleErrors(params: { limit: number, offset: number }) {
  const stmt = db.prepare(`
    SELECT id, message, stack_trace, timestamp, severity, url
    FROM console_errors
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `)
  
  // Use bind and all() for proper multiple row retrieval
  stmt.bind([params.limit, params.offset])
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  
  return {
    data: rows
  }
}

function deleteConsoleError(params: { id: number }) {
  const stmt = db.prepare('DELETE FROM console_errors WHERE id = ?')
  stmt.run([params.id])
  stmt.free()
  return { success: true }
}

// Token Events operations
function insertTokenEvent(data: any) {
  const stmt = db.prepare(`
    INSERT INTO token_events (type, value_hash, timestamp, source_url, expiry)
    VALUES (?, ?, ?, ?, ?)
  `)
  const result = stmt.run([
    data.type || null,
    data.value_hash || null,
    data.timestamp || Date.now(),
    data.source_url || null,
    data.expiry || null
  ])
  stmt.free()
  return { id: result.lastID }
}

function getTokenEvents(params: { limit: number, offset: number }) {
  const stmt = db.prepare(`
    SELECT id, type, value_hash, timestamp, source_url, expiry
    FROM token_events
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `)
  
  // Use bind and all() for proper multiple row retrieval
  stmt.bind([params.limit, params.offset])
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  
  return {
    data: rows
  }
}

function deleteTokenEvent(params: { id: number }) {
  const stmt = db.prepare('DELETE FROM token_events WHERE id = ?')
  stmt.run([params.id])
  stmt.free()
  return { success: true }
}

// Minified Libraries operations
function insertMinifiedLibrary(data: any) {
  const stmt = db.prepare(`
    INSERT INTO minified_libraries (domain, name, version, size, source_map_available, url, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run([
    data.domain || null,
    data.name || null,
    data.version || null,
    data.size || 0,
    data.source_map_available ? 1 : 0,
    data.url || null,
    data.timestamp || Date.now()
  ])
  stmt.free()
  return { id: result.lastID }
}

function getMinifiedLibraries(params: { limit: number, offset: number }) {
  const stmt = db.prepare(`
    SELECT id, domain, name, version, size, source_map_available, url, timestamp
    FROM minified_libraries
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `)
  
  // Use bind and all() for proper multiple row retrieval
  stmt.bind([params.limit, params.offset])
  const rows = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      ...row,
      source_map_available: Boolean(row.source_map_available)
    })
  }
  stmt.free()
  
  return {
    data: rows
  }
}

function deleteMinifiedLibrary(params: { id: number }) {
  const stmt = db.prepare('DELETE FROM minified_libraries WHERE id = ?')
  stmt.run([params.id])
  stmt.free()
  return { success: true }
}

// Data pruning
function pruneOldData(params: { cutoffTime: number, maxRecords: number }) {
  const tables = ['api_calls', 'console_errors', 'token_events', 'minified_libraries']
  
  for (const table of tables) {
    // Delete old records
    db.exec(`DELETE FROM ${table} WHERE timestamp < ${params.cutoffTime}`)
    
    // Limit total records
    const countResult = db.exec(`SELECT COUNT(*) as count FROM ${table}`)
    const count = countResult[0]?.values[0]?.[0] as number || 0
    
    if (count > params.maxRecords) {
      const excess = count - params.maxRecords
      db.exec(`
        DELETE FROM ${table} 
        WHERE id IN (
          SELECT id FROM ${table} 
          ORDER BY timestamp ASC 
          LIMIT ${excess}
        )
      `)
    }
  }
  
  return { success: true }
}

function getTableCounts() {
  const tables = ['api_calls', 'console_errors', 'token_events', 'minified_libraries']
  const counts: { [table: string]: number } = {}
  
  for (const table of tables) {
    const result = db.exec(`SELECT COUNT(*) as count FROM ${table}`)
    counts[table] = result[0]?.values[0]?.[0] as number || 0
  }
  
  return { counts }
}

function getStorageInfo() {
  // Get database size (rough estimate)
  const result = db.exec("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
  const size = result[0]?.values[0]?.[0] as number || 0
  return { size }
}

// Message handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Offscreen] 🚨 MESSAGE RECEIVED:', message);
  console.log('[Offscreen] 🚨 Message action:', message.action);
  console.log('[Offscreen] 🚨 Message data:', message.data);
  console.log('[Offscreen] 🚨 Message keys:', Object.keys(message || {}));
  
  try {
    let response
    
    switch (message.action) {
      case 'initDatabase':
        console.log('[Offscreen] Initializing database...')
        initDatabase().then(result => {
          console.log('[Offscreen] Database initialization result:', result)
          sendResponse(result)
        }).catch(error => {
          console.error('[Offscreen] Database initialization error:', error)
          sendResponse({ error: error.message })
        })
        return true // Async response
        
      case 'insertApiCall':
        console.log('[Offscreen] ⚡ CRITICAL DEBUG: insertApiCall case triggered!');
        console.log('[Offscreen] Processing insertApiCall request with data:', message.data);
        console.log('[Offscreen] Data keys:', Object.keys(message.data || {}));
        
        // Test if insertApiCall function exists
        if (typeof insertApiCall !== 'function') {
          console.error('[Offscreen] ❌ insertApiCall is not a function!', typeof insertApiCall);
          response = { id: null, error: 'insertApiCall function not found' };
        } else {
          console.log('[Offscreen] ✅ insertApiCall function exists');
          try {
            console.log('[Offscreen] About to call insertApiCall function...');
            response = insertApiCall(message.data);
            console.log('[Offscreen] ⚡ insertApiCall function completed, response:', response);
            console.log('[Offscreen] Response type:', typeof response);
            console.log('[Offscreen] Response keys:', Object.keys(response || {}));
            console.log('[Offscreen] Response stringified:', JSON.stringify(response));
            
            // Double-check the response is valid
            if (response === undefined || response === null) {
              console.error('[Offscreen] ❌ insertApiCall returned undefined/null!');
              response = { id: null, error: 'Function returned undefined/null' };
            } else if (typeof response !== 'object') {
              console.error('[Offscreen] ❌ insertApiCall returned non-object:', typeof response);
              response = { id: null, error: `Function returned ${typeof response}` };
            }
            
          } catch (error) {
            console.error('[Offscreen] ❌ insertApiCall failed with error:', error);
            if (error instanceof Error) {
              console.error('[Offscreen] Error stack:', error.stack);
            }
            response = { id: null, error: error instanceof Error ? error.message : String(error) };
          }
        }
        break
        
      case 'getApiCalls':
        response = getApiCalls(message.data)
        break
        
      case 'deleteApiCall':
        response = deleteApiCall(message.data)
        break
        
      case 'insertConsoleError':
        response = insertConsoleError(message.data)
        break
        
      case 'getConsoleErrors':
        response = getConsoleErrors(message.data)
        break
        
      case 'deleteConsoleError':
        response = deleteConsoleError(message.data)
        break
        
      case 'insertTokenEvent':
        response = insertTokenEvent(message.data)
        break
        
      case 'getTokenEvents':
        response = getTokenEvents(message.data)
        break
        
      case 'deleteTokenEvent':
        response = deleteTokenEvent(message.data)
        break
        
      case 'insertMinifiedLibrary':
        response = insertMinifiedLibrary(message.data)
        break
        
      case 'getMinifiedLibraries':
        response = getMinifiedLibraries(message.data)
        break
        
      case 'deleteMinifiedLibrary':
        response = deleteMinifiedLibrary(message.data)
        break
        
      case 'pruneOldData':
        response = pruneOldData(message.data)
        break
        
      case 'getTableCounts':
        response = getTableCounts()
        break
        
      case 'getStorageInfo':
        response = getStorageInfo()
        break
        
      default:
        console.log('[Offscreen] 🚨 UNKNOWN ACTION:', message.action);
        console.log('[Offscreen] 🚨 Full message:', message);
        response = { error: `Unknown action: ${message.action}` }
    }
    
    // Ensure response is never undefined or null
    if (response === undefined || response === null) {
      console.error('[Offscreen] Response was undefined/null, creating error response');
      response = { error: 'Function returned undefined/null response' };
    }
    
    console.log('[Offscreen] About to send response:', response);
    console.log('[Offscreen] Response type:', typeof response);
    console.log('[Offscreen] Response keys:', Object.keys(response || {}));
    
    sendResponse(response)
  } catch (error) {
    console.error('[Offscreen] Error in message handler:', error)
    const errorResponse = { error: error instanceof Error ? error.message : String(error) };
    console.log('[Offscreen] Sending error response:', errorResponse);
    sendResponse(errorResponse)
  }
})

console.log('[Offscreen] Document script loaded and ready to receive messages')

// Send a ready signal to the background script
chrome.runtime.sendMessage({ action: 'offscreenReady' }).catch(error => {
  console.log('[Offscreen] Could not send ready signal (background may not be listening):', error.message)
})
