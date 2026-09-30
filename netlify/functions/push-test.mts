import type { Config } from "@netlify/functions";
import webpush from "web-push";
import { validEndpoint, type Rec } from "./_lib/push-core.mts";
import { subsStore, keyFor, jsonRes, sameOrigin, readJson } from "./_lib/store.mts";

declare const Netlify: any;

/* «تجربةُ الإشعار من الخادم»: يُرسل رسالةً فوريّةً إلى اشتراك صاحب الطلب، فيتحقّق
   المستخدمُ في ثانيةٍ أنّ السلسلةَ كلَّها تعمل (المتصفّح ← خادمنا ← خدمةُ الدفع ← جهازه)
   دون أن ينتظر وقتَ صلاة. لا يُرسل إلا إلى اشتراكٍ مسجَّلٍ عندنا، ومرّةً كلَّ 30 ثانية. */
const COOLDOWN = 30_000;

export default async (req: Request) => {
  if (req.method !== "POST") return jsonRes({ error: "method" }, 405);
  if (!sameOrigin(req)) return jsonRes({ error: "origin" }, 403);
  const body = await readJson(req, 2048);
  if (!body || !validEndpoint(body.endpoint)) return jsonRes({ error: "endpoint" }, 400);

  const pub = Netlify.env.get("VAPID_PUBLIC_KEY"), priv = Netlify.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return jsonRes({ error: "not-configured" }, 503);

  const store = subsStore();
  const key = await keyFor(body.endpoint);
  const rec = (await store.get(key, { type: "json" })) as (Rec & { lastTest?: number }) | null;
  if (!rec) return jsonRes({ error: "unknown" }, 404);
  const now = Date.now();
  if (rec.lastTest && now - rec.lastTest < COOLDOWN) return jsonRes({ error: "slow-down" }, 429);

  webpush.setVapidDetails("https://salatee.org", pub, priv);
  try {
    await webpush.sendNotification(rec.sub, JSON.stringify({
      title: "تجربةُ الإشعار من الخادم ✓",
      body: "وصلتك هذه الرسالةُ من خادمنا — فالتذكيراتُ ستصلك والتطبيقُ مغلق",
      tag: "push-test",
    }), { TTL: 60, urgency: "high", topic: "push-test" });
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.statusCode === 410) { await store.delete(key); return jsonRes({ error: "gone" }, 410); }
    console.error("push-test: إرسالٌ فاشل", e?.statusCode, String(e?.body || e?.message || e).slice(0, 160));
    return jsonRes({ error: "push", status: e?.statusCode || 0 }, 502);
  }
  rec.lastTest = now;
  await store.setJSON(key, rec);
  return jsonRes({ ok: true });
};

export const config: Config = { path: "/api/push/test" };
