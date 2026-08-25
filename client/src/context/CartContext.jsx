import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "darb_cart_v1";

const initialState = {
  items: [],
};

const getMainImage = (product) => {
  const mainImage =
    product?.images?.find((image) => image.isMain) || product?.images?.[0];

  return mainImage?.url || "";
};

const createCartItemId = (product, variant = null) => {
  const productKey = product?._id || product?.slug;
  const variantKey = variant?._id || variant?.variantId || variant?.label || "default";

  return `${productKey}_${variantKey}`;
};

const normalizeCartItem = (product, quantity = 1, variant = null) => {
  const selectedVariant = variant || null;

  const price =
    selectedVariant && selectedVariant.price > 0
      ? Number(selectedVariant.price)
      : Number(product.price) || 0;

  const compareAtPrice =
    selectedVariant && selectedVariant.compareAtPrice > 0
      ? Number(selectedVariant.compareAtPrice)
      : Number(product.compareAtPrice) || 0;

  const stock =
    selectedVariant && selectedVariant.stock >= 0
      ? Number(selectedVariant.stock)
      : Number(product.stock) || 0;

  return {
    cartItemId: createCartItemId(product, selectedVariant),
    productId: product._id || "",
    slug: product.slug,
    name: product.name,
    image: getMainImage(product),
    categoryName: product.category?.name || product.categorySnapshot?.name || "",
    categorySlug: product.category?.slug || product.categorySnapshot?.slug || "",
    price,
    compareAtPrice,
    stock,
    sizeLabel:
      selectedVariant?.label ||
      product.sizeLabel ||
      (product.sizeMl ? `${product.sizeMl} ML` : ""),
    sizeMl: selectedVariant?.sizeMl || product.sizeMl || 0,
    variant: selectedVariant
      ? {
          variantId: selectedVariant._id || selectedVariant.variantId || "",
          label: selectedVariant.label || "",
          sizeMl: selectedVariant.sizeMl || 0,
          sku: selectedVariant.sku || "",
        }
      : null,
    quantity: Math.max(Number(quantity) || 1, 1),
  };
};

const clampQuantity = (quantity, stock) => {
  const cleanQuantity = Math.max(Number(quantity) || 1, 1);

  if (stock > 0) {
    return Math.min(cleanQuantity, stock);
  }

  return cleanQuantity;
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case "LOAD_CART": {
      return {
        ...state,
        items: Array.isArray(action.payload) ? action.payload : [],
      };
    }

    case "ADD_ITEM": {
      const newItem = action.payload;
      const existingItem = state.items.find(
        (item) => item.cartItemId === newItem.cartItemId
      );

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.cartItemId === newItem.cartItemId
              ? {
                  ...item,
                  quantity: clampQuantity(
                    item.quantity + newItem.quantity,
                    item.stock
                  ),
                }
              : item
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, newItem],
      };
    }

    case "UPDATE_QUANTITY": {
      const { cartItemId, quantity } = action.payload;

      return {
        ...state,
        items: state.items.map((item) =>
          item.cartItemId === cartItemId
            ? {
                ...item,
                quantity: clampQuantity(quantity, item.stock),
              }
            : item
        ),
      };
    }

    case "REMOVE_ITEM": {
      return {
        ...state,
        items: state.items.filter(
          (item) => item.cartItemId !== action.payload
        ),
      };
    }

    case "CLEAR_CART": {
      return {
        ...state,
        items: [],
      };
    }

    default:
      return state;
  }
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);

      if (storedCart) {
        dispatch({
          type: "LOAD_CART",
          payload: JSON.parse(storedCart),
        });
      }
    } catch (error) {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const addToCart = (product, quantity = 1, variant = null) => {
    const cartItem = normalizeCartItem(product, quantity, variant);

    dispatch({
      type: "ADD_ITEM",
      payload: cartItem,
    });

    return cartItem;
  };

  const updateQuantity = (cartItemId, quantity) => {
    dispatch({
      type: "UPDATE_QUANTITY",
      payload: {
        cartItemId,
        quantity,
      },
    });
  };

  const incrementItem = (cartItemId) => {
    const item = state.items.find((cartItem) => cartItem.cartItemId === cartItemId);

    if (!item) return;

    updateQuantity(cartItemId, item.quantity + 1);
  };

  const decrementItem = (cartItemId) => {
    const item = state.items.find((cartItem) => cartItem.cartItemId === cartItemId);

    if (!item) return;

    if (item.quantity <= 1) {
      dispatch({
        type: "REMOVE_ITEM",
        payload: cartItemId,
      });
      return;
    }

    updateQuantity(cartItemId, item.quantity - 1);
  };

  const removeItem = (cartItemId) => {
    dispatch({
      type: "REMOVE_ITEM",
      payload: cartItemId,
    });
  };

  const clearCart = () => {
    dispatch({
      type: "CLEAR_CART",
    });
  };

  const cartSummary = useMemo(() => {
    const itemCount = state.items.reduce(
      (total, item) => total + item.quantity,
      0
    );

    const subtotal = state.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    const compareAtSubtotal = state.items.reduce(
      (total, item) =>
        total +
        (item.compareAtPrice > item.price ? item.compareAtPrice : item.price) *
          item.quantity,
      0
    );

    const productSavings = Math.max(compareAtSubtotal - subtotal, 0);

    return {
      itemCount,
      subtotal,
      compareAtSubtotal,
      productSavings,
      isEmpty: state.items.length === 0,
    };
  }, [state.items]);

  const value = useMemo(
    () => ({
      items: state.items,
      addToCart,
      updateQuantity,
      incrementItem,
      decrementItem,
      removeItem,
      clearCart,
      ...cartSummary,
    }),
    [state.items, cartSummary]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}