import { useQuery } from "@tanstack/react-query";

import { getPublicOffers } from "../../api/offerApi";
import { useLanguage } from "../../context/LanguageContext";
import { formatCurrency } from "../../utils/formatCurrency";
import { getBestProductOffer, getOfferCustomerTitle } from "../../utils/productOffers";

const PUBLIC_OFFERS_QUERY_KEY = ["public-offers"];

export default function ProductOfferNote({ product, price, hasCompareAt = false }) {
  const { language, t } = useLanguage();
  const offersQuery = useQuery({
    queryKey: PUBLIC_OFFERS_QUERY_KEY,
    queryFn: getPublicOffers,
    staleTime: 60_000,
    retry: 1,
  });
  const match = getBestProductOffer(offersQuery.data?.data || [], product, price);

  if (!match) return null;

  const { offer, afterOfferPrice } = match;
  const value = Number(offer.discountValue) || 0;
  const minQuantity = Number(offer.minQuantity) || 0;
  const minOrderValue = Number(offer.minOrderValue) || 0;
  const title = getOfferCustomerTitle(offer, language);
  const headline = offer.discountType === "percentage"
    ? language === "ar"
      ? `${t(hasCompareAt ? "Extra discount" : "Offer discount")} ${value}%`
      : `${hasCompareAt ? "Extra " : ""}${value}% ${t("OFF")}`
    : offer.discountType === "fixed"
      ? `${formatCurrency(value)} ${t("OFF at checkout")}`
      : t("Free delivery");

  let condition = "";
  if (minQuantity > 1 && minOrderValue > 0) {
    condition = `${t("When you buy")} ${minQuantity}+ ${t("and spend over")} ${formatCurrency(minOrderValue)}`;
  } else if (minQuantity > 1) {
    condition = `${t("When you buy")} ${minQuantity}+`;
  } else if (minOrderValue > Number(price)) {
    condition = `${t("On orders over")} ${formatCurrency(minOrderValue)}`;
  }

  return (
    <div className="mt-2 rounded-lg border border-darb-gold/30 bg-darb-beige/45 px-2.5 py-2 text-[10px] leading-4 text-darb-green sm:text-xs">
      <p className="truncate font-semibold text-darb-gold">{title}</p>
      <p className="font-bold">{headline}</p>
      {condition && <p className="text-darb-muted">{condition}</p>}
      {afterOfferPrice !== null && (
        <p className="font-semibold">{formatCurrency(afterOfferPrice)} {t("after offer")}</p>
      )}
    </div>
  );
}
