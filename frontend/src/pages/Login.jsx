import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axiosConfig";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      const response = await axiosInstance.post("/api/auth/login", formData);
      login(response.data?.data || response.data);
      navigate("/subscriptions");
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Login failed. Please check your email and password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[78vh] grid lg:grid-cols-[1.08fr_0.92fr] gap-8 items-center fade-in">
      <section className="space-y-8">
        <div className="inline-flex items-center gap-2 badge badge-blue">
          <span>●</span>
          Assessment 2 Ready Application
        </div>

        <div className="space-y-5">
          <h1 className="page-title">
            Control every subscription from one clean dashboard.
          </h1>

          <p className="page-subtitle text-lg max-w-2xl">
            SubManager helps users subscribe, renew, cancel, and track plans
            while giving admins full control over subscription plan management.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl">
          <div className="metric-card">
            <p className="text-2xl font-black text-slate-950">CRUD</p>
            <p className="text-sm text-slate-500 mt-1">
              Plans and subscriptions
            </p>
          </div>

          <div className="metric-card">
            <p className="text-2xl font-black text-slate-950">OOP</p>
            <p className="text-sm text-slate-500 mt-1">
              Service and repository layers
            </p>
          </div>

          <div className="metric-card">
            <p className="text-2xl font-black text-slate-950">AWS</p>
            <p className="text-sm text-slate-500 mt-1">Deployment ready</p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="mb-7">
          <p className="badge badge-yellow mb-4">Secure login</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Welcome back
          </h2>
          <p className="text-slate-500 mt-2">
            Securely manage your subscriptions and plans.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">
              Email address
            </label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-button w-full py-3"
          >
            {loading ? "Logging in..." : "Login to Dashboard"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-600">
            New to SubManager?{" "}
            <Link
              to="/register"
              className="font-black text-indigo-600 hover:text-indigo-700"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
