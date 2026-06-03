import FormField from "./FormField";

export default function AuthForm({
  isLogin,
  loading,
  errors,
  form,
  onFieldChange,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit}>
      {!isLogin && (
        <>
          <FormField
            placeholder="Username"
            value={form.username}
            onChange={(value) => onFieldChange("username", value)}
            error={errors.username}
          />
          <FormField
            placeholder="Ho va ten"
            value={form.fullName}
            onChange={(value) => onFieldChange("fullName", value)}
            error={errors.fullName}
          />
          <FormField
            placeholder="So dien thoai"
            value={form.phone}
            onChange={(value) => onFieldChange("phone", value)}
            error={errors.phone}
          />
        </>
      )}

      <FormField
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(value) => onFieldChange("email", value)}
        error={errors.email}
      />
      <FormField
        type="password"
        placeholder="Mat khau"
        value={form.password}
        onChange={(value) => onFieldChange("password", value)}
        error={errors.password}
      />

      {!isLogin && (
        <FormField
          type="password"
          placeholder="Xac nhan mat khau"
          value={form.confirmPassword}
          onChange={(value) => onFieldChange("confirmPassword", value)}
          error={errors.confirmPassword}
        />
      )}

      <button className="btn btn-primary w-100 mt-2" disabled={loading}>
        {loading
          ? "Dang xu ly..."
          : isLogin
          ? "Dang nhap"
          : "Gui OTP dang ky"}
      </button>
    </form>
  );
}
