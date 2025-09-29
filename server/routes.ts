import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPartnerSchema, insertThirdPartySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Partner routes
  app.get("/api/partners", async (req, res) => {
    try {
      const partners = await storage.getPartners();
      res.json(partners);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  app.post("/api/partners", async (req, res) => {
    try {
      const partnerData = insertPartnerSchema.parse(req.body);
      
      // Check if partner already exists
      const exists = await storage.checkPartnerExists(partnerData.name);
      if (exists) {
        return res.status(409).json({ error: "Partner name already exists" });
      }
      
      const partner = await storage.createPartner(partnerData);
      res.status(201).json(partner);
    } catch (error) {
      console.error("Error creating partner:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create partner" });
      }
    }
  });

  app.post("/api/partners/check", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      const exists = await storage.checkPartnerExists(name);
      res.json({ exists });
    } catch (error) {
      console.error("Error checking partner:", error);
      res.status(500).json({ error: "Failed to check partner" });
    }
  });

  // Third party routes
  app.get("/api/third-parties", async (req, res) => {
    try {
      const thirdParties = await storage.getThirdParties();
      res.json(thirdParties);
    } catch (error) {
      console.error("Error fetching third parties:", error);
      res.status(500).json({ error: "Failed to fetch third parties" });
    }
  });

  app.post("/api/third-parties", async (req, res) => {
    try {
      const thirdPartyData = insertThirdPartySchema.parse(req.body);
      
      // Check if third party already exists
      const exists = await storage.checkThirdPartyExists(thirdPartyData.name);
      if (exists) {
        return res.status(409).json({ error: "Third party name already exists" });
      }
      
      const thirdParty = await storage.createThirdParty(thirdPartyData);
      res.status(201).json(thirdParty);
    } catch (error) {
      console.error("Error creating third party:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create third party" });
      }
    }
  });

  app.post("/api/third-parties/check", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      const exists = await storage.checkThirdPartyExists(name);
      res.json({ exists });
    } catch (error) {
      console.error("Error checking third party:", error);
      res.status(500).json({ error: "Failed to check third party" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
