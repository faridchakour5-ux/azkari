import { dueEvents, markSent, type Push, type Rec } from "./push-core.mts";

export const DAY = 86_400_000;
export const GIVE_UP_AFTER_FAILS = 10;   // إرسالاتٌ متتاليةٌ فاشلة ⇒ العنوانُ ميّت
export const STALE_AFTER = 200 * DAY;    // لم يفتح التطبيقَ منذ نحو سبعة أشهر
const BATCH = 40;

/* ما تحتاجه الجدولةُ من المخزن — مطابقٌ لما يُقدّمه Netlify Blobs، فيُحاكى في الاختبار */
export interface Store {
  list(): Promise<{ blobs: { key: string }[] }>;
  get(key: string, opts: { type: "json" }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}
export type Sender = (sub: Rec["sub"], ev: Push) => Promise<void>;   // يرمي خطأً فيه statusCode إن فشل

export interface Stats { subs: number; sent: number; failed: number; dropped: number; skipped: number }

/* تُرسَل لكلّ مشتركٍ أحداثُه المستحقّة الآن. القواعدُ التي لا يجوز كسرُها:
   • ما أُرسل بنجاحٍ يُسجَّل فلا يتكرّر، وما فشل لا يُسجَّل فيُعاد في الدقيقة التالية.
   • 404/410 من خدمة الدفع = انتهى الاشتراكُ عند الجهاز ⇒ يُحذف السجلّ.
   • أيُّ فشلٍ آخر (خادمُ الدفع معطَّل، شبكة...) ⇒ لا يُحذف أحدٌ بسببه، إلّا بعد
     عشرة إرسالاتٍ فاشلةٍ متتالية.
   • خطأٌ في مشتركٍ واحد لا يُوقف بقيّةَ المشتركين. */
export async function runCron(store: Store, send: Sender, now: Date, opts: { budgetMs?: number; log?: (m: string) => void } = {}): Promise<Stats> {
  const t0 = now.getTime();
  const log = opts.log || (() => {});
  const budget = opts.budgetMs ?? 24_000;
  const started = Date.now();
  const { blobs } = await store.list();
  const st: Stats = { subs: blobs.length, sent: 0, failed: 0, dropped: 0, skipped: 0 };

  const handle = async (key: string) => {
    const rec = (await store.get(key, { type: "json" })) as Rec | null;
    if (!rec) return;
    if (t0 - rec.updated > STALE_AFTER) { await store.delete(key); st.dropped++; return; }
    let due: Push[];
    try { due = dueEvents(rec, now); } catch (e) { log(`حساب فاشل ${key.slice(0, 8)}: ${e}`); return; }
    if (!due.length) return;

    const ok: string[] = [];
    let gone = false, failedNow = false;
    for (const ev of due) {
      try { await send(rec.sub, ev); ok.push(ev.id); st.sent++; }
      catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) { gone = true; break; }
        failedNow = true; st.failed++;
        log(`إرسالٌ فاشل ${e?.statusCode}: ${String(e?.body || e?.message || e).slice(0, 160)}`);
      }
    }
    if (gone) { await store.delete(key); st.dropped++; return; }
    markSent(rec, ok, now);
    rec.fails = failedNow && !ok.length ? rec.fails + 1 : 0;
    if (rec.fails >= GIVE_UP_AFTER_FAILS) { await store.delete(key); st.dropped++; return; }
    await store.setJSON(key, rec);
  };

  for (let i = 0; i < blobs.length; i += BATCH) {
    if (Date.now() - started > budget) { st.skipped = blobs.length - i; log(`نَفد الوقتُ وبقي ${st.skipped} سجلًّا للدقيقة التالية`); break; }
    await Promise.all(blobs.slice(i, i + BATCH).map(b => handle(b.key).catch(e => log(String(e)))));
  }
  return st;
}
