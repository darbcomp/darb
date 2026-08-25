import { useQuery } from "@tanstack/react-query";

import {
  AtSign,
  Mail,
  MessageCircle,
  Phone,
  Share2,
} from "lucide-react";

import { getPublicSettings } from "../../api/settingsApi";
import InfoPageShell from "../../components/common/InfoPageShell";

function socialUrl(value, network) {
  if (!value) return "";

  const clean = String(value).trim();

  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://")
  ) {
    return clean;
  }

  const handle = clean.replace(/^@/, "");

  if (network === "instagram") {
    return `https://instagram.com/${handle}`;
  }

  if (network === "facebook") {
    return `https://facebook.com/${handle}`;
  }

  if (network === "tiktok") {
    return `https://tiktok.com/@${handle}`;
  }

  return clean;
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
  external = false,
}) {
  if (!value) return null;

  const content = (
    <div
      className="
        group
        rounded-[1.75rem]
        border border-darb-gold/20
        bg-white
        p-6
        shadow-soft
        transition duration-300
        hover:-translate-y-1
        hover:border-darb-gold/50
        sm:p-7
      "
    >
      <div
        className="
          flex h-11 w-11
          items-center justify-center
          rounded-full
          bg-darb-green
          text-darb-gold
        "
      >
        <Icon
          size={19}
          strokeWidth={1.7}
        />
      </div>

      <p
        className="
          mt-6
          text-[10px]
          font-semibold
          uppercase
          tracking-[0.24em]
          text-darb-gold
        "
      >
        {label}
      </p>

      <p
        className="
          mt-2
          break-words
          font-display
          text-2xl
          text-darb-green
        "
      >
        {value}
      </p>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <a
      href={href}
      target={
        external
          ? "_blank"
          : undefined
      }
      rel={
        external
          ? "noreferrer"
          : undefined
      }
    >
      {content}
    </a>
  );
}

function Contact() {
  const settingsQuery = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettings,
  });

  const settings =
    settingsQuery.data?.data ||
    settingsQuery.data ||
    {};

  const contact =
    settings.contact || {};

  const hasContact =
    contact.phone ||
    contact.whatsapp ||
    contact.email ||
    contact.instagram ||
    contact.facebook ||
    contact.tiktok;

  const whatsappDigits =
    String(
      contact.whatsapp || ""
    ).replace(/\D/g, "");

  return (
    <InfoPageShell
      eyebrow="Customer Care"
      title="We're here along the way."
      intro="Questions about a fragrance, an order, or your Darb experience? Reach the team through the contact method that works best for you."
    >
      {settingsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="
                h-44
                animate-pulse
                rounded-[1.75rem]
                bg-white
              "
            />
          ))}
        </div>
      ) : hasContact ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactCard
            icon={Phone}
            label="Phone"
            value={contact.phone}
            href={
              contact.phone
                ? `tel:${contact.phone}`
                : ""
            }
          />

          <ContactCard
            icon={MessageCircle}
            label="WhatsApp"
            value={contact.whatsapp}
            href={
              whatsappDigits
                ? `https://wa.me/${whatsappDigits}`
                : ""
            }
            external
          />

          <ContactCard
            icon={Mail}
            label="Email"
            value={contact.email}
            href={
              contact.email
                ? `mailto:${contact.email}`
                : ""
            }
          />

          <ContactCard
            icon={AtSign}
            label="Instagram"
            value={contact.instagram}
            href={socialUrl(
              contact.instagram,
              "instagram"
            )}
            external
          />

          <ContactCard
            icon={Share2}
            label="Facebook"
            value={contact.facebook}
            href={socialUrl(
              contact.facebook,
              "facebook"
            )}
            external
          />

          <ContactCard
            icon={Share2}
            label="TikTok"
            value={contact.tiktok}
            href={socialUrl(
              contact.tiktok,
              "tiktok"
            )}
            external
          />
        </div>
      ) : (
        <div
          className="
            rounded-[2rem]
            border border-darb-gold/20
            bg-white
            p-8
            text-center
            shadow-soft
            sm:p-12
          "
        >
          <p className="font-display text-3xl text-darb-green">
            Darb contact details are coming soon.
          </p>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-darb-muted">
            Our contact channels will appear here once they are available.
          </p>
        </div>
      )}

      <div
        className="
          mt-10
          rounded-[1.75rem]
          bg-darb-green
          px-6
          py-7
          text-darb-beige
          sm:px-8
        "
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
          Order Support
        </p>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-darb-beige/65">
          If your message is about an existing order, include your Darb order
          number so the team can help you faster.
        </p>
      </div>
    </InfoPageShell>
  );
}

export default Contact;