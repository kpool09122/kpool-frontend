export const getCsrfForwardHeaders = (headers: Headers): Record<string, string> => {
  const token = headers.get("x-xsrf-token");

  return token ? { "X-XSRF-TOKEN": token } : {};
};
