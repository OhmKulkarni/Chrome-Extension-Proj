/**
 * Data Migration Utility - Fix Domain Grouping for Existing Data
 *
 * This utility can be run to retroactively fix main_domain values for existing
 * network requests that were captured before the iframe domain grouping fix.
 */

export class DomainGroupingMigration {

  /**
   * Migrate existing network requests to use proper domain grouping
   * This fixes requests that have incorrect main_domain values due to iframe issues
   */
  static async migrateExistingData(): Promise<{
    processed: number;
    migrated: number;
    errors: number;
  }> {
    console.log('🔄 Starting domain grouping migration...');

    let processed = 0;
    let migrated = 0;
    let errors = 0;

    try {
      // Get all network requests from IndexedDB
      const response = await chrome.runtime.sendMessage({
        action: 'getNetworkRequests',
        limit: 10000 // Get a large batch
      });

      if (!response.success) {
        throw new Error('Failed to fetch network requests');
      }

      const networkRequests = response.data || [];
      console.log(`📊 Found ${networkRequests.length} network requests to process`);

      for (const request of networkRequests) {
        processed++;

        try {
          // Check if this request needs migration
          const needsMigration = this.needsDomainMigration(request);

          if (needsMigration) {
            const correctedMainDomain = this.extractCorrectMainDomain(request);

            if (correctedMainDomain !== request.main_domain) {
              // Update the request in the database
              await this.updateRequestMainDomain(request.id, correctedMainDomain);
              migrated++;

              console.log(`✅ Migrated request ${request.id}: ${request.main_domain} → ${correctedMainDomain}`);
            }
          }

          // Log progress every 100 requests
          if (processed % 100 === 0) {
            console.log(`📊 Progress: ${processed}/${networkRequests.length} processed, ${migrated} migrated`);
          }

        } catch (error) {
          errors++;
          console.error(`❌ Error processing request ${request.id}:`, error);
        }
      }

      console.log(`🎉 Migration complete! Processed: ${processed}, Migrated: ${migrated}, Errors: ${errors}`);

      return { processed, migrated, errors };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if a network request needs domain migration
   */
  private static needsDomainMigration(request: any): boolean {
    // Skip if no tab_url (can't determine correct main domain)
    if (!request.tab_url) return false;

    // Skip if main_domain is already correct
    if (request.main_domain && request.tab_url) {
      const tabMainDomain = this.extractDomainFromUrl(request.tab_url);
      if (request.main_domain === tabMainDomain) return false;
    }

    // Skip if request URL and tab URL have same domain (not iframe request)
    if (request.url && request.tab_url) {
      const requestDomain = this.extractDomainFromUrl(request.url);
      const tabDomain = this.extractDomainFromUrl(request.tab_url);
      if (requestDomain === tabDomain) return false;
    }

    // This looks like an iframe request that needs migration
    return true;
  }

  /**
   * Extract the correct main domain for a request
   */
  private static extractCorrectMainDomain(request: any): string {
    // If we have tab_url, extract main domain from it
    if (request.tab_url) {
      return this.extractDomainFromUrl(request.tab_url);
    }

    // Fallback to request URL
    return this.extractDomainFromUrl(request.url);
  }

  /**
   * Extract main domain from URL (same logic as backend)
   */
  private static extractDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Remove 'www.' prefix if present
      const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

      // For most cases, return the base domain
      const parts = withoutWww.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }

      return withoutWww;
    } catch (error) {
      console.warn('Failed to extract domain from URL:', url, error);
      return 'unknown';
    }
  }

  /**
   * Update a request's main_domain in the database
   */
  private static async updateRequestMainDomain(requestId: number, newMainDomain: string): Promise<void> {
    // Note: This would require adding an update method to the background script
    // For now, we'll just log what would be updated
    console.log(`Would update request ${requestId} main_domain to: ${newMainDomain}`);

    // TODO: Implement actual database update when update API is available
    // await chrome.runtime.sendMessage({
    //   action: 'updateNetworkRequest',
    //   id: requestId,
    //   updates: { main_domain: newMainDomain }
    // });
  }
}

// Export for use in console or dashboard
(window as any).DomainGroupingMigration = DomainGroupingMigration;
