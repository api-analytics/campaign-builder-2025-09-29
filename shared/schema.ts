import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Channel types for marketing placements
export const channelTypes = pgTable("channel_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  prefix: varchar("prefix", { length: 10 }).notNull().unique(),
  color: varchar("color", { length: 7 }).default("#219DB8"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketing placement categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketing placements with comprehensive campaign data
export const marketingPlacements = pgTable("marketing_placements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic campaign info
  title: varchar("title").notNull(),
  description: text("description"),
  baseUrl: varchar("base_url").notNull(),
  anchorTag: varchar("anchor_tag"),
  
  // Campaign details
  campaignType: varchar("campaign_type"),
  campaignSource: varchar("campaign_source"),
  adType: varchar("ad_type"),
  adTypeDetail: varchar("ad_type_detail"),
  targeting: boolean("targeting"),
  
  // Brand information
  brand1: varchar("brand_1"),
  brand2: varchar("brand_2"),
  brand3: varchar("brand_3"),
  productCategory: varchar("product_category"),
  productBrand: varchar("product_brand"),
  
  // Campaign management
  campaignOwner: varchar("campaign_owner"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  campaignNotes: text("campaign_notes"),
  
  // Financial & organizational
  projectReferenceNumber: varchar("project_reference_number"),
  budget: varchar("budget"),
  industry: varchar("industry"),
  tactic: varchar("tactic"),
  costCenter: varchar("cost_center"),
  subLedger: varchar("sub_ledger"),
  
  // Partnership info
  partnering: boolean("partnering"),
  partnerName: varchar("partner_name"),
  thirdParty: boolean("third_party"),
  thirdPartyName: varchar("third_party_name"),
  
  // System fields
  channelTypeId: varchar("channel_type_id").references(() => channelTypes.id),
  categoryId: varchar("category_id").references(() => categories.id),
  trackingCode: varchar("tracking_code").notNull().unique(),
  fullTrackingUrl: text("full_tracking_url"),
  status: varchar("status").default("draft"), // draft, active, paused, archived
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tracking counter for auto-incrementing
export const trackingCounter = pgTable("tracking_counter", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelTypeId: varchar("channel_type_id").references(() => channelTypes.id),
  currentCount: integer("current_count").default(1),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Admin UI settings
export const uiSettings = pgTable("ui_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  setting: varchar("setting").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Help content for tooltips and panels
export const helpContent = pgTable("help_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  section: varchar("section").notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").default("tooltip"), // tooltip, panel, guide
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partners table for managing partner names
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Third parties table for managing 3rd party names
export const thirdParties = pgTable("third_parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChannelTypeSchema = createInsertSchema(channelTypes).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertMarketingPlacementSchema = createInsertSchema(marketingPlacements)
  .omit({
    id: true,
    trackingCode: true,
    fullTrackingUrl: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Add validation rules for required fields
    title: z.string().min(1, "Campaign title is required"),
    baseUrl: z.string().url("Must be a valid URL"),
    campaignType: z.string().min(1, "Campaign type is required"),
    campaignSource: z.string().min(1, "Campaign source is required"),
    adType: z.string().min(1, "Ad type is required"),
    targeting: z.boolean(),
    brand1: z.string().min(1, "Brand 1 is required"),
    productCategory: z.string().min(1, "Product category is required"),
    campaignOwner: z.string().min(1, "Campaign owner is required"),
    startDate: z.date({ required_error: "Start date is required" }),
    projectReferenceNumber: z.string().min(1, "Project reference number is required"),
    industry: z.string().min(1, "Industry is required"),
    tactic: z.string().min(1, "Tactic is required"),
    costCenter: z.string().min(1, "Cost center is required"),
    partnering: z.boolean(),
    thirdParty: z.boolean(),
  });

export const insertHelpContentSchema = createInsertSchema(helpContent).omit({
  id: true,
  updatedAt: true,
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertThirdPartySchema = createInsertSchema(thirdParties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ChannelType = typeof channelTypes.$inferSelect;
export type InsertChannelType = z.infer<typeof insertChannelTypeSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MarketingPlacement = typeof marketingPlacements.$inferSelect;
export type InsertMarketingPlacement = z.infer<typeof insertMarketingPlacementSchema>;

export type HelpContent = typeof helpContent.$inferSelect;
export type InsertHelpContent = z.infer<typeof insertHelpContentSchema>;

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;

export type ThirdParty = typeof thirdParties.$inferSelect;
export type InsertThirdParty = z.infer<typeof insertThirdPartySchema>;

export type UISettings = typeof uiSettings.$inferSelect;
export type TrackingCounter = typeof trackingCounter.$inferSelect;