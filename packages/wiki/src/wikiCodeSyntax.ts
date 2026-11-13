export const escapeCodeValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll(",", "\\,");

export const encodeCodeUri = (value: string): string => encodeURIComponent(value);

export const decodeCodeUri = (value: string): string =>
  new URLSearchParams(`value=${value.replaceAll("+", "%2B")}`).get("value") ?? value;

export const unescapeCodeValue = (value: string): string => {
  let unescaped = "";
  let isEscaped = false;

  for (const character of value) {
    if (isEscaped) {
      unescaped += character;
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    unescaped += character;
  }

  if (isEscaped) {
    unescaped += "\\";
  }

  return unescaped;
};

export const splitEscaped = (value: string, delimiter: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let isEscaped = false;

  for (const character of value) {
    if (isEscaped) {
      current += character;
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    if (character === delimiter) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (isEscaped) {
    current += "\\";
  }

  parts.push(current);

  return parts;
};

export const serializeCodeMacro = (name: string, values: string[]): string =>
  `[[${name}${values.length > 0 ? `|${values.join("|")}` : ""}]]`;

export const serializeCodeField = (key: string, value: string | null | undefined): string | null =>
  value == null ? null : `${key}:${escapeCodeValue(value)}`;

// Keep each history block on one code line while preserving text line breaks.
export const serializeHistoryCodeText = (value: string): string =>
  escapeCodeValue(value.replace(/[%\r\n]/g, encodeURIComponent));

export const parseHistoryCodeText = (value: string): string =>
  value.replace(/%(?:25|0D|0A)/g, decodeURIComponent);

const parseCodeField = (part: string, preserveWhitespace: boolean): [string, string] | null => {
  const dividerIndex = part.indexOf(":");

  if (dividerIndex <= 0) {
    return null;
  }

  const value = part.slice(dividerIndex + 1);
  return [part.slice(0, dividerIndex).trim(), preserveWhitespace ? value : value.trim()];
};

export const parseCodeMacro = (
  line: string,
): { name: string; fields: Record<string, string> } | null => {
  if (!line.startsWith("[[")) {
    return null;
  }

  if (!line.endsWith("]]")) {
    return { name: "__invalid__", fields: {} };
  }

  const [rawName, ...parts] = splitEscaped(line.slice(2, -2), "|");
  const name = rawName.trim();
  const fields = parts.reduce<Record<string, string>>((result, part) => {
    const field = parseCodeField(part, name === "history");

    if (!field) {
      return result;
    }

    result[field[0]] = field[1];
    return result;
  }, {});

  return { name, fields };
};
