import { describe, it, expect } from "vitest";
import {
  AppError,
  DatabaseError,
  EntityLimitError,
  mapDatabaseError,
} from "@/lib/api/error-handler";

describe("EntityLimitError", () => {
  it("is a 403 AppError with code ENTITY_LIMIT_REACHED and a friendly publicMessage", () => {
    const e = new EntityLimitError();
    expect(e).toBeInstanceOf(AppError);
    expect(e.statusCode).toBe(403);
    expect(e.code).toBe("ENTITY_LIMIT_REACHED");
    // 4xx → publicMessage returns the message verbatim, safe to surface.
    expect(e.publicMessage).toContain("Free limit");
    expect(e.publicMessage).toBe(e.message);
  });
});

describe("mapDatabaseError", () => {
  it("maps the entity-cap trigger raise to EntityLimitError", () => {
    // The BEFORE INSERT trigger does RAISE EXCEPTION 'ENTITY_LIMIT_REACHED';
    // PostgREST surfaces the raised text in error.message.
    const mapped = mapDatabaseError({
      message: 'ENTITY_LIMIT_REACHED',
      code: "P0001",
    });
    expect(mapped).toBeInstanceOf(EntityLimitError);
    expect(mapped.statusCode).toBe(403);
    expect(mapped.code).toBe("ENTITY_LIMIT_REACHED");
  });

  it("maps the raise even when wrapped in surrounding text", () => {
    const mapped = mapDatabaseError({
      message: 'new row violates ... ENTITY_LIMIT_REACHED ... context',
    });
    expect(mapped).toBeInstanceOf(EntityLimitError);
  });

  it("maps any other db error to a generic DatabaseError (500)", () => {
    const mapped = mapDatabaseError({ message: "connection reset", code: "08006" });
    expect(mapped).toBeInstanceOf(DatabaseError);
    expect(mapped.statusCode).toBe(500);
    // 5xx → publicMessage is genericized, never leaks the raw db text.
    expect(mapped.publicMessage).toBe("An unexpected error occurred");
  });

  it("handles a null/undefined error without throwing", () => {
    expect(mapDatabaseError(null)).toBeInstanceOf(DatabaseError);
    expect(mapDatabaseError(undefined)).toBeInstanceOf(DatabaseError);
  });
});
