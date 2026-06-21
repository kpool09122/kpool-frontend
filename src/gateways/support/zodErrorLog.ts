import { z } from "zod";

const serializeIssue = (issue: z.ZodIssue): unknown => {
  if (issue.code !== z.ZodIssueCode.invalid_union) {
    return issue;
  }

  return {
    ...issue,
    unionErrors: issue.unionErrors.map((unionError) => unionError.issues),
  };
};

export const logZodSchemaError = (context: string, error: z.ZodError): void => {
  console.error(
    "[schema-parse-error]",
    JSON.stringify(
      {
        context,
        issues: error.issues.map(serializeIssue),
      },
      null,
      2,
    ),
  );
};

export const parseWithSchemaLog = <T>(
  context: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  body: unknown,
): T => {
  const result = schema.safeParse(body);

  if (result.success) {
    return result.data;
  }

  logZodSchemaError(context, result.error);
  throw result.error;
};
