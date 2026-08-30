# Homepage assets and catalog refresh

## Scope

Only update `client/src/pages/public/Home.jsx` and `server/src/seed/seedProducts.js`.
Do not run the seed, build, or repository-wide tests.

## Homepage

- Replace the current hero image with a `picture` element.
- Use `/images/home/home_hero_mobile.webp` below `md` and
  `/images/home/home_hero_desktop.webp` at `md` and above.
- Preserve the hero's existing content, layout, sizing, buttons, and overlays.
- The category area displays Men and Women only, using
  `/images/home/category-for-him.webp` and
  `/images/home/category-for-her.webp`.
- Cards remain clickable and responsive, with their existing subtle hover effect and
  existing horizontal mobile behavior. At desktop widths, the grid changes from four
  columns to exactly two equal-width columns. Remove category copy, watermark, radial treatment, and dark
  overlay so the supplied artwork is unobstructed.

## Product seed

- Seed exactly these 26 inactive, new-arrival products:
  - Men: Barq, Faris, Haibah, Hawas, Hazeem, Mazaq, Mog, Najm, Naseem,
    Qandeel, Sahm.
  - Women: Gharam, Ghazal, Ghewaa, Haneen, Hawa, Ishq, Layla, Mahd, Nagham,
    Rahaf, Roh, Sahar, Sehr, Shaghaf, Ward.
- Use the supplied lowercase `.webp` filenames in the existing `male` and `female`
  folders.
- Preserve the existing Product schema and Cloudinary upload/upsert path.
- Each seeded product has zero price, compare-at price, and stock; `50 ML` / `50`;
  empty descriptive and scent fields; empty scent-note arrays; `isActive: false`,
  `isPlaceholder: false`, `isFeatured: false`, `isBestSeller: false`, and
  `isNewArrival: true`.
- After upserting the catalog, deactivate without deleting only products whose SKU
  starts with `DARB-MEN-` or `DARB-WOMEN-` and whose slug is not one of the 26 new
  catalog slugs. Set their active, featured, best-seller, and new-arrival flags to
  false. No other products are affected.

## Error handling and verification

- Retain existing missing-image, missing-category, MongoDB, and Cloudinary error
  handling.
- Do not add broad verification. A syntax check of the two changed files is allowed
  after implementation.
