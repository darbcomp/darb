function Footer() {
  return (
    <footer className="bg-darb-green text-darb-beige">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <h3 className="font-display text-3xl">Darb</h3>
          <p className="mt-3 max-w-sm text-sm leading-7 text-darb-beige/75">
            More than perfume — a journey, a memory, and a scent that walks
            with you.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-darb-gold">Categories</h4>
          <div className="mt-3 space-y-2 text-sm text-darb-beige/75">
            <p>Men</p>
            <p>Women</p>
            <p>Unisex</p>
            <p>Musk</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-darb-gold">Contact</h4>
          <p className="mt-3 text-sm text-darb-beige/75">
            Contact details will be added once the client sends the final data.
          </p>
        </div>
      </div>

      <div className="border-t border-darb-beige/10 px-4 py-4 text-center text-xs text-darb-beige/60">
        © {new Date().getFullYear()} Darb. Built by Web District.
      </div>
    </footer>
  );
}

export default Footer;