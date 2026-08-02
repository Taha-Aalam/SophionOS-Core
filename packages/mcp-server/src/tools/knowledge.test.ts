import { describe, expect, it } from "vitest";

import { registerKnowledgeTools } from "./knowledge.js";

/**
 * Regression tests for the "enrich creation" contract on create_note.
 *
 * Notes differ from the PARA create tools in one important way: the note's
 * *content* is its substance and MUST be captured (asked for if only a title
 * was given), while its *type* is auto-derived from that content (never asked).
 * The link/notebook/flag questions are then asked ONE QUESTION AT A TIME.
 *
 * These tests lock in: capture content if missing, auto-derive type (never ask
 * the user for it), ask the enrichment questions one at a time (no bundling),
 * never skip asking (do not invoke until content is captured and all seven
 * enrichment questions are answered), and keep favorite/pin as a single
 * multiple-select question (not two yes/no prompts).
 */

interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: Record<string, { description?: string }>;
}

/**
 * Register every knowledge tool against a capturing mock server and return the
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
      const inputSchema: RegisteredTool["inputSchema"] = {};
      for (const [key, schema] of Object.entries(def.inputSchema)) {
        inputSchema[key] = {
          description: (schema as { description?: string }).description,
        };
      }
      tools.push({ name, description: def.description, inputSchema });
    },
  };
  registerKnowledgeTools(server as never, {} as never);
  return tools;
}

const tools = registerAll();
const note = tools.find((t) => t.name === "create_note");
const resource = tools.find((t) => t.name === "save_resource");
const topic = tools.find((t) => t.name === "create_topic");
const contact = tools.find((t) => t.name === "create_contact");

describe("create_note enrich contract", () => {
  it("is registered by registerKnowledgeTools", () => {
    expect(note).toBeDefined();
  });

  it("instructs the agent to ask one question at a time (no bundling)", () => {
    expect(note!.description).toContain("ONE QUESTION AT A TIME");
    expect(note!.description).toContain(
      "never bundle them into a single prompt",
    );
  });

  it("mandates asking before invoking the tool (no silent skip)", () => {
    expect(note!.description).toContain("MUST");
    expect(note!.description).toContain(
      "Do not invoke create_note until you have captured the content and asked all seven enrichment questions",
    );
  });

  it("captures content when only a title is given", () => {
    expect(note!.description).toContain(
      "if the user gave only a title, ask",
    );
  });

  it("auto-derives the type instead of asking the user for it", () => {
    expect(note!.description).toContain("do not ask the user for it");
    expect(note!.inputSchema.type?.description).toContain("derive");
  });

  it("asks favorite/pin as a single multiple-select question", () => {
    expect(note!.description).toContain("SINGLE multiple-select question");
  });
});

describe("save_resource enrich contract", () => {
  it("is registered by registerKnowledgeTools", () => {
    expect(resource).toBeDefined();
  });

  it("instructs the agent to ask one question at a time (no bundling)", () => {
    expect(resource!.description).toContain("ONE QUESTION AT A TIME");
    expect(resource!.description).toContain(
      "never bundle them into a single prompt",
    );
  });

  it("mandates asking before invoking the tool (no silent skip)", () => {
    expect(resource!.description).toContain("MUST");
    expect(resource!.description).toContain(
      "Do not invoke save_resource until you have resolved the URL and asked all six enrichment questions",
    );
  });

  it("confirms a scanned URL with the user before attaching it", () => {
    expect(resource!.description).toContain("present the found link and ask");
  });

  it("auto-derives the type instead of asking the user for it", () => {
    expect(resource!.description).toContain("do not ask the user for it");
    expect(resource!.inputSchema.type?.description).toContain("derive");
  });
});

describe("create_topic enrich contract", () => {
  it("is registered by registerKnowledgeTools", () => {
    expect(topic).toBeDefined();
  });

  it("instructs the agent to ask one question at a time (no bundling)", () => {
    expect(topic!.description).toContain("ONE QUESTION AT A TIME");
    expect(topic!.description).toContain(
      "never bundle them into a single prompt",
    );
  });

  it("mandates asking before invoking the tool (no silent skip)", () => {
    expect(topic!.description).toContain("MUST");
    expect(topic!.description).toContain(
      "Do not invoke create_topic until you have confirmed the name and asked all four enrichment questions",
    );
  });

  it("proposes a more precise name for confirmation when vague", () => {
    expect(topic!.description).toContain(
      "propose a more precise name for confirmation",
    );
  });

  it("seeds notes/resources as multi-select choices", () => {
    expect(topic!.description).toContain("multi-select");
  });
});

describe("create_contact enrich contract", () => {
  it("is registered by registerKnowledgeTools", () => {
    expect(contact).toBeDefined();
  });

  it("instructs the agent to ask one question at a time (no bundling)", () => {
    expect(contact!.description).toContain("ONE QUESTION AT A TIME");
    expect(contact!.description).toContain(
      "never bundle them into a single prompt",
    );
  });

  it("mandates asking before invoking the tool (no silent skip)", () => {
    expect(contact!.description).toContain("MUST");
    expect(contact!.description).toContain(
      "Do not invoke create_contact until you have captured email and phone and asked all eight enrichment questions",
    );
  });

  it("asks email and phone together as a single multi-field question", () => {
    expect(contact!.description).toContain("SINGLE multi-field question");
  });

  it("auto-generates notes and role instead of asking the user for them", () => {
    expect(contact!.description).toContain("do not ask the user for them");
  });

  it("surfaces the follow-up cadence options", () => {
    expect(contact!.description).toContain("bi-weekly");
  });
});
