import { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../axiosConfig";

const unwrap = (response) => response.data?.data ?? response.data;

const statusClass = (status) => {
  if (status === "active") return "badge badge-active";
  if (status === "cancelled") return "badge badge-cancelled";
  return "badge badge-muted";
};

const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString();
};

const getDaysUntilRenewal = (sub) => {
  if (!sub.startDate) return null;

  const startDate = new Date(sub.renewedAt || sub.startDate);
  const nextRenewalDate = new Date(startDate);

  const duration = sub.plan?.duration;
  if (duration === "weekly") {
    nextRenewalDate.setDate(startDate.getDate() + 7);
  } else if (duration === "yearly") {
    nextRenewalDate.setFullYear(startDate.getFullYear() + 1);
  } else {
    nextRenewalDate.setDate(startDate.getDate() + 30);
  }

  const today = new Date();
  const diffTime = nextRenewalDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [renewalAlerts, setRenewalAlerts] = useState([]);
  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");

  const fetchDashboard = async () => {
    const response = await axiosInstance.get("/api/dashboard");
    const data = unwrap(response);
    const subsArr = Array.isArray(data.subscriptions) ? data.subscriptions : [];
    setPlans(Array.isArray(data.availablePlans) ? data.availablePlans : []);
    setSubscriptions(subsArr);
    if (data.profile?.monthlyBudget !== undefined) {
      setBudget(Number(data.profile.monthlyBudget));
    }
    return subsArr;
  };

  const fetchSubscriptions = async () => {
    const response = await axiosInstance.get("/api/subscriptions");
    const data = unwrap(response);
    const arr = Array.isArray(data) ? data : [];
    setSubscriptions(arr);
    return arr;
  };

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      const arr = await fetchDashboard();

      const alerts = arr.filter((sub) => {
        const days = getDaysUntilRenewal(sub);
        return sub.status === "active" && days !== null && days <= 7 && days >= 0;
      });
      setRenewalAlerts(alerts);
    } catch (error) {
      alert(
        error.response?.data?.message || "Failed to load subscription data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((item) => item.status === "active").length,
    [subscriptions],
  );

  const cancelledSubscriptions = useMemo(
    () => subscriptions.filter((item) => item.status === "cancelled").length,
    [subscriptions],
  );

  const totalMonthlyValue = useMemo(
    () =>
      subscriptions
        .filter((item) => item.status === "active")
        .reduce((sum, item) => sum + Number(item.plan?.price || 0), 0),
    [subscriptions],
  );

  const isOverBudget = useMemo(
    () => budget > 0 && totalMonthlyValue > budget,
    [budget, totalMonthlyValue],
  );

  const selectedPlanDetails = useMemo(
    () => plans.find((plan) => plan._id === selectedPlan),
    [plans, selectedPlan],
  );

  const handleSetBudget = async () => {
    const amount = Number(budgetInput);
    if (!budgetInput.trim() || isNaN(amount) || amount < 0) {
      alert("Please enter a valid budget amount.");
      return;
    }
    try {
      await axiosInstance.put("/api/auth/profile", { monthlyBudget: amount });
      setBudget(amount);
      setBudgetInput("");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save budget.");
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      alert("Please select a plan first.");
      return;
    }

    try {
      setActionLoading("subscribe");
      await axiosInstance.post("/api/subscriptions", { plan: selectedPlan });
      setSelectedPlan("");
      await fetchSubscriptions();
      alert("Subscription created successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Subscription failed.");
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel = async (id) => {
    try {
      setActionLoading(id);
      await axiosInstance.patch(`/api/subscriptions/${id}/cancel`);
      await fetchSubscriptions();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to cancel subscription.");
    } finally {
      setActionLoading("");
    }
  };

  const handleRenew = async (id) => {
    try {
      setActionLoading(id);
      await axiosInstance.patch(`/api/subscriptions/${id}/renew`);
      await fetchSubscriptions();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to renew subscription.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subscription record permanently?")) return;

    try {
      setActionLoading(id);
      await axiosInstance.delete(`/api/subscriptions/${id}`);
      await fetchSubscriptions();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete subscription.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="space-y-8 fade-in">

      {isOverBudget && (
        <div className="rounded-2xl bg-orange-50 border border-orange-200 px-5 py-4 flex items-start gap-4">
          <div>
            <p className="font-black text-orange-700 text-sm">⚠️ Budget Limit Exceeded</p>
            <p className="mt-1 text-sm text-orange-600 font-bold">
              Your active subscriptions total ${totalMonthlyValue.toFixed(2)}, which is ${(totalMonthlyValue - budget).toFixed(2)} over your ${budget.toFixed(2)} monthly budget.
            </p>
          </div>
        </div>
      )}

      {renewalAlerts.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-black text-red-700 text-sm">⚠️ Renewal Reminder</p>
            <ul className="mt-1 space-y-1">
              {renewalAlerts.map((sub) => {
                const days = getDaysUntilRenewal(sub);
                return (
                  <li key={sub._id} className="text-sm text-red-600 font-bold">
                    {sub.plan?.name || "Unknown Plan"} — renews in {days} day{days === 1 ? "" : "s"}
                  </li>
                );
              })}
            </ul>
          </div>
          <button
            onClick={() => setRenewalAlerts([])}
            className="text-red-400 hover:text-red-600 font-black text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}

      <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="badge badge-blue mb-5">User dashboard</p>

          <h1 className="page-title">Subscription Management</h1>

          <p className="page-subtitle text-lg max-w-3xl mt-5">
            Subscribe to plans, renew active services, cancel subscriptions, and
            review your subscription lifecycle history from one clean interface.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="metric-card">
              <p className="text-3xl font-black text-slate-950">
                {activeSubscriptions}
              </p>
              <p className="text-sm font-bold text-slate-500 mt-1">Active</p>
            </div>

            <div className="metric-card">
              <p className="text-3xl font-black text-slate-950">
                {cancelledSubscriptions}
              </p>
              <p className="text-sm font-bold text-slate-500 mt-1">Cancelled</p>
            </div>

            <div className="metric-card">
              <p className="text-3xl font-black text-slate-950">
                ${totalMonthlyValue.toFixed(2)}
              </p>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Active value
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/40">
            <p className="text-sm font-black text-slate-700 mb-3">Monthly Budget</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={budget > 0 ? `$${budget.toFixed(2)} set` : "Enter amount..."}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetBudget()}
                className="input-field text-sm py-2"
              />
              <button
                onClick={handleSetBudget}
                className="secondary-button px-4 py-2 text-sm whitespace-nowrap"
              >
                {budget > 0 ? "Update" : "Set"}
              </button>
            </div>

            {budget > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>${totalMonthlyValue.toFixed(2)} spent</span>
                  <span>${budget.toFixed(2)} limit</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOverBudget ? "bg-orange-500" : "bg-indigo-500"}`}
                    style={{ width: `${Math.min((totalMonthlyValue / budget) * 100, 100)}%` }}
                  />
                </div>
                <p className={`text-xs font-bold ${isOverBudget ? "text-orange-600" : "text-slate-400"}`}>
                  {isOverBudget
                    ? `${((totalMonthlyValue / budget) * 100).toFixed(0)}% — $${(totalMonthlyValue - budget).toFixed(2)} over limit`
                    : `${((totalMonthlyValue / budget) * 100).toFixed(0)}% of budget used`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="soft-card rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="badge badge-yellow mb-3">Create</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                New Subscription
              </h2>
            </div>

            <button
              onClick={loadPage}
              className="ghost-button px-4 py-2 text-sm"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">
                Available Plans
              </label>
              <select
                value={selectedPlan}
                onChange={(event) => setSelectedPlan(event.target.value)}
                className="input-field"
              >
                <option value="">Select a plan</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} - ${plan.price} / {plan.duration}
                  </option>
                ))}
              </select>
            </div>

            {selectedPlanDetails && (
              <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4">
                <p className="font-black text-slate-950">
                  {selectedPlanDetails.name}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  ${selectedPlanDetails.price} / {selectedPlanDetails.duration}
                </p>

                {Array.isArray(selectedPlanDetails.features) &&
                  selectedPlanDetails.features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedPlanDetails.features.map((feature, index) => (
                        <span key={index} className="badge badge-blue">
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={actionLoading === "subscribe"}
              className="primary-button w-full py-3"
            >
              {actionLoading === "subscribe" ? "Creating..." : "Subscribe Now"}
            </button>

            {!loading && plans.length === 0 && (
              <p className="text-sm text-red-600 font-bold">
                No active plans are available. Ask an admin to create plans.
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              My Subscriptions
            </h2>
            <p className="text-slate-500 mt-1">
              View lifecycle status, renewal count, and available actions.
            </p>
          </div>
        </div>

        {loading && (
          <div className="soft-card rounded-[2rem] p-10 text-center">
            <p className="font-bold text-slate-500">Loading subscriptions...</p>
          </div>
        )}

        {!loading && subscriptions.length === 0 && (
          <div className="soft-card rounded-[2rem] p-10 text-center">
            <div className="h-16 w-16 rounded-3xl bg-indigo-100 text-indigo-700 grid place-items-center mx-auto text-2xl font-black">
              +
            </div>
            <h3 className="text-xl font-black text-slate-950 mt-4">
              No subscriptions yet
            </h3>
            <p className="text-slate-500 mt-2">
              Select a plan above to create your first subscription.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subscriptions.map((sub) => (
            <article
              key={sub._id}
              className="soft-card hover-card rounded-[2rem] p-6 space-y-5"
            >
              <div className="flex justify-between gap-4 items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    {sub.plan?.name || "Unknown Plan"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    ${sub.plan?.price ?? "-"} / {sub.plan?.duration || "-"}
                  </p>

                  {(() => {
                    const daysLeft = getDaysUntilRenewal(sub);
                    if (daysLeft === null) return null;

                    const isUrgent = daysLeft <= 7 && daysLeft >= 0;

                    return (
                      <div
                        className={`rounded-2xl px-4 py-2 text-sm font-bold mt-3 ${
                          isUrgent
                            ? "bg-red-50 border border-red-200 text-red-700"
                            : "bg-yellow-50 border border-yellow-200 text-yellow-800"
                        }`}
                      >
                        {daysLeft < 0
                          ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"}`
                          : `Renewal in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
                        }
                      </div>
                    );
                  })()}
                </div>

                <span className={statusClass(sub.status)}>
                  {sub.status || "unknown"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400 font-black">
                    Started
                  </p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {formatDate(sub.startDate)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400 font-black">
                    Renewals
                  </p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {sub.renewalCount || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400 font-black">
                    Renewed
                  </p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {formatDate(sub.renewedAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400 font-black">
                    Cancelled
                  </p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {formatDate(sub.cancelledAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleRenew(sub._id)}
                  disabled={actionLoading === sub._id}
                  className="success-button px-3 py-2 text-sm"
                >
                  Renew
                </button>

                <button
                  onClick={() => handleCancel(sub._id)}
                  disabled={
                    actionLoading === sub._id || sub.status === "cancelled"
                  }
                  className="warning-button px-3 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={() => handleDelete(sub._id)}
                  disabled={actionLoading === sub._id}
                  className="danger-button px-3 py-2 text-sm"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Subscriptions;
