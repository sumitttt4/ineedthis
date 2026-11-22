/** The INeedThis mark: an "i" whose dot is a spark, on a Glaze cobalt squircle. Keep in sync with public/icon.svg. */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f6bff"/><stop offset="1" stop-color="#1f35b8"/></linearGradient></defs><rect width="512" height="512" rx="128" fill="url(#g)"/><rect x="214" y="222" width="84" height="196" rx="42" fill="#fff"/><path d="M256 74c9 44 27 62 71 71-44 9-62 27-71 71-9-44-27-62-71-71 44-9 62-27 71-71z" fill="#fff"/></svg>`;

export const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;
