import type { Config } from "@netlify/functions";
import { validEndpoint } from "./_lib/push-core.mts";
import { subsStore, keyFor, jsonRes, sameOrigin, readJson } from "./_lib/store.mts";

/* إلغاءُ الاشتراك: يُحذف سجلُّه كلُّه — الموقعُ والتفضيلاتُ والعنوان. */
export default async (req: Request) => {
  if (req.method !== "POST") return jsonRes({ error: "method" }, 405);
  if (!sameOrigin(req)) return jsonRes({ error: "origin" }, 403);
  const body = await readJson(req, 2048);
  if (!body || !validEndpoint(body.endpoint)) return jsonRes({ error: "endpoint" }, 400);
  await subsStore().delete(await keyFor(body.endpoint));
  return jsonRes({ ok: true });
};

/* حدٌّ للمعدّل لكلّ عنوان IP: يمنع إغراقَ المخزن باشتراكاتٍ وهميّة، وهو واسعٌ بما يكفي
   لشبكات الجوّال التي يشترك فيها كثيرون في عنوانٍ واحد. */
export const config: Config = {
  path: "/api/push/unsubscribe",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
