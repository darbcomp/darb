import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function PasswordInput({ className = "", ...props }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const toggleLabel = t(visible ? "Hide password" : "Show password");

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`darb-password-input ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        onMouseDown={(event) => event.preventDefault()}
        className="absolute end-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-darb-muted transition hover:bg-darb-cream hover:text-darb-green focus-visible:text-darb-green"
        aria-label={toggleLabel}
        aria-pressed={visible}
        title={toggleLabel}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
