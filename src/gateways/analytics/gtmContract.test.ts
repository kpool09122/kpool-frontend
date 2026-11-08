import { describe, expect, it } from "vitest";
import candidate from "../../../docs/gtm-production.json";

const { tag: tags, trigger: triggers } = candidate.containerVersion;
const parameter = (tag: typeof tags[number], key: string) => tag.parameter.find((item) => item.key === key);

describe("GTM import candidate contract (not a live Google tag test)", () => {
  it("maps both App and Wiki views into exactly one page_view tag in the same property", () => {
    const views = tags.filter((tag) => parameter(tag, "eventName")?.value === "page_view");
    expect(views).toHaveLength(1);
    expect(views[0].firingTriggerId).toEqual(["2", "4"]);
    expect(triggers.filter((trigger) => views[0].firingTriggerId?.includes(trigger.triggerId)).map((trigger) => trigger.customEventFilter[0].parameter[1].value)).toEqual(["wiki_page_view", "app_page_view"]);
    for (const tag of tags.filter((tag) => tag.type === "gaawe")) {
      expect(parameter(tag, "measurementIdOverride")?.value).toBe("{{Constant - GA4 Measurement ID}}");
    }
  });

  it("updates the Google tag's persistent context before app_screen, without automatic page views or a second engagement clock", () => {
    const config = tags.find((tag) => tag.type === "googtag")!;
    const settings = parameter(config, "configSettingsTable")?.list;
    expect(settings).toEqual(expect.arrayContaining([
      { type: "MAP", map: [{ type: "TEMPLATE", key: "parameter", value: "send_page_view" }, { type: "BOOLEAN", key: "parameterValue", value: "false" }] },
      { type: "MAP", map: [{ type: "TEMPLATE", key: "parameter", value: "update" }, { type: "BOOLEAN", key: "parameterValue", value: "true" }] },
    ]));
    for (const key of ["page_location", "page_referrer", "page_title", "wiki_id", "wiki_translation_set_id", "wiki_language", "wiki_type"]) {
      expect(settings).toContainEqual({ type: "MAP", map: [{ type: "TEMPLATE", key: "parameter", value: key }, { type: "TEMPLATE", key: "parameterValue", value: `{{DLV - ${key}}}` }] });
    }
    expect(config.firingTriggerId).toBeUndefined();
    expect(tags.find((tag) => parameter(tag, "eventName")?.value === "app_screen")?.setupTag).toEqual([{ tagName: config.name, stopOnSetupFailure: true }]);
    expect(tags.find((tag) => parameter(tag, "eventName")?.value === "app_page_end")?.firingTriggerId).toEqual(["5"]);
    expect(JSON.stringify(candidate)).not.toContain("engagement_time_msec");
    expect(tags.every((tag) => !tag.firingTriggerId?.includes("2147479573"))).toBe(true);
  });
});
