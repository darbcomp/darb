import { useContext } from "react";
import CartStoreContext from "./CartStoreContext";

export function useCart() {
  const context = useContext(CartStoreContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}