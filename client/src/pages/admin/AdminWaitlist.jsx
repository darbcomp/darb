import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Edit, Search, Trash2, X } from "lucide-react";
import {
  deleteAdminWaitlistRequest,
  getAdminWaitlist,
  updateAdminWaitlistRequest,
} from "../../api/adminApi";

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Waiting", value: "waiting" },
  { label: "Notified", value: "notified" },
  { label: "Contacted", value: "contacted" },
  { label: "Converted", value: "converted" },
  { label: "Cancelled", value: "cancelled" },
];

const editableStatuses = [
  "waiting",
  "notified",
  "contacted",
  "converted",
  "cancelled",
];

const statusStyles = {
  waiting: "bg-yellow-50 text-yellow-700",
  notified: "bg-blue-50 text-blue-700",
  contacted: "bg-purple-50 text-purple-700",
  converted: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const formatStatus = (value = "") => value.replaceAll("_", " ");

const formatDateTime = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
};

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-[1.25rem] border border-darb-gold/20 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-darb-gold">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-darb-green">{value}</p>
    </div>
  );
}

function AdminWaitlist() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  const [editingRequest, setEditingRequest] = useState(null);
  const [form, setForm] = useState({
    status: "waiting",
    note: "",
    adminNote: "",
  });
  const [formError, setFormError] = useState("");

  const queryParams = useMemo(() => {
    const params = {
      limit: 40,
    };

    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.status) params.status = filters.status;

    return params;
  }, [filters]);

  const waitlistQuery = useQuery({
    queryKey: ["admin-waitlist", queryParams],
    queryFn: () => getAdminWaitlist(queryParams),
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminWaitlistRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      closeEditor();
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to update waitlist request.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminWaitlistRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });

  const requests = waitlistQuery.data?.data || [];
  const pagination = waitlistQuery.data?.pagination;
  const summary = waitlistQuery.data?.summary || {
    waiting: 0,
    notified: 0,
    contacted: 0,
    converted: 0,
    cancelled: 0,
    total: 0,
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
    });
  };

  const openEditor = (request) => {
    setEditingRequest(request);
    setForm({
      status: request.status || "waiting",
      note: request.note || "",
      adminNote: request.adminNote || "",
    });
    setFormError("");
  };

  const closeEditor = () => {
    setEditingRequest(null);
    setForm({
      status: "waiting",
      note: "",
      adminNote: "",
    });
    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmitUpdate = (event) => {
    event.preventDefault();

    if (!editingRequest) return;

    if (!form.status) {
      setFormError("Status is required.");
      return;
    }

    setFormError("");

    updateMutation.mutate({
      requestId: editingRequest._id,
      payload: form,
    });
  };

  const handleCancelRequest = (request) => {
    const confirmed = window.confirm(
      `Cancel waitlist request for ${request.name}?`
    );

    if (!confirmed) return;

    deleteMutation.mutate(request._id);
  };

  return (
    <section className="admin-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Waitlist
          </h1>

          <p className="mt-3 max-w-2xl text-darb-muted">
            Track customers waiting for Darb scents and follow up when products
            return to stock.
          </p>
        </div>

        <div className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 text-sm font-semibold text-darb-green shadow-soft">
          {pagination?.total || requests.length} requests
        </div>
      </div>

      <div className="mb-8 grid gap-0 border-y border-darb-gold/25 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Waiting" value={summary.waiting} />
        <SummaryCard label="Notified" value={summary.notified} />
        <SummaryCard label="Contacted" value={summary.contacted} />
        <SummaryCard label="Converted" value={summary.converted} />
        <SummaryCard label="Cancelled" value={summary.cancelled} />
      </div>

      <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-[1fr_260px_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-darb-muted"
            />

            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search customer, phone, email, product..."
              className="w-full rounded-full border border-darb-gold/30 py-3 pl-11 pr-5 outline-none transition focus:border-darb-green"
            />
          </div>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            {statusOptions.map((status) => (
              <option key={status.label} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-darb-gold/40 px-5 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
          >
            Reset
          </button>
        </div>
      </div>

      {editingRequest && (
        <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
                Update Request
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                {editingRequest.name}
              </h2>

              <p className="mt-2 text-sm text-darb-muted">
                {editingRequest.productSnapshot?.name || "Darb Product"}
              </p>
            </div>

            <button
              type="button"
              onClick={closeEditor}
              className="rounded-full border border-darb-gold/40 p-3 text-darb-green transition hover:bg-darb-gold/15"
              aria-label="Close editor"
            >
              <X size={18} />
            </button>
          </div>

          {formError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmitUpdate} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 capitalize outline-none transition focus:border-darb-green"
                >
                  {editableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Customer Note
                </label>

                <input
                  name="note"
                  value={form.note}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Customer-facing or original note"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Admin Note
                </label>

                <textarea
                  name="adminNote"
                  value={form.adminNote}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Internal follow-up notes"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending ? "Saving..." : "Save Update"}
              </button>

              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full border border-darb-gold/40 px-7 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {waitlistQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading waitlist...</p>
        </div>
      )}

      {waitlistQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load waitlist
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {waitlistQuery.error?.friendlyMessage ||
              "Admin waitlist is unavailable right now."}
          </p>
        </div>
      )}

      {!waitlistQuery.isLoading &&
        !waitlistQuery.isError &&
        requests.length === 0 && (
          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
              <Bell size={24} />
            </div>

            <h2 className="mt-6 font-display text-3xl text-darb-green">
              No waitlist requests found
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
              Customer requests will appear here when they join the waitlist for
              unavailable products.
            </p>
          </div>
        )}

      {!waitlistQuery.isLoading &&
        !waitlistQuery.isError &&
        requests.length > 0 && (
          <div>
            <div className="mb-4 flex justify-end text-sm text-darb-muted">
              Showing {requests.length} of {pagination?.total || requests.length}
            </div>

            <div className="admin-record-list border-y border-darb-gold/25">
              {requests.map((request) => {
                const productImage =
                  request.productSnapshot?.image ||
                  request.product?.images?.find((image) => image.isMain)?.url ||
                  request.product?.images?.[0]?.url ||
                  "";

                return (
                  <article
                    key={request._id}
                    className="overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-white shadow-soft"
                  >
                    <div className="grid gap-5 p-5 sm:grid-cols-[130px_1fr]">
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-darb-green">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={
                              request.productSnapshot?.name || "Darb Product"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <Bell size={30} className="mx-auto text-darb-gold" />
                            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-darb-beige/70">
                              Waitlist
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                              statusStyles[request.status] ||
                              "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {formatStatus(request.status)}
                          </span>

                          {request.source && (
                            <span className="rounded-full bg-darb-green/10 px-3 py-1 text-xs font-semibold capitalize text-darb-green">
                              {formatStatus(request.source)}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 font-display text-3xl text-darb-green">
                          {request.name}
                        </h2>

                        <p className="mt-1 text-sm font-semibold text-darb-black">
                          {request.productSnapshot?.name || "Darb Product"}
                        </p>

                        <div className="mt-4 grid gap-2 text-sm text-darb-muted sm:grid-cols-2">
                          <p>
                            Phone:{" "}
                            <span className="font-semibold text-darb-black">
                              {request.phone || "—"}
                            </span>
                          </p>

                          <p>
                            Email:{" "}
                            <span className="font-semibold text-darb-black">
                              {request.email || "—"}
                            </span>
                          </p>

                          <p>
                            Category:{" "}
                            <span className="font-semibold text-darb-black">
                              {request.productSnapshot?.categoryName || "—"}
                            </span>
                          </p>

                          <p>
                            Created:{" "}
                            <span className="font-semibold text-darb-black">
                              {formatDateTime(request.createdAt)}
                            </span>
                          </p>

                          <p>
                            Notified:{" "}
                            <span className="font-semibold text-darb-black">
                              {formatDateTime(request.notifiedAt)}
                            </span>
                          </p>

                          <p>
                            Contacted:{" "}
                            <span className="font-semibold text-darb-black">
                              {formatDateTime(request.contactedAt)}
                            </span>
                          </p>
                        </div>

                        {(request.note || request.adminNote) && (
                          <div className="mt-4 rounded-2xl bg-darb-cream/70 p-4 text-sm leading-6 text-darb-muted">
                            {request.note && <p>Note: {request.note}</p>}
                            {request.adminNote && (
                              <p className="mt-2">
                                Admin note: {request.adminNote}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => openEditor(request)}
                            className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
                          >
                            <Edit size={16} />
                            Update
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelRequest(request)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={16} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
    </section>
  );
}

export default AdminWaitlist;
