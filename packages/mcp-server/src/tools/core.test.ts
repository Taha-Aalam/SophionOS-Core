import { describe, expect, it } from "vitest";

import { registerCoreTools } from "./core.js";

/**
 * Regression tests for the "enrich creation" contract on create_goal and
 * create_project.
 *
 * Background: the tool descriptions previously listed the questions to ask as a
 * single run-on sentence ("ask … ask … ask … and ask …"), which caused two
 * failures in real AI harnesses:
 *   1. Agents bundled every question into one prompt (poor UX).
 *   2. Some harnesses never asked at all, auto-selecting defaults to skip the
 *      conversation.
 *
 * These tests lock in the corrected contract: the description MUST instruct the
 * agent to ask ONE QUESTION AT A TIME, MUST NOT skip asking (must not invoke the
 * tool until every question is answered), MUST auto-write the description itself
 * (never ask the user for it), and the field the harness is most likely to
 * auto-select MUST carry a "never auto-select" instruction.
 */

interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: Record<string, { description?: string }>;
}

/**
 * Register every core tool against a capturing mock server and return the
 * recorded definitions. The client is only dereferenced inside tool handlers,
 * which we never invoke here, so a bare object is safe for description-only
 * assertions.
 */
function registerAll(): RegisteredTool[] {
  const tools: RegisteredTool[] = [];
  const server = {
    registerTool(
      name: string,
      def: { description: string; inputSchema: Record<string, unknown> },
      // handler is intentionally ignored — these tests never invoke tools.
      _handler?: unknown,
    ) {
      // inputSchema values are zod schemas; .description is set via .describe().
      const inputSchema: RegisteredTool["inputSchema"] = {};
      for (const [key, schema] of Object.entries(def.inputSchema)) {
        inputSchema[key] = {
          description: (schema as { description?: string }).description,
        };
      }
      tools.push({ name, description: def.description, inputSchema });
    },
  };
  registerCoreTools(server as never, {} as never);
  return tools;
}

const tools = registerAll();
const goal = tools.find((t) => t.name === "create_goal");
const project = tools.find((t) => t.name === "create_project");
const task = tools.find((t) => t.name === "create_task");

describe("create_goal enrich contract", () => {
  it("is registered by registerCoreTools", () => {
    expect(goal).toBeDefined();
  });

  it("instructs the agent to ask one question at a time (no bundling)", () => {
    expect(goal!.description).toContain("ONE QUESTION AT A TIME");
    expect(goal!.description).toContain(
      "never bundle them into a single prompt",
    );
  });

  it("mandates asking before invoking the tool (no silent skip)", () => {
    expect(goal!.description).toContain("MUST");
    expect(goal!.description).toContain(
      "Do not invoke create_goal until you have asked all four questions",
    );
  });

  it("auto-writes the description instead of asking the user for it", () => {
    expect(goal!.description).toContain("do not ask the user for it");
  });

  it("strengthens the term field to block auto-selecting 'short'", () => {
    expect(goal!.inputSchema.term?.description).toContain("never auto-select");
  });
});

describe("create_project enrich contract", () => {
  it("is registered by registerCoreTools", () => {
    expect(project).toBeDefined();
  });

  it("instructs the agent to ask one question at a time (no bundling)", () => {
    expect(project!.description).toContain("ONE QUESTION AT A TIME");
    expect(project!.description).toContain(
      "never bundle them into a single prompt",
    );
  });

  it("mandates asking before invoking the tool (no silent skip)", () => {
    expect(project!.description).toContain("MUST");
    expect(project!.description).toContain(
      "Do not invoke create_project until you have asked all five questions",
    );
  });

  it("auto-writes the description instead of asking the user for it", () => {
    expect(project!.description).toContain("do not ask the user for it");
  });

  it("strengthens the priority field to block auto-selecting 'medium'", () => {
    expect(project!.inputSchema.priority?.description).toContain(
      "never auto-select",
    );
  });
});

describe("create_task enrich contract", () => {
  it("is registered by registerCoreTools", () => {
    expect(task).toBeDefined();
  });

  it("instructs the agent to ask one question at a time (no bundling)", () => {
    expect(task!.description).toContain("ONE QUESTION AT A TIME");
    expect(task!.description).toContain(
      "never bundle them into a single prompt",
    );
  });

  it("mandates asking before invoking the tool (no silent skip)", () => {
    expect(task!.description).toContain("MUST");
    expect(task!.description).toContain(
      "Do not invoke create_task until you have asked all seven questions",
    );
  });

  it("auto-writes the description instead of asking the user for it", () => {
    expect(task!.description).toContain("do not ask the user for it");
  });

  it("strengthens the priority field to block auto-selecting 'medium'", () => {
    expect(task!.inputSchema.priority?.description).toContain(
      "never auto-select",
    );
  });

  it("asks focus/important/urgent as a single multiple-select question", () => {
    expect(task!.description).toContain("SINGLE multiple-select question");
  });
});
