export const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  tr: {
    breaking: "SON DAKİKA",
    tech: "TEKNOLOJİ",
    corporate: "KURUMSAL",
    sport: "SPOR",
    finance: "FİNANS",
    weather: "HAVA DURUMU",
    science: "BİLİM/TEKNİK",
    entertainment: "EĞLENCE/MAGAZİN",
    dark: "GÜNDEM",
    gundem: "GÜNDEM",
    ekonomi: "EKONOMİ",
    spor: "SPOR",
    magazin: "MAGAZİN",
  },
  en: {
    breaking: "BREAKING NEWS",
    tech: "TECHNOLOGY",
    corporate: "CORPORATE",
    sport: "SPORTS",
    finance: "FINANCE",
    weather: "WEATHER",
    science: "SCIENCE",
    entertainment: "ENTERTAINMENT",
    dark: "HEADLINES",
  },
};

export const COMMON_LABELS: Record<string, Record<string, string>> = {
  tr: {
    live: "CANLI",
    news: "HABERLER",
    sports: "SPOR",
  },
  en: {
    live: "LIVE",
    news: "NEWS",
    sports: "SPORTS",
  },
};

export function getLabel(style: string, lang: string = "tr"): string {
  const l = lang === "en" ? "en" : "tr";
  return CATEGORY_LABELS[l][style] || style.toUpperCase();
}

export function getCommonLabel(key: string, lang: string = "tr"): string {
  const l = lang === "en" ? "en" : "tr";
  return COMMON_LABELS[l][key] || key.toUpperCase();
}
