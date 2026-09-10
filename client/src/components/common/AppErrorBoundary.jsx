import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, details) {
    console.error("Darb application error", error, details);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-darb-cream p-6 text-center"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-darb-gold">Darb</p><h1 className="mt-3 font-display text-4xl text-darb-green">This path paused unexpectedly.</h1><p className="mt-4 text-sm text-darb-muted">Refresh the page to continue. Your cart remains stored on this device.</p><button type="button" onClick={() => window.location.reload()} className="mt-7 rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige">Refresh page</button></div></main>;
  }
}
