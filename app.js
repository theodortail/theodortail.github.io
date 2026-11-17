import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const EMAIL_DOMAIN = "ptsib.example"; // les pseudos sont convertis en adresses fictives pour Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const page = document.body.dataset.page;
const main = document.getElementById("main");
const menu = document.getElementById("menu");
let me = null, content = null;

// ---------- Contenu de départ (chargé une fois par l'admin) ----------
const L = (t, d, u) => ({ t, d, u });
const DEFAULT = {
  contact: "E-mail : ton.adresse@exemple.fr\nClasse : PTSI B",
  subjects: [
    { id: "maths", name: "Maths", category: "Sciences", intro: "Cours, exercices, graphiques et vérification de calculs.", links: [
      L("Khan Academy", "Cours et exercices de maths pas à pas.", "https://fr.khanacademy.org/math"),
      L("GeoGebra", "Tracer des fonctions et de la géométrie.", "https://www.geogebra.org"),
      L("Desmos", "Calculatrice graphique en ligne.", "https://www.desmos.com/calculator"),
      L("WolframAlpha", "Vérifier un calcul, une dérivée, une intégrale.", "https://www.wolframalpha.com")] },
    { id: "physique", name: "Physique", category: "Sciences", intro: "Simulations, cours et schémas électriques.", links: [
      L("PhET", "Simulations interactives de physique et de chimie.", "https://phet.colorado.edu/fr/"),
      L("Falstad Circuit", "Simuler un circuit électrique dans le navigateur.", "https://www.falstad.com/circuit/"),
      L("Khan Academy Sciences", "Cours de physique et de chimie.", "https://fr.khanacademy.org/science"),
      L("Lumni", "Vidéos et cours de physique-chimie.", "https://www.lumni.fr")] },
    { id: "anglais", name: "Anglais", category: "Langues", intro: "Dictionnaires, traductions en contexte et leçons.", links: [
      L("WordReference", "Dictionnaire anglais-français avec forums.", "https://www.wordreference.com"),
      L("Linguee", "Traductions avec exemples en contexte.", "https://www.linguee.fr"),
      L("Cambridge Dictionary", "Définitions et prononciation.", "https://dictionary.cambridge.org"),
      L("BBC Learning English", "Leçons, vidéos et vocabulaire.", "https://www.bbc.co.uk/learningenglish")] },
    { id: "allemand", name: "Allemand", category: "Langues", intro: "Traduction, dictionnaires et cours.", links: [
      L("DeepL", "Traduction français-allemand.", "https://www.deepl.com/translator"),
      L("Linguee français-allemand", "Traductions avec exemples en contexte.", "https://www.linguee.fr/francais-allemand"),
      L("Duden", "Dictionnaire de référence en allemand.", "https://www.duden.de"),
      L("Nicos Weg (Deutsche Welle)", "Cours d’allemand gratuit en vidéo.", "https://learngerman.dw.com/fr/")] },
    { id: "francais", name: "Français", category: "Langues", intro: "Conjugaison, dictionnaires, orthographe et cours.", links: [
      L("Reverso Conjugaison", "Conjuguer n’importe quel verbe.", "https://conjugaison.reverso.net/conjugaison/"),
      L("CNRTL", "Dictionnaire, synonymes et étymologie.", "https://www.cnrtl.fr"),
      L("Projet Voltaire", "S’entraîner à l’orthographe.", "https://www.projet-voltaire.fr"),
      L("Lumni", "Cours et vidéos pour tous les niveaux.", "https://www.lumni.fr")] },
    { id: "sii", name: "SII", category: "Sciences", intro: "Sciences industrielles de l’ingénieur : électronique, programmation et conception 3D.", links: [
      L("Tinkercad", "Concevoir en 3D et simuler des circuits Arduino.", "https://www.tinkercad.com"),
      L("Arduino Reference", "Toutes les fonctions du langage Arduino.", "https://www.arduino.cc/reference/fr/"),
      L("Onshape", "Logiciel de CAO 3D gratuit dans le navigateur.", "https://www.onshape.com"),
      L("Falstad Circuit", "Simuler un circuit électronique.", "https://www.falstad.com/circuit/")] }
  ]
};

// ---------- Outils ----------
const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter(x => x != null));
  return el;
};
const safeUrl = u => (/^https?:\/\//i.test(u) ? u : "#");
const show = (...nodes) => main.replaceChildren(...nodes);
const save = () => setDoc(doc(db, "site", "content"), content);

// ---------- Connexion ----------
function showLogin() {
  const err = h("p", { class: "error", role: "alert" });
  const pseudo = h("input", { id: "pseudo", autocomplete: "username", autocapitalize: "none", required: "" });
  const pass = h("input", { id: "pass", type: "password", autocomplete: "current-password", required: "" });
  const form = h("form", { class: "card-form", onsubmit: async e => {
    e.preventDefault(); err.textContent = "";
    try {
      const snap = await getDoc(doc(db, "logins", pseudo.value.trim().toLowerCase()));
      if (!snap.exists()) throw new Error("inconnu");
      await signInWithEmailAndPassword(auth, snap.data().email, pass.value);
    } catch { err.textContent = "Pseudo ou mot de passe incorrect."; }
  } },
    h("label", { for: "pseudo" }, "Pseudo"), pseudo,
    h("label", { for: "pass" }, "Mot de passe"), pass,
    h("button", { type: "submit", class: "btn" }, "Se connecter"), err);
  show(h("h1", {}, "Connexion"), h("p", { class: "intro" }, "Ce site est réservé aux élèves de PTSI B."), form);
}

function denied() {
  show(h("h1", {}, "Accès refusé"),
    h("p", { class: "intro" }, "Ton compte n’a pas (ou plus) accès à ce site."),
    h("button", { type: "button", class: "btn", onclick: () => signOut(auth) }, "Se déconnecter"));
}

// ---------- Menu ----------
function renderMenu() {
  const cur = f => (f === page ? { "aria-current": "page" } : {});
  const subs = content ? content.subjects : [];
  const list = h("ul", { class: "dd-list", id: "menu-matieres", hidden: "" },
    subs.map(s => h("li", {}, h("a", { href: `${s.id}.html`, ...cur(s.id) }, s.name))));
  const btn = h("button", { type: "button", id: "btn-matieres", class: subs.some(s => s.id === page) ? "active" : "", "aria-expanded": "false", "aria-controls": "menu-matieres" }, "Matières ▾");
  const closeMenu = () => { list.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", e => { e.stopPropagation(); list.hidden = !list.hidden; btn.setAttribute("aria-expanded", String(!list.hidden)); });
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  menu.replaceChildren(
    h("a", { href: "index.html", ...cur("index") }, "Catégories"),
    h("div", { class: "dd" }, btn, list),
    h("a", { href: "contact.html", ...cur("contact") }, "Contact"),
    me.role === "admin" ? h("a", { href: "admin.html", ...cur("admin") }, "Admin") : null,
    h("button", { type: "button", class: "logout", onclick: () => signOut(auth) }, `Déconnexion (${me.pseudo})`));
}

// ---------- Pages ----------
function pageHome() {
  const cats = [...new Set(content.subjects.map(s => s.category))];
  show(h("h1", {}, "Catégories"), h("p", { class: "intro" }, "Choisis une matière pour accéder aux sites utiles."),
    ...cats.flatMap(c => [h("h2", {}, c), h("ul", { class: "cards" },
      content.subjects.filter(s => s.category === c).map(s =>
        h("li", {}, h("a", { href: `${s.id}.html` }, h("strong", {}, s.name), h("span", {}, s.intro)))))]));
}
function pageSubject(s) {
  show(h("h1", {}, s.name), h("p", { class: "intro" }, s.intro),
    s.links.length ? h("ul", { class: "cards" }, s.links.map(l =>
      h("li", {}, h("a", { href: safeUrl(l.u), target: "_blank", rel: "noopener noreferrer" }, h("strong", {}, l.t), h("span", {}, l.d)))))
      : h("p", {}, "Aucun lien pour le moment."));
}
function pageContact() {
  show(h("h1", {}, "Contact"), h("p", { class: "intro" }, "Une question ou un lien à proposer ?"), h("div", { class: "contact pre" }, content.contact));
}

// ---------- Administration ----------
async function createUser(pseudo, password, role) {
  if (!/^[a-z0-9_-]{2,20}$/.test(pseudo)) throw new Error("Pseudo : 2 à 20 caractères (lettres minuscules, chiffres, - et _).");
  if (password.length < 6) throw new Error("Mot de passe : 6 caractères minimum.");
  if ((await getDoc(doc(db, "logins", pseudo))).exists()) throw new Error("Ce pseudo existe déjà.");
  const email = `${pseudo}.${crypto.randomUUID().slice(0, 8)}@${EMAIL_DOMAIN}`;
  // Seconde instance Firebase : l'admin reste connecté pendant la création du compte
  const sec = getApps().find(a => a.name === "sec") || initializeApp(firebaseConfig, "sec");
  const secAuth = getAuth(sec);
  const cred = await createUserWithEmailAndPassword(secAuth, email, password);
  await signOut(secAuth);
  await setDoc(doc(db, "users", cred.user.uid), { pseudo, role });
  await setDoc(doc(db, "logins", pseudo), { email });
}

async function pageAdmin() {
  if (me.role !== "admin") return show(h("h1", {}, "Admin"), h("p", {}, "Cette page est réservée à l’administrateur."));
  const msg = h("p", { role: "status" });
  const say = (t, ok = false) => { msg.textContent = t; msg.className = ok ? "ok" : "error"; };
  const wrap = async fn => { try { await fn(); } catch (e) { say(e.code ? `Erreur : ${e.code}` : e.message || "Erreur."); } };

  // Utilisateurs
  const usersBox = h("div");
  const refreshUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    usersBox.replaceChildren(h("table", { class: "users" }, h("tbody", {}, snap.docs.map(d => {
      const u = d.data();
      const del = h("button", { type: "button", class: "btn small danger", onclick: () => wrap(async () => {
        if (!confirm(`Retirer ${u.pseudo} ?`)) return;
        await deleteDoc(doc(db, "users", d.id));
        await deleteDoc(doc(db, "logins", u.pseudo));
        say(`${u.pseudo} retiré.`, true); await refreshUsers();
      }) }, "Retirer");
      if (d.id === me.uid) del.disabled = true;
      return h("tr", {}, h("td", {}, u.pseudo), h("td", {}, u.role === "admin" ? "Admin" : "Élève"), h("td", {}, del));
    }))));
  };
  const np = h("input", { id: "np", required: "", autocapitalize: "none", autocomplete: "off" });
  const npw = h("input", { id: "npw", required: "", autocomplete: "off", minlength: "6" });
  const nadm = h("input", { type: "checkbox", id: "nadm" });
  const addForm = h("form", { class: "card-form", onsubmit: e => { e.preventDefault(); wrap(async () => {
    await createUser(np.value.trim().toLowerCase(), npw.value, nadm.checked ? "admin" : "user");
    say("Utilisateur ajouté.", true); addForm.reset(); await refreshUsers();
  }); } },
    h("label", { for: "np" }, "Pseudo"), np,
    h("label", { for: "npw" }, "Mot de passe (6 caractères minimum)"), npw,
    h("label", { class: "check" }, nadm, " Administrateur"),
    h("button", { type: "submit", class: "btn" }, "Ajouter l’utilisateur"));

  const parts = [h("h1", {}, "Administration"), msg, h("h2", {}, "Utilisateurs"), addForm, usersBox];

  if (!content) {
    parts.push(h("h2", {}, "Contenu du site"), h("p", {}, "Le contenu n’existe pas encore."),
      h("button", { type: "button", class: "btn", onclick: () => wrap(async () => { content = structuredClone(DEFAULT); await save(); renderMenu(); pageAdmin(); }) }, "Charger le contenu de départ"));
    show(...parts); return refreshUsers();
  }

  // Liens
  const linksBox = h("div");
  const renderLinks = () => linksBox.replaceChildren(...content.subjects.map(s => {
    const t = h("input", { placeholder: "Titre", required: "" });
    const d = h("input", { placeholder: "Description" });
    const u = h("input", { placeholder: "https://…", type: "url", required: "" });
    return h("section", { class: "admin-sub" }, h("h3", {}, s.name),
      h("ul", { class: "admin-links" }, s.links.map((l, i) => h("li", {}, h("span", {}, l.t),
        h("button", { type: "button", class: "btn small danger", onclick: () => wrap(async () => { s.links.splice(i, 1); await save(); renderLinks(); }) }, "Retirer")))),
      h("form", { class: "row", onsubmit: e => { e.preventDefault(); wrap(async () => {
        s.links.push({ t: t.value.trim(), d: d.value.trim(), u: u.value.trim() }); await save(); renderLinks();
      }); } }, t, d, u, h("button", { type: "submit", class: "btn small" }, "Ajouter")));
  }));
  // Contact
  const ct = h("textarea", { rows: "4", id: "ct" }); ct.value = content.contact;
  const contactForm = h("form", { class: "card-form", onsubmit: e => { e.preventDefault(); wrap(async () => { content.contact = ct.value; await save(); say("Contact enregistré.", true); }); } },
    h("label", { for: "ct" }, "Texte de la page Contact"), ct, h("button", { type: "submit", class: "btn" }, "Enregistrer"));

  parts.push(h("h2", {}, "Liens des matières"), linksBox, h("h2", {}, "Contact"), contactForm);
  show(...parts); renderLinks(); return refreshUsers();
}

// ---------- Démarrage ----------
onAuthStateChanged(auth, async user => {
  menu.replaceChildren(); me = null; content = null;
  if (!user) return showLogin();
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return denied();
    me = { uid: user.uid, ...snap.data() };
    const c = await getDoc(doc(db, "site", "content"));
    content = c.exists() ? c.data() : null;
    renderMenu();
    if (page === "admin") return pageAdmin();
    if (!content) return show(h("h1", {}, "Bientôt disponible"), h("p", {}, me.role === "admin" ? "Charge le contenu depuis la page Admin." : "Le contenu n’est pas encore prêt."));
    if (page === "index") return pageHome();
    if (page === "contact") return pageContact();
    const s = content.subjects.find(x => x.id === page);
    if (s) pageSubject(s);
  } catch { denied(); }
});
