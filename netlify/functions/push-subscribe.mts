import type { Config } from "@netlify/functions";
import { parseSubscribe, type Rec } from "./_lib/push-core.mts";
import { subsStore, keyFor, jsonRes, sameOrigin, readJson } from "./_lib/store.mts";

/* تسجيلُ اشتراكٍ أو تحديثُه (يُستدعى عند التفعيل، وعند تغيّر الموقع أو
   الإعدادات، وعند كلّ فتحٍ للتطبيق). لا يُقبل إلا ما يُثبت أنّه عنوانُ خدمة دفع. */
declare const Netlify: any;

export default async (req: Request) => {
  /* فحصُ الصحّة: هل مفتاحا VAPID مضبوطان؟ يُرجع نعم/لا فقط — لا قيمةَ ولا عددَ مشتركين. */
  if (req.method === "GET") {
    return jsonRes({ configured: !!(Netlify.env.get("VAPID_PUBLIC_KEY") && Netlify.env.get("VAPID_PRIVATE_KEY")) });
  }
  if (req.method !== "POST") return jsonRes({ error: "method" }, 405);
  if (!sameOrigin(req)) return jsonRes({ error: "origin" }, 403);
  const body = await readJson(req);
  const p = parseSubscribe(body);
  if (!p.ok) return jsonRes({ error: p.error }, 400);

  const store = subsStore();
  const key = await keyFor(p.rec.sub.endpoint);
  const old = (await store.get(key, { type: "json" })) as Rec | null;
  const now = Date.now();
  const rec: Rec = {
    ...p.rec,
    sent: old?.sent || {},          // لا نُعيد إرسال ما أُرسل اليوم بمجرّد تحديث الإعدادات
    created: old?.created || now,
    updated: now,
    fails: 0,
  };
  await store.setJSON(key, rec);
  return jsonRes({ ok: true });
};

export const config: Config = { path: "/api/push/subscribe" };
