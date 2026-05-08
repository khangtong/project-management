import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "../store/useAuth";
import { authApi } from "../api/auth";
import UserAvatar from "../components/ui/UserAvatar";
import { useConfirm } from "../components/ui/useConfirm";

// ── Reusable primitives ───────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-border shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-cream-border bg-cream-light/40">
        <h2 className="text-base font-semibold text-charcoal">{title}</h2>
        {description && <p className="text-sm text-gray-medium mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1.5">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-medium mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function Input({ type = "text", value, onChange, placeholder, autoComplete, disabled }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      autoComplete={autoComplete} disabled={disabled}
      className="w-full px-3 py-2.5 rounded-xl border border-cream-border text-charcoal text-sm
        focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    />
  );
}

// ── Avatar upload section ─────────────────────────────────────────────────────
function AvatarUploader({ user, onUpdate }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // local blob URL before upload
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();

  const uploadMutation = useMutation({
    mutationFn: (file) => authApi.updateAvatar(file),
    onMutate:  () => toast.loading("Uploading avatar…", { id: "avatar" }),
    onSuccess: (res) => {
      onUpdate(res.data);
      setPreview(null);
      toast.success("Avatar updated", { id: "avatar" });
    },
    onError: (err) => {
      setPreview(null);
      toast.error(err.response?.data?.message || "Upload failed", { id: "avatar" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => authApi.removeAvatar(),
    onMutate:  () => toast.loading("Removing avatar…", { id: "avatar" }),
    onSuccess: (res) => {
      onUpdate(res.data);
      toast.success("Avatar removed", { id: "avatar" });
    },
    onError: () => toast.error("Failed to remove avatar", { id: "avatar" }),
  });

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024)     { toast.error("Image must be under 5 MB"); return; }
    // Show preview then upload
    const url = URL.createObjectURL(file);
    setPreview(url);
    uploadMutation.mutate(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleRemove = async () => {
    const ok = await confirm({
      title: "Remove avatar?",
      message: "Your profile picture will be removed and replaced with your initials.",
      confirmLabel: "Remove",
    });
    if (ok) removeMutation.mutate();
  };

  const isPending = uploadMutation.isPending || removeMutation.isPending;
  const displayUser = { ...user, avatar_url: preview || user?.avatar_url };

  return (
    <>
      {ConfirmDialog}
      <div className="flex items-start gap-6">
        {/* Current avatar — large */}
        <div className="relative shrink-0">
          <UserAvatar
            user={displayUser}
            size="w-24 h-24"
            textSize="text-2xl"
            rounded="rounded-2xl"
            className={`shadow-sm transition-opacity ${isPending ? "opacity-60" : ""}`}
          />
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20">
              <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1 space-y-3">
          {/* Drop zone */}
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 w-full py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              isDragOver
                ? "border-ocean bg-ocean/5 scale-[1.01]"
                : "border-cream-border hover:border-ocean/40 hover:bg-cream-light/60"
            } ${isPending ? "pointer-events-none opacity-50" : ""}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isDragOver ? "bg-ocean/20" : "bg-cream-light"}`}>
              <svg className={`w-5 h-5 transition-colors ${isDragOver ? "text-ocean" : "text-gray-medium"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-charcoal">
                Drop image here or <span className="text-ocean">click to browse</span>
              </p>
              <p className="text-xs text-gray-medium mt-0.5">PNG, JPG, WEBP · max 5 MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
            />
          </label>

          {/* Remove button — only if user has an avatar */}
          {user?.avatar_url && (
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-100 text-red-500 text-sm hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove current photo
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Password input ────────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, show, onToggle, placeholder, autoComplete, disabled }) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"} value={value} onChange={onChange}
        placeholder={placeholder} autoComplete={autoComplete} disabled={disabled}
        className="w-full px-3 py-2.5 pr-10 rounded-xl border border-cream-border text-charcoal text-sm
          focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      />
      <button type="button" onClick={onToggle} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-medium hover:text-charcoal transition-colors"
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters",    pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Number",           pass: /\d/.test(password) },
    { label: "Special character",pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const levels = [
    { label: "Weak",   bar: "w-1/4",  color: "bg-red-400",    text: "text-red-500"    },
    { label: "Fair",   bar: "w-2/4",  color: "bg-orange-400", text: "text-orange-500" },
    { label: "Good",   bar: "w-3/4",  color: "bg-sage",       text: "text-sage"       },
    { label: "Strong", bar: "w-full", color: "bg-ocean",      text: "text-ocean"      },
  ];
  const level = levels[Math.max(0, score - 1)];
  return (
    <div className="space-y-3 p-4 rounded-xl bg-cream-light border border-cream-border">
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-gray-medium">Password strength</span>
          <span className={`text-xs font-semibold ${level.text}`}>{level.label}</span>
        </div>
        <div className="h-1.5 bg-cream-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${level.bar} ${level.color}`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5 text-xs">
            {c.pass ? (
              <svg className="w-3.5 h-3.5 text-sage shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-cream-border shrink-0" />
            )}
            <span className={c.pass ? "text-charcoal" : "text-gray-medium"}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [name, setName]         = useState(user?.name || "");
  const [email, setEmail]       = useState(user?.email || "");
  const [profileErrors, setProfileErrors] = useState({});

  const [currentPassword, setCurrentPassword]         = useState("");
  const [newPassword, setNewPassword]                 = useState("");
  const [confirmPassword, setConfirmPassword]         = useState("");
  const [passwordErrors, setPasswordErrors]           = useState({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onMutate:  () => toast.loading("Saving profile…", { id: "profile" }),
    onSuccess: (res) => {
      updateUser(res.data);
      setProfileErrors({});
      toast.success("Profile updated", { id: "profile" });
    },
    onError: (err) => {
      toast.error("Failed to update profile", { id: "profile" });
      setProfileErrors(err.response?.data?.errors || {});
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onMutate:  () => toast.loading("Updating password…", { id: "password" }),
    onSuccess: () => {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordErrors({});
      toast.success("Password updated", { id: "password" });
    },
    onError: (err) => {
      toast.error("Failed to update password", { id: "password" });
      setPasswordErrors(err.response?.data?.errors || {});
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setProfileErrors({});
    const payload = {};
    if (name.trim() !== user?.name)   payload.name = name.trim();
    if (email.trim() !== user?.email) payload.email = email.trim();
    if (!Object.keys(payload).length) { toast("Nothing to update", { icon: "ℹ️" }); return; }
    profileMutation.mutate(payload);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordErrors({});
    const errors = {};
    if (!currentPassword) errors.current_password = ["Current password is required."];
    if (!newPassword)     errors.password = ["New password is required."];
    else if (newPassword.length < 8) errors.password = ["Must be at least 8 characters."];
    if (newPassword !== confirmPassword) errors.password_confirmation = ["Passwords do not match."];
    if (Object.keys(errors).length) { setPasswordErrors(errors); return; }
    passwordMutation.mutate({
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: confirmPassword,
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Profile</h1>
        <p className="text-sm text-gray-medium mt-0.5">Manage your personal information and security</p>
      </div>

      {/* ── Identity card ── */}
      <div className="bg-white rounded-2xl border border-cream-border shadow-sm p-6">
        <div className="flex items-center gap-5">
          <UserAvatar user={user} size="w-20 h-20" textSize="text-2xl" rounded="rounded-2xl" className="shadow-sm" />
          <div>
            <h2 className="text-xl font-semibold text-charcoal">{user?.name}</h2>
            <p className="text-sm text-gray-medium">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-sage" />
              <span className="text-xs text-gray-medium">Active account</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Avatar ── */}
      <Section title="Profile Picture" description="Upload a photo to personalise your account">
        <AvatarUploader user={user} onUpdate={updateUser} />
      </Section>

      {/* ── Personal info ── */}
      <Section title="Personal Information" description="Update your name and email address">
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <Field label="Full Name" error={profileErrors.name?.[0]}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" disabled={profileMutation.isPending} />
          </Field>
          <Field label="Email Address" hint="Changing your email will require re-verification." error={profileErrors.email?.[0]}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" disabled={profileMutation.isPending} />
          </Field>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-medium">
              Last updated:{" "}
              {user?.updated_at
                ? new Date(user.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : "—"}
            </p>
            <button type="submit" disabled={profileMutation.isPending} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50 transition-colors">
              {profileMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Password ── */}
      <Section title="Change Password" description="Use a strong password of at least 8 characters">
        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <Field label="Current Password" error={passwordErrors.current_password?.[0]}>
            <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} show={showCurrentPassword} onToggle={() => setShowCurrentPassword((v) => !v)} placeholder="Enter current password" autoComplete="current-password" disabled={passwordMutation.isPending} />
          </Field>
          <div className="h-px bg-cream-border" />
          <Field label="New Password" hint="Minimum 8 characters." error={passwordErrors.password?.[0]}>
            <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} show={showNewPassword} onToggle={() => setShowNewPassword((v) => !v)} placeholder="Enter new password" autoComplete="new-password" disabled={passwordMutation.isPending} />
          </Field>
          <Field label="Confirm New Password" error={passwordErrors.password_confirmation?.[0]}>
            <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} placeholder="Re-enter new password" autoComplete="new-password" disabled={passwordMutation.isPending} />
          </Field>
          {newPassword.length > 0 && <PasswordStrength password={newPassword} />}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={passwordMutation.isPending} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50 transition-colors">
              {passwordMutation.isPending ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Danger zone ── */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50/50">
          <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
          <p className="text-sm text-red-500/80 mt-0.5">Irreversible actions — proceed with care</p>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-charcoal">Delete Account</p>
            <p className="text-xs text-gray-medium mt-0.5">Permanently delete your account and all associated data</p>
          </div>
          <button disabled title="Contact support to delete your account" className="px-4 py-2 rounded-xl text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
