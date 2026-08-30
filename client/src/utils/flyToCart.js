const prefersReducedMotion = () =>
  window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  )?.matches;

const getVisibleCartTarget = () =>
  Array.from(
    document.querySelectorAll(
      "[data-cart-target]"
    )
  ).find((candidate) => {
    const rect =
      candidate.getBoundingClientRect?.();

    return (
      rect &&
      rect.width > 0 &&
      rect.height > 0
    );
  });

export const flyProductImageToCart = ({
  imageUrl,
  origin,
}) => {
  if (
    !imageUrl ||
    !origin?.isConnected ||
    prefersReducedMotion()
  ) {
    return;
  }

  const target =
    getVisibleCartTarget();

  if (!target) {
    return;
  }

  const from =
    origin.getBoundingClientRect();
  const to =
    target.getBoundingClientRect();

  if (!from.width || !to.width) {
    return;
  }

  const size = Math.min(
    72,
    Math.max(44, from.height)
  );

  const image =
    document.createElement("img");

  image.src = imageUrl;
  image.alt = "";
  image.setAttribute(
    "aria-hidden",
    "true"
  );

  Object.assign(image.style, {
    position: "fixed",
    zIndex: "9999",
    pointerEvents: "none",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "cover",
    borderRadius: "18px",
    boxShadow:
      "0 12px 35px rgba(15, 61, 46, 0.28)",
  });

  document.body.appendChild(image);

  const dx =
    to.left +
    to.width / 2 -
    (from.left + from.width / 2);

  const dy =
    to.top +
    to.height / 2 -
    (from.top + from.height / 2);

  if (typeof image.animate !== "function") {
    image.remove();
    return;
  }

  const animation = image.animate(
    [
      {
        transform:
          "translate3d(0, 0, 0) scale(1)",
        opacity: 1,
      },
      {
        transform: `translate3d(${dx * 0.38}px, ${dy * 0.3 - 54}px, 0) scale(0.8)`,
        opacity: 0.96,
        offset: 0.38,
      },
      {
        transform: `translate3d(${dx * 0.72 + 18}px, ${dy * 0.7 - 22}px, 0) scale(0.5)`,
        opacity: 0.8,
        offset: 0.72,
      },
      {
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.12)`,
        opacity: 0,
      },
    ],
    {
      duration: 720,
      easing:
        "cubic-bezier(0.22, 0.78, 0.28, 1)",
      fill: "forwards",
    }
  );

  target.animate?.(
    [
      { transform: "scale(1)" },
      {
        transform: "scale(1.1)",
        offset: 0.62,
      },
      { transform: "scale(1)" },
    ],
    {
      duration: 320,
      delay: 470,
      easing: "ease-out",
    }
  );

  animation.finished
    .catch(() => {})
    .finally(() => {
      image.remove();
    });
};
