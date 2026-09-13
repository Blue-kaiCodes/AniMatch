import fs from 'fs';
import path from 'path';

export function getCorrectSqlHost(originalHost: string | undefined): string | undefined {
  if (!originalHost) return originalHost;
  
  if (originalHost.startsWith('/')) {
    if (fs.existsSync(originalHost)) {
      return originalHost;
    }
    
    const parentDir = '/app/cloudsql';
    if (fs.existsSync(parentDir)) {
      try {
        const dirs = fs.readdirSync(parentDir);
        // Look for any directories containing ai-studio-c146d1f7 or c146d1f7
        const matched = dirs.find(d => d.includes('ai-studio-c146d1f7') || d.includes('c146d1f7'));
        if (matched) {
          const corrected = path.join(parentDir, matched);
          console.log(`[DB Auto-Correct] Corrected SQL_HOST from "${originalHost}" to "${corrected}"`);
          return corrected;
        }
        if (dirs.length > 0) {
          const corrected = path.join(parentDir, dirs[0]);
          console.log(`[DB Auto-Correct] Corrected SQL_HOST to first available: "${corrected}"`);
          return corrected;
        }
      } catch (err: any) {
        console.error('[DB Auto-Correct] Failed to read /app/cloudsql:', err.message);
      }
    }
  }
  return originalHost;
}
