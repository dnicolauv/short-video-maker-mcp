import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import fs from "fs-extra";
import path from "path";

import { validateCreateShortInput } from "../validator";
import { ShortCreator } from "../../short-creator/ShortCreator";
import { logger } from "../../logger";
import { Config } from "../../config";

import { GeminiEnhancer } from "../../short-creator/libraries/GeminiEnhancer";

type SceneInput = {
  text: string;
  searchTerms?: string[];
};

export class APIRouter {
  public router: express.Router;
  private shortCreator: ShortCreator;
  private config: Config;
  private geminiEnhancer: GeminiEnhancer;

  constructor(config: Config, shortCreator: ShortCreator) {
    this.config = config;
    this.router = express.Router();
    this.shortCreator = shortCreator;

    this.geminiEnhancer = new GeminiEnhancer(config.geminiApiKey);

    this.router.use(express.json());
    this.setupRoutes();
  }

  private async enhanceScenesWithGemini(
    scenes: { text: string; searchTerms: string[] }[]
  ): Promise<{ text: string; searchTerms: string[] }[]> {
    const enhancedScenes = [];

    for (const scene of scenes) {
      const keywords = scene.searchTerms ?? [];
      const enhancedText = await this.geminiEnhancer.enhancePrompt(scene.text, keywords);

      enhancedScenes.push({
        ...scene,
        text: enhancedText,
        searchTerms: keywords,
      });
    }

    return enhancedScenes;
  }


  private setupRoutes() {
    this.router.post(
      "/short-video",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const input = validateCreateShortInput(req.body);

          if (!input.scenes || !Array.isArray(input.scenes) || input.scenes.length === 0) {
            res.status(400).json({ error: "No scenes provided or invalid format" });
            return;
          }

          if (!input.config.transitionType) {
            input.config.transitionType = "fade";
          }

          // enhance scenes with Gemini before creating the video
          const enhancedScenes = await this.enhanceScenesWithGemini(input.scenes);

          const videoId = this.shortCreator.addToQueue(enhancedScenes, input.config);

          res.status(201).json({ videoId });
        } catch (error: unknown) {
          logger.error(error, "Error validating input");

          if (error instanceof Error && error.message.startsWith("{")) {
            try {
              const errorData = JSON.parse(error.message);
              res.status(400).json({
                error: "Validation failed",
                message: errorData.message,
                missingFields: errorData.missingFields,
              });
              return;
            } catch (parseError: unknown) {
              logger.error(parseError, "Error parsing validation error");
            }
          }

          res.status(400).json({
            error: "Invalid input",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    this.router.get(
      "/short-video/:videoId/status",
      async (req: ExpressRequest, res: ExpressResponse) => {
        const { videoId } = req.params;
        if (!videoId) {
          res.status(400).json({ error: "videoId is required" });
          return;
        }
        const status = this.shortCreator.status(videoId);
        res.status(200).json({ status });
      }
    );

    this.router.get("/music-tags", (req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json(this.shortCreator.ListAvailableMusicTags());
    });

    this.router.get("/voices", (req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json(this.shortCreator.ListAvailableVoices());
    });

    this.router.get("/short-videos", (req: ExpressRequest, res: ExpressResponse) => {
      const videos = this.shortCreator.listAllVideos();
      res.status(200).json({ videos });
    });

    this.router.delete("/short-video/:videoId", (req: ExpressRequest, res: ExpressResponse) => {
      const { videoId } = req.params;
      if (!videoId) {
        res.status(400).json({ error: "videoId is required" });
        return;
      }
      this.shortCreator.deleteVideo(videoId);
      res.status(200).json({ success: true });
    });

    this.router.get("/tmp/:tmpFile", (req: ExpressRequest, res: ExpressResponse) => {
      const { tmpFile } = req.params;
      if (!tmpFile) {
        res.status(400).json({ error: "tmpFile is required" });
        return;
      }
      const tmpFilePath = path.join(this.config.tempDirPath, tmpFile);
      if (!fs.existsSync(tmpFilePath)) {
        res.status(404).json({ error: "tmpFile not found" });
        return;
      }
      const tmpFileBuffer = fs.readFileSync(tmpFilePath);

      if (tmpFile.endsWith(".mp3")) {
        res.setHeader("Content-Type", "audio/mpeg");
      } else if (tmpFile.endsWith(".wav")) {
        res.setHeader("Content-Type", "audio/wav");
      }

      res.send(tmpFileBuffer);
    });

    this.router.get("/short-video/:videoId", (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const { videoId } = req.params;
        if (!videoId) {
          res.status(400).json({ error: "videoId is required" });
          return;
        }
        const video = this.shortCreator.getVideo(videoId);
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Disposition", `inline; filename=${videoId}.mp4`);
        res.send(video);
      } catch (error: unknown) {
        logger.error(error, "Error getting video");
        res.status(404).json({ error: "Video not found" });
      }
    });
  }
}
