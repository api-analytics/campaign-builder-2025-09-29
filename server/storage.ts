import {
  users,
  marketingPlacements,
  channelTypes,
  categories,
  partners,
  thirdParties,
  type User,
  type UpsertUser,
  type MarketingPlacement,
  type ChannelType,
  type Category,
  type Partner,
  type InsertPartner,
  type ThirdParty,
  type InsertThirdParty,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Marketing placement operations
  getMarketingPlacements(): Promise<MarketingPlacement[]>;
  getMarketingPlacement(id: string): Promise<MarketingPlacement | undefined>;
  createMarketingPlacement(placement: Omit<MarketingPlacement, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketingPlacement>;
  updateMarketingPlacement(id: string, placement: Partial<MarketingPlacement>): Promise<MarketingPlacement>;
  
  // Channel type operations
  getChannelTypes(): Promise<ChannelType[]>;
  createChannelType(channelType: Omit<ChannelType, 'id' | 'createdAt'>): Promise<ChannelType>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category>;
  
  // Partner operations
  getPartners(): Promise<Partner[]>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  checkPartnerExists(name: string): Promise<boolean>;
  
  // Third party operations
  getThirdParties(): Promise<ThirdParty[]>;
  createThirdParty(thirdParty: InsertThirdParty): Promise<ThirdParty>;
  checkThirdPartyExists(name: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Marketing placement operations
  async getMarketingPlacements(): Promise<MarketingPlacement[]> {
    return await db.select().from(marketingPlacements);
  }

  async getMarketingPlacement(id: string): Promise<MarketingPlacement | undefined> {
    const [placement] = await db.select().from(marketingPlacements).where(eq(marketingPlacements.id, id));
    return placement;
  }

  async createMarketingPlacement(placement: Omit<MarketingPlacement, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketingPlacement> {
    const [created] = await db.insert(marketingPlacements).values(placement).returning();
    return created;
  }

  async updateMarketingPlacement(id: string, placement: Partial<MarketingPlacement>): Promise<MarketingPlacement> {
    const [updated] = await db
      .update(marketingPlacements)
      .set({ ...placement, updatedAt: new Date() })
      .where(eq(marketingPlacements.id, id))
      .returning();
    return updated;
  }

  // Channel type operations
  async getChannelTypes(): Promise<ChannelType[]> {
    return await db.select().from(channelTypes);
  }

  async createChannelType(channelType: Omit<ChannelType, 'id' | 'createdAt'>): Promise<ChannelType> {
    const [created] = await db.insert(channelTypes).values(channelType).returning();
    return created;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }
  
  // Partner operations
  async getPartners(): Promise<Partner[]> {
    return await db.select().from(partners).orderBy(asc(partners.name));
  }
  
  async createPartner(partner: InsertPartner): Promise<Partner> {
    const [created] = await db.insert(partners).values(partner).returning();
    return created;
  }
  
  async checkPartnerExists(name: string): Promise<boolean> {
    const [existing] = await db.select().from(partners).where(eq(partners.name, name));
    return !!existing;
  }
  
  // Third party operations
  async getThirdParties(): Promise<ThirdParty[]> {
    return await db.select().from(thirdParties).orderBy(asc(thirdParties.name));
  }
  
  async createThirdParty(thirdParty: InsertThirdParty): Promise<ThirdParty> {
    const [created] = await db.insert(thirdParties).values(thirdParty).returning();
    return created;
  }
  
  async checkThirdPartyExists(name: string): Promise<boolean> {
    const [existing] = await db.select().from(thirdParties).where(eq(thirdParties.name, name));
    return !!existing;
  }
}

export const storage = new DatabaseStorage();
