export const normalizeReturnTo = (value: string | null | undefined): string => {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.startsWith("/login") ||
    value.startsWith("/signup")
  ) {
    return "/admin";
  }

  return value;
};
