const directWordMap: Record<string, string> = {
  hello: "ہیلو",
  passport: "پاسپورٹ",
  ticket: "ٹکٹ",
  phone: "فون",
  app: "ایپ",
  email: "ای میل",
  file: "فائل",
  message: "میسج",
  login: "لاگ اِن",
  meeting: "میٹنگ",
  doctor: "ڈاکٹر",
  chai: "چائے",
  roti: "روٹی",
  chawal: "چاول",
  pani: "پانی",
  shukriya: "شکریہ",
  ammi: "امی",
  abbu: "ابو",
  bhai: "بھائی",
  behen: "بہن",
  ghar: "گھر",
  darwaza: "دروازہ",
  khirki: "کھڑکی",
  kitaab: "کتاب",
  qalam: "قلم",
  waqt: "وقت",
  mausam: "موسم",
  barish: "بارش",
  sardi: "سردی",
  garmi: "گرمی",
  khush: "خوش",
  udaas: "اداس",
  dard: "درد",
  dawa: "دوا",
  bazaar: "بازار",
  masjid: "مسجد",
  taxi: "ٹیکسی",
  station: "اسٹیشن",
  dost: "دوست",
  kahani: "کہانی",
  jumla: "جملہ",
  matlab: "مطلب",
  mashq: "مشق",
  urdu: "اردو",
  aura: "اورا",
};

const charMap: Array<[string, string]> = [
  ["kh", "خ"],
  ["gh", "غ"],
  ["ph", "ف"],
  ["bh", "بھ"],
  ["th", "تھ"],
  ["dh", "دھ"],
  ["chh", "چھ"],
  ["ch", "چ"],
  ["sh", "ش"],
  ["aa", "ا"],
  ["ee", "ی"],
  ["ii", "ی"],
  ["oo", "و"],
  ["ai", "ے"],
  ["ay", "ے"],
  ["au", "او"],
  ["a", "ا"],
  ["b", "ب"],
  ["c", "ک"],
  ["d", "د"],
  ["e", "ے"],
  ["f", "ف"],
  ["g", "گ"],
  ["h", "ہ"],
  ["i", "ی"],
  ["j", "ج"],
  ["k", "ک"],
  ["l", "ل"],
  ["m", "م"],
  ["n", "ن"],
  ["o", "و"],
  ["p", "پ"],
  ["q", "ق"],
  ["r", "ر"],
  ["s", "س"],
  ["t", "ت"],
  ["u", "و"],
  ["v", "و"],
  ["w", "و"],
  ["x", "کس"],
  ["y", "ی"],
  ["z", "ز"],
];

function transliterateWord(word: string) {
  const lower = word.toLowerCase();
  if (directWordMap[lower]) {
    return directWordMap[lower];
  }

  let rest = lower;
  let result = "";

  while (rest.length > 0) {
    const matched = charMap.find(([pattern]) => rest.startsWith(pattern));
    if (!matched) {
      result += rest[0];
      rest = rest.slice(1);
      continue;
    }
    result += matched[1];
    rest = rest.slice(matched[0].length);
  }

  return result;
}

export function romanToUrdu(text: string) {
  return text
    .split(/(\s+|["?.!,:;()])/)
    .map((part) => {
      if (!part || /^\s+$/.test(part)) {
        return part;
      }
      if (/^["?.!,:;()]$/.test(part)) {
        return part;
      }
      return transliterateWord(part);
    })
    .join("");
}
