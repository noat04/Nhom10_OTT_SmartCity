export default function FormField({
  type = "text",
  placeholder,
  value,
  onChange,
  error,
}) {
  return (
    <>
      <input
        type={type}
        className={`form-control mb-1 ${error ? "is-invalid" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <div className="text-danger mb-2">{error}</div>}
    </>
  );
}
