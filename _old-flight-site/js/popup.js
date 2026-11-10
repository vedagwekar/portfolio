// The popup card, shared by the home page and the full shelf page.
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const card = ({ kicker, title, body, url, urlText = "open link ↗", extra = "" }) => `
  ${kicker ? `<small>${esc(kicker)}</small>` : ""}<b class="pop-title">${esc(title)}</b>
  ${body ? `<p>${esc(body)}</p>` : ""}${url ? `<p><a href="${url}" rel="noopener">${urlText}</a></p>` : ""}${extra}`;

export const dlg = document.getElementById("pop");
export function popup(data) {
  document.getElementById("pop-body").innerHTML = card(data);
  dlg.showModal();
}
dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-pop-close]") || e.target.closest("#pop-body a")) dlg.close(); });
