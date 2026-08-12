import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { buildFallbackAnalysis, buildFallbackTests } from "./qualityforgeLogic";

const testTypeSchema = z.enum(["unit", "api", "ui", "integration", "e2e", "regression", "smoke", "performance"]);
const prioritySchema = z.enum(["critical", "high", "medium", "low"]);

function readContent(value: unknown) {
  if (typeof value === "string") return value;
  return "";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  overview: router({ get: publicProcedure.query(() => db.getOverview()) }),
  projects: router({
    list: publicProcedure.query(() => db.listProjects()),
    create: publicProcedure.input(z.object({ name: z.string().min(3).max(128), description: z.string().min(5).max(2000), owner: z.string().min(2).max(128), stack: z.array(z.string().min(1).max(32)).min(1).max(8) })).mutation(({ input }) => db.createProject(input)),
    update: publicProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(3).max(128), description: z.string().min(5).max(2000), owner: z.string().min(2).max(128), stack: z.array(z.string().min(1).max(32)).min(1).max(8) })).mutation(({ input }) => db.updateProject(input)),
    archive: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.archiveProject(input.id)),
  }),
  testCases: router({
    list: publicProcedure.input(z.object({ search: z.string().max(120).optional() }).optional()).query(({ input }) => db.listTestCases(input?.search)),
    create: publicProcedure.input(z.object({ name: z.string().min(3).max(255), description: z.string().min(5).max(2000), testType: testTypeSchema, priority: prioritySchema })).mutation(({ input }) => db.createTestCase(input)),
  }),
  defects: router({
    list: publicProcedure.query(() => db.listDefects()),
    update: publicProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "resolved", "reopened", "closed"]), assignee: z.string().max(128).optional() })).mutation(({ input }) => db.updateDefect(input.id, input.status, input.assignee)),
  }),
  pipelines: router({ list: publicProcedure.query(() => db.listPipelineRuns()) }),
  team: router({ demoList: publicProcedure.query(() => db.listTeam()), list: adminProcedure.query(() => db.listTeam()) }),
  audit: router({ demoList: publicProcedure.query(() => db.listAuditLogs()), list: adminProcedure.query(() => db.listAuditLogs()) }),
  ai: router({
    generateTests: publicProcedure.input(z.object({ feature: z.string().min(3).max(3000), endpoint: z.string().max(500).optional(), criteria: z.string().max(3000).optional() })).mutation(async ({ input }) => {
      const fallback = buildFallbackTests(input.feature, input.endpoint);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are QualityForge AI, a senior SDET. Return only valid JSON with a tests array. Each test must have title, type, priority, and scenario. Produce five concise, practical tests." },
            { role: "user", content: `Feature: ${input.feature}\nEndpoint: ${input.endpoint || "Not provided"}\nAcceptance criteria: ${input.criteria || "Not provided"}` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "qualityforge_tests", strict: true, schema: { type: "object", properties: { tests: { type: "array", items: { type: "object", properties: { title: { type: "string" }, type: { type: "string" }, priority: { type: "string" }, scenario: { type: "string" } }, required: ["title", "type", "priority", "scenario"], additionalProperties: false } } }, required: ["tests"], additionalProperties: false } } },
        });
        const parsed = JSON.parse(readContent(response.choices?.[0]?.message?.content));
        if (Array.isArray(parsed.tests) && parsed.tests.length) return { tests: parsed.tests, source: "ai" as const };
      } catch (error) {
        console.warn("[AI] Test generation fallback:", error);
      }
      return { tests: fallback, source: "guided" as const };
    }),
    analyzeDefect: publicProcedure.input(z.object({ title: z.string().min(3).max(255), errorMessage: z.string().max(4000).optional() })).mutation(async ({ input }) => {
      const fallback = buildFallbackAnalysis(input.title, input.errorMessage);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are QualityForge AI, an expert software incident investigator. Return only valid JSON with rootCause, evidence (array), affectedComponent, confidence (integer 0-100), investigation, suggestedFix, regressionTests (array). Be precise and avoid certainty beyond the supplied evidence." },
            { role: "user", content: `Defect: ${input.title}\nError: ${input.errorMessage || "No error message supplied"}\nContext: This is a demo quality intelligence platform. Analyze the most likely engineering cause.` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "qualityforge_analysis", strict: true, schema: { type: "object", properties: { rootCause: { type: "string" }, evidence: { type: "array", items: { type: "string" } }, affectedComponent: { type: "string" }, confidence: { type: "integer" }, investigation: { type: "string" }, suggestedFix: { type: "string" }, regressionTests: { type: "array", items: { type: "string" } } }, required: ["rootCause", "evidence", "affectedComponent", "confidence", "investigation", "suggestedFix", "regressionTests"], additionalProperties: false } } },
        });
        const parsed = JSON.parse(readContent(response.choices?.[0]?.message?.content));
        if (parsed.rootCause) return { ...parsed, source: "ai" as const };
      } catch (error) {
        console.warn("[AI] Defect analysis fallback:", error);
      }
      return { ...fallback, source: "guided" as const };
    }),
    ask: publicProcedure.input(z.object({ question: z.string().min(2).max(2000), context: z.string().max(5000).optional() })).mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({ messages: [
          { role: "system", content: "You are Forge Assistant in a software quality intelligence platform. Answer in concise engineering language with practical next actions. Do not invent unavailable metrics." },
          { role: "user", content: `Question: ${input.question}\nWorkspace context: ${input.context || "Demo workspace contains test, defect, release, and pipeline data."}` },
        ] });
        const answer = readContent(response.choices?.[0]?.message?.content);
        if (answer) return { answer, source: "ai" as const };
      } catch (error) {
        console.warn("[AI] Assistant fallback:", error);
      }
      return { answer: "The highest release risk is concentrated around unresolved critical defects and regression coverage. Start by investigating the open checkout contract mismatch, then rerun the release candidate regression suite after the fix is validated.", source: "guided" as const };
    }),
  }),
});

export type AppRouter = typeof appRouter;
