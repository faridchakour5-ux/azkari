import { getStore, getDeployStore } from "@netlify/blobs";

declare const Netlify: any;

/* في الإنتاج: مخزنٌ عامٌّ دائم. وفي معاينات النشر والفروع: مخزنٌ مرتبطٌ بذلك
   النشر وحدَه، فلا تختلط بياناتُ الاختبار بمشتركي الموقع الحقيقيّين.
   والاتّساقُ «قويّ»: الجدولةُ تكتب سجلَّ «ما أُرسل» كلَّ دقيقة وتقرؤه في
   التي تليها، ولو قرأت نسخةً قديمةً (وهذا ما يُتيحه الاتّساقُ الأضعف، إلى
   ستّين ثانية) لأرسلت الإشعارَ مرّتين. */
export function subsStore() {
  const ctx = Netlify?.context?.deploy?.context;
  return ctx === "production"
    ? getStore({ name: "push-subs", consistency: "strong" })
    : getDeployStore("push-subs");
}

export async function keyFor(endpoint: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function jsonRes(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/* المتصفّحُ يُرسل Origin مع كلّ POST. فإن وُجد ولم يطابق موقعَنا رُفض الطلب،
   حتى لا تستطيع صفحةٌ في موقعٍ آخر أن تُسجّل مشتركين أو تُلغيهم. */
export function sameOrigin(req: Request): boolean {
  const o = req.headers.get("origin");
  return !o || o === new URL(req.url).origin;
}

export async function readJson(req: Request, max = 4096): Promise<any | null> {
  const txt = await req.text();
  if (txt.length > max) return null;
  try { return JSON.parse(txt); } catch { return null; }
}
