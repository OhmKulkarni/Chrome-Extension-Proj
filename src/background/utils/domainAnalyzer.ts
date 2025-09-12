/**
 * Domain Analyzer - Utility for analyzing and categorizing domains
 * Provides domain extraction, classification, and pattern matching
 */

export interface DomainInfo {
  domain: string
  subdomain?: string
  rootDomain: string
  tld: string
  isInternal: boolean
  category: DomainCategory
  risk: RiskLevel
}

export enum DomainCategory {
  ANALYTICS = 'analytics',
  ADVERTISING = 'advertising',
  SOCIAL_MEDIA = 'social_media',
  CDN = 'cdn',
  API = 'api',
  TRACKING = 'tracking',
  SECURITY = 'security',
  UNKNOWN = 'unknown'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export class DomainAnalyzer {
  private static instance: DomainAnalyzer | null = null
  
  // Known domain patterns for categorization
  private readonly domainPatterns = new Map([
    [DomainCategory.ANALYTICS, [
      'google-analytics.com',
      'googletagmanager.com',
      'mixpanel.com',
      'segment.com',
      'amplitude.com'
    ]],
    [DomainCategory.ADVERTISING, [
      'doubleclick.net',
      'googlesyndication.com',
      'facebook.com',
      'ads.twitter.com'
    ]],
    [DomainCategory.CDN, [
      'cloudflare.com',
      'amazonaws.com',
      'jsdelivr.net',
      'unpkg.com'
    ]],
    [DomainCategory.TRACKING, [
      'hotjar.com',
      'fullstory.com',
      'logicmonitor.com'
    ]]
  ])

  private constructor() {}

  public static getInstance(): DomainAnalyzer {
    if (!DomainAnalyzer.instance) {
      DomainAnalyzer.instance = new DomainAnalyzer()
    }
    return DomainAnalyzer.instance
  }

  public extractDomain(url: string): string {
    try {
      const _urlObj = new URL(url)
      return urlObj.hostname
    } catch (error) {
      // Fallback for invalid URLs
      const _match = url.match(/^https?:\/\/([^\/]+)/)
      return match ? match[1] : url
    }
  }

  public analyzeDomain(url: string): DomainInfo {
    const _domain = this.extractDomain(url)
    const _parts = domain.split('.')
    
    // Extract TLD and root domain
    const _tld = parts[parts.length - 1]
    const _rootDomain = parts.length >= 2 
      ? `${parts[parts.length - 2]}.${tld}`
      : domain
    
    // Extract subdomain
    const _subdomain = parts.length > 2 
      ? parts.slice(0, -2).join('.')
      : undefined

    return {
      domain,
      subdomain,
      rootDomain,
      tld,
      isInternal: this.isInternalDomain(domain),
      category: this.categorizeDomain(domain),
      risk: this.assessRisk(domain)
    }
  }

  private isInternalDomain(domain: string): boolean {
    const _internalPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '.local',
      '.internal',
      'chrome-extension://'
    ]
    
    return internalPatterns.some(pattern => 
      domain.includes(pattern)
    )
  }

  private categorizeDomain(domain: string): DomainCategory {
    for (const [category, patterns] of this.domainPatterns) {
      if (patterns.some(pattern => domain.includes(pattern))) {
        return category
      }
    }
    
    // Additional heuristic categorization
    if (domain.includes('api.') || domain.includes('rest.')) {
      return DomainCategory.API
    }
    
    if (domain.includes('cdn') || domain.includes('static')) {
      return DomainCategory.CDN
    }
    
    return DomainCategory.UNKNOWN
  }

  private assessRisk(domain: string): RiskLevel {
    // High risk patterns
    const _highRiskPatterns = [
      'track',
      'analytics',
      'ads',
      'doubleclick',
      'facebook.com'
    ]
    
    // Medium risk patterns  
    const _mediumRiskPatterns = [
      'cdn',
      'static',
      'assets'
    ]
    
    if (highRiskPatterns.some(pattern => domain.includes(pattern))) {
      return RiskLevel.HIGH
    }
    
    if (mediumRiskPatterns.some(pattern => domain.includes(pattern))) {
      return RiskLevel.MEDIUM
    }
    
    return RiskLevel.LOW
  }

  public getDomainStats(domains: string[]): Map<string, number> {
    const _stats = new Map<string, number>()
    
    domains.forEach(domain => {
      const _rootDomain = this.analyzeDomain(domain).rootDomain
      stats.set(rootDomain, (stats.get(rootDomain) || 0) + 1)
    })
    
    return stats
  }

  public filterByCategory(domains: string[], category: DomainCategory): string[] {
    return domains.filter(domain => 
      this.analyzeDomain(domain).category === category
    )
  }

  public filterByRisk(domains: string[], risk: RiskLevel): string[] {
    return domains.filter(domain =>
      this.analyzeDomain(domain).risk === risk
    )
  }
}

export default DomainAnalyzer
