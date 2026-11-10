export const isSelectableRegion = (
  country: string | undefined,
  region: string | null | undefined,
) => !(country === "CN" && region === "CN-71");
