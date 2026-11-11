type XWidgets = {
  createTweet: (
    postId: string,
    container: HTMLElement,
    options: { dnt: boolean },
  ) => Promise<HTMLElement | undefined>;
};

type XWindow = Window & { twttr?: { widgets?: XWidgets } };

let widgetsRequest: Promise<XWidgets | undefined> | undefined;

function loadXWidgets(): Promise<XWidgets | undefined> {
  const getWidgets = () => (window as XWindow).twttr?.widgets;
  const widgets = getWidgets();
  if (widgets) return Promise.resolve(widgets);

  widgetsRequest ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://platform.x.com/widgets.js";
    script.async = true;

    const fail = () => {
      script.remove();
      widgetsRequest = undefined;
      resolve(undefined);
    };

    script.addEventListener("load", () => {
      const loaded = getWidgets();
      if (loaded) resolve(loaded);
      else fail();
    }, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.append(script);
  });

  return widgetsRequest;
}

export async function renderXPost(postId: string, target: HTMLElement) {
  try {
    const widgets = await loadXWidgets();
    if (!widgets || !target.isConnected) return false;
    return Boolean(await widgets.createTweet(postId, target, { dnt: true }));
  } catch {
    return false;
  }
}
