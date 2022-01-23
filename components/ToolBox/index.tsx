import { useEffect, useState } from "react";

type FontFamily = "heti--classic" | "heti--sans" | "heti--serif";
type DarkMode = "auto" | "light" | "dark";

const ToolBox = () => {
  const [fontFamily, setFontFamily] = useState<FontFamily>("heti--classic");
  const [darkMode, setDarkMode] = useState<DarkMode>("dark");

  const onFontFamilyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFontFamily(e.target.value as FontFamily);
  };

  const onDarkModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDarkMode(e.target.value as DarkMode);
  };

  useEffect(() => {
    const $$hetis = document.querySelector(".heti");
    if (!$$hetis) return
    $$hetis.className = ["article", "heti", fontFamily].join(" ");
  }, [fontFamily]);

  useEffect(() => {
    const $$root = document.getElementsByTagName("html")[0];
    $$root.setAttribute("data-darkmode", darkMode);
  }, [darkMode]);

  return (
    <aside className="panel">
      <ul className="panel-list panel-list--gray">
        <li>
          <input
            id="font-classic"
            type="radio"
            value="heti--classic"
            name="font"
            checked={fontFamily === "heti--classic"}
            onChange={onFontFamilyChange}
          />
          <label htmlFor="font-classic">传统</label>
        </li>
        <li>
          <input
            id="font-sans"
            type="radio"
            value="heti--sans"
            name="font"
            checked={fontFamily === "heti--sans"}
            onChange={onFontFamilyChange}
          />
          <label htmlFor="font-sans">黑体</label>
        </li>
        <li>
          <input
            id="font-serif"
            type="radio"
            value="heti--serif"
            name="font"
            checked={fontFamily === "heti--serif"}
            onChange={onFontFamilyChange}
          />
          <label htmlFor="font-serif">宋体</label>
        </li>
      </ul>
      <ul className="panel-list panel-list--gray panel-list--icon">
        <li>
          <input
            type="radio"
            value="auto"
            name="darkmode"
            id="darkmode-auto"
            checked={darkMode === "auto"}
            onChange={onDarkModeChange}
          />
          <label htmlFor="darkmode-auto">🌗</label>
        </li>
        <li>
          <input
            type="radio"
            value="light"
            name="darkmode"
            id="darkmode-light"
            checked={darkMode === "light"}
            onChange={onDarkModeChange}
          />
          <label htmlFor="darkmode-light">🌞</label>
        </li>
        <li>
          <input
            type="radio"
            value="dark"
            name="darkmode"
            id="darkmode-dark"
            checked={darkMode === "dark"}
            onChange={onDarkModeChange}
          />
          <label htmlFor="darkmode-dark">🌙</label>
        </li>
      </ul>
    </aside>
  );
};

export default ToolBox;
