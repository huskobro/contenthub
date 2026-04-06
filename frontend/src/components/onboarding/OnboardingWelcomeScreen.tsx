import { useNavigate } from "react-router-dom";
import { useCompleteOnboarding } from "../../hooks/useCompleteOnboarding";

const FEATURES_DATA = [
  {
    bgClass: "bg-brand-600",
    label: "1",
    title: "Modular Icerik Uretimi",
    desc: "Standart video, haber bulteni ve daha fazlasini adim adim rehberli akislarla olusturun.",
  },
  {
    bgClass: "bg-brand-700",
    label: "2",
    title: "Tam Operasyon Gorunurlugu",
    desc: "Her isi, adimi ve artefakti gercek zamanli zaman cizelgeleri ve ETA ile takip edin.",
  },
  {
    bgClass: "bg-success-dark",
    label: "3",
    title: "Yayin ve Analiz",
    desc: "Platformlara yayinlayin, analizleri inceleyin ve icerik hattinizi optimize edin.",
  },
];

interface WelcomeProps {
  onNext?: () => void;
}

export function OnboardingWelcomeScreen({ onNext }: WelcomeProps = {}) {
  const navigate = useNavigate();
  const completeMutation = useCompleteOnboarding();

  function handleStart() {
    if (onNext) {
      onNext();
    } else {
      completeMutation.mutate(undefined, {
        onSuccess: () => navigate("/user"),
      });
    }
  }

  function handleSkip() {
    navigate("/user");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] py-12 px-10 text-center">
        <h1 className="mb-2 text-3xl font-bold text-neutral-900 tracking-tight">ContentHub'a Hosgeldiniz</h1>
        <p className="mb-8 text-lg text-neutral-700 leading-relaxed">
          Icerik uretiminden yayinlamaya kadar tum sureci tek bir platformdan yonetin.
          Birka&#231; adimda sisteminizi kurun ve uretmeye baslayin.
        </p>

        <div className="flex flex-col gap-3 mb-8 text-left">
          {FEATURES_DATA.map((f) => (
            <div key={f.label} className="flex items-start gap-3 py-3.5 px-4 bg-neutral-50 rounded-lg border border-border-subtle">
              <div className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-md font-bold text-neutral-0 ${f.bgClass}`}>
                {f.label}
              </div>
              <div className="flex-1">
                <p className="m-0 text-md font-semibold text-neutral-900">{f.title}</p>
                <p className="mt-0.5 mb-0 text-base text-neutral-600 leading-normal">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="inline-block py-3 px-8 text-lg font-semibold text-neutral-0 bg-brand-600 border-none rounded-lg cursor-pointer transition-colors hover:bg-info-dark"
          onClick={handleStart}
          disabled={completeMutation.isPending}
        >
          {completeMutation.isPending ? "Hazirlaniyor..." : "Kurulumu Baslat"}
        </button>

        <br />

        <button
          className="inline-block py-2 px-5 text-base font-medium text-neutral-600 bg-transparent border border-border-subtle rounded-md cursor-pointer mt-3"
          onClick={handleSkip}
        >
          Sonra Tamamla
        </button>
      </div>
    </div>
  );
}
