// Menu déroulant « Matières »
const btn = document.getElementById("btn-matieres");
const list = document.getElementById("menu-matieres");
function close() { list.hidden = true; btn.setAttribute("aria-expanded", "false"); }
btn.addEventListener("click", e => {
  e.stopPropagation();
  const open = list.hidden;
  list.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", close);
document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
