import { useCallback, useEffect } from "react";

/**
 * Lightweight UI dictionary. English is the source of truth; every key has a
 * full Urdu translation so switching the language localises the whole app.
 */
export const DICT = {
  en: {} as Record<string, string>,
  ur: {
    // navigation
    Home: "ہوم",
    Dashboard: "ڈیش بورڈ",
    Plans: "پلانز",
    Deposit: "ڈپازٹ",
    Withdraw: "نکلوائیں",
    Team: "ٹیم",
    Referrals: "ریفرلز",
    More: "مزید",
    Admin: "ایڈمن",
    Profile: "پروفائل",
    "Sign out": "لاگ آؤٹ",
    Notifications: "اطلاعات",
    "Mark all read": "سب پڑھا ہوا نشان زد کریں",
    "No notifications yet.": "ابھی کوئی اطلاع نہیں۔",

    // dashboard
    "Total balance": "کل بیلنس",
    "Withdrawable balance": "قابلِ نکاسی بیلنس",
    "Deposit balance": "ڈپازٹ بیلنس",
    "Referral income": "ریفرل آمدنی",
    "Live earnings": "لائیو کمائی",
    "Next payout in": "اگلی ادائیگی",
    "Auto-credited to your withdrawable balance every 24 hours.":
      "ہر 24 گھنٹے بعد خودکار طور پر آپ کے قابلِ نکاسی بیلنس میں شامل۔",
    "Activate a plan to start earning": "کمائی شروع کرنے کے لیے پلان ایکٹو کریں",
    "Your income ticker starts the moment your first plan goes live.":
      "آپ کا پہلا پلان ایکٹو ہوتے ہی کمائی شروع ہو جاتی ہے۔",
    Invest: "سرمایہ کاری",
    Refer: "ریفر کریں",
    "Promo code": "پرومو کوڈ",
    "Daily income": "روزانہ آمدنی",
    "Active plans": "فعال پلانز",
    "Good to see you": "خوش آمدید",
    "Free reward": "مفت انعام",
    "Complete one simple task and get it free": "ایک آسان ٹاسک مکمل کریں اور مفت انعام حاصل کریں",
    "Get free": "حاصل کریں",

    // common
    Amount: "رقم",
    Date: "تاریخ",
    Type: "قسم",
    Method: "طریقہ",
    Status: "اسٹیٹس",
    Details: "تفصیلات",
    Processing: "زیرِ عمل",
    Successful: "کامیاب",
    Declined: "مسترد",
    Save: "محفوظ کریں",
    Cancel: "منسوخ",
    Confirm: "تصدیق کریں",
    Search: "تلاش",
    All: "سب",
    Language: "زبان",
    "Dark mode": "ڈارک موڈ",
    "Light mode": "لائٹ موڈ",
    Preferences: "ترجیحات",
    Security: "سیکیورٹی",
    "Personal details": "ذاتی معلومات",
    "Profit calculator": "منافع کیلکولیٹر",
    "Live support chat": "لائیو سپورٹ چیٹ",
    "Help centre": "ہیلپ سینٹر",
    Wallet: "والیٹ",
    Account: "اکاؤنٹ",
    Transactions: "ٹرانزیکشنز",
    "All transactions": "تمام ٹرانزیکشنز",
    "Deposit history": "ڈپازٹ ہسٹری",
    "Withdraw history": "نکاسی ہسٹری",
    "Investment plans": "سرمایہ کاری پلانز",
    "Referral center": "ریفرل سینٹر",
    "Profile & settings": "پروفائل و سیٹنگز",
    "No transactions yet.": "ابھی کوئی ٹرانزیکشن نہیں۔",
  } as Record<string, string>,
};

export function useT(lang: string) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    return () => {
      document.documentElement.dir = "ltr";
    };
  }, [lang]);

  const t = useCallback((key: string) => (lang === "ur" ? (DICT.ur[key] ?? key) : key), [lang]);
  return { t, lang, rtl: lang === "ur" };
}
