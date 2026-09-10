import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { getPublicSettings } from "../../api/settingsApi";
import InfoPageShell from "../../components/common/InfoPageShell";

function socialUrl(value, network) {
  if (!value) return "";
  const clean = String(value).trim();
  if (/^https?:\/\//i.test(clean)) return clean;
  const handle = clean.replace(/^@/, "");
  if (network === "instagram") return `https://instagram.com/${handle}`;
  if (network === "tiktok") return `https://tiktok.com/@${handle}`;
  return clean;
}

function ContactLink({ label, href, external = false }) {
  if (!href) return null;
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="group flex items-center justify-between border-b border-darb-gold/25 py-5 text-darb-green transition hover:border-darb-green hover:text-darb-gold"><span className="font-display text-3xl sm:text-4xl">{label}</span><ArrowUpRight className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" /></a>;
}

function Contact() {
  const settingsQuery = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 5 * 60_000 });
  const settings = settingsQuery.data?.data || settingsQuery.data || {};
  const configured = settings.contact || {};
  const contact = {
    whatsapp: configured.whatsapp || "+20 10 99589674",
    email: configured.email || "darbcomp@gmail.com",
    instagram: configured.instagram || "https://www.instagram.com/darb1.0",
    tiktok: configured.tiktok || "https://www.tiktok.com/@darb1.0",
  };
  const whatsappDigits = String(contact.whatsapp || "").replace(/\D/g, "");

  return <InfoPageShell eyebrow="Customer care" title="We're here along the way." intro="Questions about a scent, your order, or anything Darb? Choose the channel that suits you.">
    <div className="grid gap-10 border-y border-darb-gold/20 py-4 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20 lg:py-10">
      <div className="pt-4"><p className="font-display text-2xl leading-9 text-darb-green">A little guidance can make finding the right scent—or the right order update—much simpler.</p><p className="mt-5 max-w-md text-sm leading-7 text-darb-muted">For an existing order, have your Darb order number ready so the team can help you quickly.</p></div>
      <nav aria-label="Contact Darb">
        {settingsQuery.isLoading ? <div className="space-y-4 py-4" aria-label="Loading contact channels">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse bg-darb-surface" />)}</div> : <>
          <ContactLink label="WhatsApp" href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : ""} external />
          <ContactLink label="Email" href={contact.email ? `mailto:${contact.email}` : ""} />
          <ContactLink label="Instagram" href={socialUrl(contact.instagram, "instagram")} external />
          <ContactLink label="TikTok" href={socialUrl(contact.tiktok, "tiktok")} external />
        </>}
      </nav>
    </div>
  </InfoPageShell>;
}

export default Contact;
