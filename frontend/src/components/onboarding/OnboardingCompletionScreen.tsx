import { useCompleteOnboarding } from "../../hooks/useCompleteOnboarding";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface Props {
  onBack?: () => void;
}

export function OnboardingCompletionScreen({ onBack }: Props) {
  const completeMutation = useCompleteOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (!completeMutation.isSuccess && !completeMutation.isPending && !completeMutation.isError) {
      completeMutation.mutate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    navigate("/user");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[520px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-success-light text-success-text flex items-center justify-center text-2xl font-bold mx-auto mb-4">
          {"\u2713"}
        </div>
        <h2 className="mb-2 text-2xl font-bold text-neutral-900">Kurulum Tamamlandi</h2>
        <p className="mb-6 text-lg text-neutral-700 leading-relaxed">
          Sisteminiz kullanima hazir. Artik icerik uretmeye ve yayinlamaya baslayabilirsiniz.
        </p>

        <ul className="text-left mb-7 p-0 list-none flex flex-col gap-2">
          <li className="flex items-center gap-2 text-md text-neutral-800">
            <span className="text-success font-bold text-md shrink-0">{"\u2713"}</span>
            Haber kaynaklari yapilandirildi
          </li>
          <li className="flex items-center gap-2 text-md text-neutral-800">
            <span className="text-success font-bold text-md shrink-0">{"\u2713"}</span>
            Sablonlar olusturuldu
          </li>
          <li className="flex items-center gap-2 text-md text-neutral-800">
            <span className="text-success font-bold text-md shrink-0">{"\u2713"}</span>
            Sistem ayarlari tanimlandi
          </li>
          <li className="flex items-center gap-2 text-md text-neutral-800">
            <span className="text-success font-bold text-md shrink-0">{"\u2713"}</span>
            Provider / API ayarlari yapilandirildi
          </li>
          <li className="flex items-center gap-2 text-md text-neutral-800">
            <span className="text-success font-bold text-md shrink-0">{"\u2713"}</span>
            Calisma alani tanimlandi
          </li>
        </ul>

        <button
          className="block w-full py-3 text-lg font-semibold text-neutral-0 bg-success border-none rounded-lg cursor-pointer"
          onClick={handleContinue}
        >
          Uygulamaya Basla
        </button>

        {onBack && (
          <button
            className="block w-full py-2 text-base font-medium text-neutral-600 bg-transparent border border-border-subtle rounded-md cursor-pointer mt-2"
            onClick={onBack}
          >
            Gereksinimleri Gozden Gecir
          </button>
        )}
      </div>
    </div>
  );
}
