export default function OtpInputs({
  otp,
  inputsRef,
  onChange,
  onKeyDown,
  onPaste,
  className = "text-center fw-bold",
  style,
}) {
  return (
    <div className="d-flex justify-content-center gap-2 mb-3">
      {otp.map((value, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          maxLength={1}
          value={value}
          onChange={(e) => onChange(e.target.value, index)}
          onKeyDown={(e) => onKeyDown(e, index)}
          onPaste={onPaste}
          className={className}
          style={style}
        />
      ))}
    </div>
  );
}
