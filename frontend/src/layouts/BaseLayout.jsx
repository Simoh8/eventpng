export default function BaseLayout({ children }) {
  return (
    <div className="w-full max-w-[90%] mx-auto">
      {children}
    </div>
  );
}
