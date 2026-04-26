export function MenuPizzaGraphic() {
  return (
    <div
      className="menu-item"
      style={{
        backgroundColor: "var(--cream)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={78}
        height={130}
        viewBox="0 0 60 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx={30} cy={20} r={18} stroke="var(--coral)" strokeWidth={2} />
        <circle cx={30} cy={45} r={18} stroke="var(--coral)" strokeWidth={2} />
        <circle cx={30} cy={70} r={18} stroke="var(--coral)" strokeWidth={2} />
        <path d="M10 85L30 115L50 85H10Z" fill="var(--coral)" />
      </svg>
    </div>
  );
}
