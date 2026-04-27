import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, passwordConfirmation);
      navigate("/workspaces");
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        const messages = Object.values(errors).flat();
        setError(messages[0] || "Registration failed");
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-cream">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full opacity-10 bg-sage" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full opacity-10 bg-mint" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 bg-ocean" />
      </div>

      <div className="relative w-full max-w-md p-8 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] rounded-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center bg-ocean rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-charcoal">Project Manager</h1>
        </div>

        <h2 className="text-center text-lg font-semibold text-charcoal mb-1">Create account</h2>
        <p className="text-center mb-6 text-sm text-gray-medium">Get started for free</p>

        {error && (
          <div className="mb-4 p-3 border text-sm bg-red-50 border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-left text-sm font-medium mb-1 text-charcoal">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-cream-border rounded-lg text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
              required
            />
          </div>
          <div>
            <label className="block text-left text-sm font-medium mb-1 text-charcoal">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-cream-border rounded-lg text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
              required
            />
          </div>
          <div>
            <label className="block text-left text-sm font-medium mb-1 text-charcoal">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-cream-border rounded-lg text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-left text-sm font-medium mb-1 text-charcoal">
              Confirm Password
            </label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full px-3 py-2 border border-cream-border rounded-lg text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-medium">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-mint hover:text-mint/80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}