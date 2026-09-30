import type { Config } from "@netlify/functions";
import webpush from "web-push";
import { runCron, type Sender } from "./_lib/cron-run.mts";
import { subsStore } from "./_lib/store.mts";

declare const Netlify: any;

/* تدور كلَّ دقيقة: تقرأ المشتركين وتُرسل لمن حان له حدثٌ. والمنطقُ كلُّه في
   _lib/cron-run.mts حيث يُختبَر بمخزنٍ ومُرسِلٍ مُحاكَيين (tools/test-push.mjs). */
export default async () => {
  const pub = Netlify.env.get("VAPID_PUBLIC_KEY");
  const priv = Netlify.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) { console.error("push-cron: مفاتيح VAPID غير مضبوطة في متغيّرات البيئة"); return; }
  webpush.setVapidDetails("https://salatee.org", pub, priv);

  const send: Sender = async (sub, ev) => {
    await webpush.sendNotification(sub, JSON.stringify(ev.payload), { TTL: ev.ttl, urgency: "high", topic: ev.id });
  };
  const st = await runCron(subsStore() as any, send, new Date(), { log: m => console.error("push-cron:", m) });
  if (st.sent || st.dropped || st.failed) {
    console.log(`push-cron: subs=${st.subs} sent=${st.sent} failed=${st.failed} dropped=${st.dropped}`);
  }
};

export const config: Config = { schedule: "* * * * *" };
