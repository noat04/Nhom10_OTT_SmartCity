import OtpInputs from "./OtpInputs";

export default function ForgotPasswordSteps({
  step,
  loading,
  email,
  setEmail,
  otp,
  inputsRef,
  newPassword,
  setNewPassword,
  confirm,
  setConfirm,
  onSendOtp,
  onVerifyOtp,
  onResetPassword,
  onOtpChange,
  onOtpKeyDown,
  onOtpPaste,
}) {
  if (step === 1) {
    return (
      <>
        <input
          className="form-control mb-3"
          placeholder="Nhap email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-primary w-100" onClick={onSendOtp} disabled={loading}>
          {loading ? "Dang gui..." : "Gui OTP"}
        </button>
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <p className="text-muted small">Nhap OTP da gui toi email</p>
        <OtpInputs
          otp={otp}
          inputsRef={inputsRef}
          onChange={onOtpChange}
          onKeyDown={onOtpKeyDown}
          onPaste={onOtpPaste}
          className="text-center fw-bold otp-box"
        />
        <button className="btn btn-success w-100" onClick={onVerifyOtp} disabled={loading}>
          {loading ? "Dang xac thuc..." : "Xac nhan OTP"}
        </button>
      </>
    );
  }

  return (
    <>
      <input
        type="password"
        className="form-control mb-2"
        placeholder="Mat khau moi"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <input
        type="password"
        className="form-control mb-3"
        placeholder="Xac nhan mat khau"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <button className="btn btn-danger w-100" onClick={onResetPassword} disabled={loading}>
        {loading ? "Dang xu ly..." : "Doi mat khau"}
      </button>
    </>
  );
}
