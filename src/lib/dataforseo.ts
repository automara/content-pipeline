/**
 * DataForSEO API Client
 * 
 * This module provides functions to interact with DataForSEO API for keyword research.
 * DataForSEO provides search volume, keyword difficulty, SERP data, and related keywords.
 * 
 * TypeScript Note: We define interfaces for the data structures we work with.
 * This helps TypeScript understand what properties each object has.
 */

/**
 * Configuration for DataForSEO client
 */
interface DataForSEOConfig {
  login: string;
  password: string;
  baseUrl?: string;
}

/**
 * Keyword research data returned from DataForSEO
 */
export interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  keywordDifficulty: number;
  searchIntent: string;
  serpFeatures: string[];
  relatedKeywords: string[];
  competitorUrls: string[];
}

/**
 * DataForSEO API Client
 * 
 * TypeScript Note: Classes are like blueprints for creating objects.
 * This class encapsulates all DataForSEO API interactions.
 */
export class DataForSEOClient {
  private config: DataForSEOConfig;

  constructor(config: DataForSEOConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || "https://api.dataforseo.com/v3",
    };
  }

  /**
   * Make a request to DataForSEO API
   * 
   * TypeScript Note: The return type is Promise<any> because DataForSEO
   * responses have complex nested structures that vary by endpoint.
   */
  private async request(endpoint: string, data: any[]): Promise<any> {
    // Create Basic Auth header
    // TypeScript Note: Buffer is a Node.js built-in for handling binary data
    const auth = Buffer.from(
      `${this.config.login}:${this.config.password}`
    ).toString("base64");

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // DataForSEO returns status_code 20000 for success
    if (result.status_code !== 20000) {
      throw new Error(
        `DataForSEO error: ${result.status_message || "Unknown error"} (code: ${result.status_code})`
      );
    }

    return result;
  }

  /**
   * Get search volume and metrics for keywords
   * 
   * @param keywords - Array of keywords to research
   * @param location - Location code (2840 = United States, 2124 = Canada)
   * @returns Map of keyword to metrics
   */
  async getKeywordVolume(
    keywords: string[],
    location: number = 2840
  ): Promise<Map<string, any>> {
    const result = await this.request("/keywords_data/google/search_volume/live", [
      {
        keywords,
        location_code: location,
        language_code: "en",
      },
    ]);

    const metrics = new Map();
    for (const item of result.tasks?.[0]?.result || []) {
      metrics.set(item.keyword, {
        searchVolume: item.search_volume || 0,
        cpc: item.cpc || 0,
        competition: item.competition || 0,
        monthlySearches: item.monthly_searches || [],
      });
    }
    return metrics;
  }

  /**
   * Get keyword suggestions/ideas from a seed keyword
   * 
   * @param seed - Seed keyword to expand
   * @param limit - Maximum number of suggestions to return
   * @returns Array of related keywords
   */
  async getKeywordIdeas(seed: string, limit: number = 50): Promise<string[]> {
    const result = await this.request(
      "/dataforseo_labs/google/keyword_suggestions/live",
      [
        {
          keyword: seed,
          location_code: 2840,
          language_code: "en",
          include_serp_info: false,
          include_seed_keyword: true,
          limit,
        },
      ]
    );

    return (
      result.tasks?.[0]?.result?.[0]?.items?.map(
        (item: any) => item.keyword
      ) || []
    );
  }

  /**
   * Get SERP data including competitors and features
   * 
   * @param keyword - Keyword to analyze
   * @returns SERP features, competitor URLs, and inferred search intent
   */
  async getSerpData(keyword: string): Promise<{
    serpFeatures: string[];
    competitorUrls: string[];
    searchIntent: string;
  }> {
    const result = await this.request("/serp/google/organic/live/regular", [
      {
        keyword,
        location_code: 2840,
        language_code: "en",
        device: "desktop",
        depth: 10,
      },
    ]);

    const serpData = result.tasks?.[0]?.result?.[0] || {};

    // Extract SERP features
    const serpFeatures: string[] = [];
    if (serpData.item_types) {
      if (serpData.item_types.includes("featured_snippet"))
        serpFeatures.push("Featured Snippet");
      if (serpData.item_types.includes("people_also_ask"))
        serpFeatures.push("PAA");
      if (serpData.item_types.includes("video")) serpFeatures.push("Video");
      if (serpData.item_types.includes("local_pack"))
        serpFeatures.push("Local Pack");
      if (serpData.item_types.includes("knowledge_graph"))
        serpFeatures.push("Knowledge Graph");
    }

    // Extract top competitor URLs
    const competitorUrls =
      serpData.items
        ?.filter((item: any) => item.type === "organic")
        ?.slice(0, 5)
        ?.map((item: any) => item.url) || [];

    // Infer search intent from SERP features and keyword
    const searchIntent = this.inferSearchIntent(serpData, keyword);

    return { serpFeatures, competitorUrls, searchIntent };
  }

  /**
   * Get keyword difficulty score
   * 
   * @param keywords - Array of keywords to check
   * @returns Map of keyword to difficulty score (0-100)
   */
  async getKeywordDifficulty(
    keywords: string[]
  ): Promise<Map<string, number>> {
    const result = await this.request(
      "/dataforseo_labs/google/keyword_difficulty/live",
      [
        {
          keywords,
          location_code: 2840,
          language_code: "en",
        },
      ]
    );

    const difficulties = new Map();
    for (const item of result.tasks?.[0]?.result || []) {
      difficulties.set(item.keyword, item.keyword_difficulty || 50);
    }
    return difficulties;
  }

  /**
   * Full keyword research combining multiple endpoints
   * 
   * This is the main method you'll use - it combines all the data
   * from different endpoints into one comprehensive result.
   * 
   * @param keyword - Keyword to research
   * @returns Complete keyword data
   */
  async researchKeyword(keyword: string): Promise<KeywordData> {
    // Make parallel requests for efficiency
    // TypeScript Note: Promise.all() runs multiple async operations at once
    const [volumeData, serpData, difficultyData, relatedKeywords] =
      await Promise.all([
        this.getKeywordVolume([keyword]),
        this.getSerpData(keyword),
        this.getKeywordDifficulty([keyword]),
        this.getKeywordIdeas(keyword, 20),
      ]);

    const volume = volumeData.get(keyword) || {};

    return {
      keyword,
      searchVolume: volume.searchVolume || 0,
      cpc: volume.cpc || 0,
      competition: volume.competition || 0,
      keywordDifficulty: difficultyData.get(keyword) || 50,
      searchIntent: serpData.searchIntent,
      serpFeatures: serpData.serpFeatures,
      relatedKeywords,
      competitorUrls: serpData.competitorUrls,
    };
  }

  /**
   * Infer search intent from SERP data and keyword
   * 
   * This uses simple heuristics to determine if a keyword is
   * informational, commercial, transactional, or navigational.
   */
  private inferSearchIntent(serpData: any, keyword: string): string {
    const keywordLower = keyword.toLowerCase();

    // Transactional indicators (buying intent)
    if (
      /buy|purchase|pricing|cost|cheap|deal|order|shop/.test(keywordLower)
    ) {
      return "Transactional";
    }

    // Commercial indicators (researching to buy)
    if (
      /best|top|review|compare|vs|alternative|tool|software|platform/.test(
        keywordLower
      )
    ) {
      return "Commercial";
    }

    // Navigational indicators (looking for specific site)
    if (/login|sign in|official|website/.test(keywordLower)) {
      return "Navigational";
    }

    // Check SERP features for additional signals
    const itemTypes = serpData.item_types || [];
    if (itemTypes.includes("shopping")) return "Transactional";
    if (
      itemTypes.includes("featured_snippet") ||
      itemTypes.includes("people_also_ask")
    ) {
      return "Informational";
    }

    // Default to informational
    return "Informational";
  }
}

/**
 * Create and export a singleton instance
 * 
 * TypeScript Note: We use environment variables with the "!" operator
 * to tell TypeScript we're sure these values exist (they should be validated at startup)
 */
export const dataForSEO = new DataForSEOClient({
  login: process.env.DATAFORSEO_LOGIN!,
  password: process.env.DATAFORSEO_PASSWORD!,
});

