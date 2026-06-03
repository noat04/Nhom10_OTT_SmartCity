export default function AuthSwitch({ isLogin, onSwitchMode, onForgotPassword }) {
  return (
    <div className="text-center mt-3">
      {isLogin ? (
        <div className="d-flex justify-content-center gap-2">
          <span
            onClick={() => onSwitchMode(false)}
            style={{ cursor: "pointer", color: "blue" }}
          >
            Dang ky
          </span>
          <span style={{ color: "#999" }}>|</span>
          <span
            onClick={onForgotPassword}
            style={{ cursor: "pointer", color: "red" }}
          >
            Quen mat khau?
          </span>
        </div>
      ) : (
        <span
          onClick={() => onSwitchMode(true)}
          style={{ cursor: "pointer", color: "blue" }}
        >
          Dang nhap
        </span>
      )}
    </div>
  );
}
