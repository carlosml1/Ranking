console.log("Ranking de Bolsas - app.js v9");

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  increment,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


/* =========================================================
   FIREBASE
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBJ2NFzLfXVlRbz8mL2bPNXyVMc4wZl_mk",
  authDomain: "fdsffsdf-a5398.firebaseapp.com",
  projectId: "fdsffsdf-a5398",
  storageBucket: "fdsffsdf-a5398.firebasestorage.app",
  messagingSenderId: "660514705234",
  appId: "1:660514705234:web:ebe445396a603a3c32f48b",
  measurementId: "G-DDW6LX4KFF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);


/* =========================================================
   COLECCIONES
   =========================================================

   IMPORTANTE:
   Firebase NO permite usar "/" en un nombre de colección.

   En pantalla:
   6 / 8

   En Firebase:
   6_8
   ========================================================= */

const TABLES = [
  "20 Bolsas",
  "16 Bolsas",
  "12 Bolsas",
  "6_8"
];

const ALL_COLLECTIONS = [
  "20 Bolsas",
  "16 Bolsas",
  "12 Bolsas",
  "6_8",
  "6 Bolsas",
  "8 Bolsas"
];


/* =========================================================
   ESTADO
   ========================================================= */

let currentAdmin = null;

let currentMoneyPerson = null;
let currentMoneyTable = null;
let currentMoneyCollection = null;

let currentAddPersonTable = null;

let currentEditPerson = null;
let currentEditCollection = null;

let unsubscribeRankings = [];


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}

function showError(element, message) {
  if (element) {
    element.textContent = message || "";
  }
}

function firebaseErrorMessage(error) {
  const code = error?.code || "";

  const messages = {
    "permission-denied":
      "Firebase ha rechazado la operación por las reglas de Firestore.",

    "storage/unauthorized":
      "Firebase Storage ha rechazado la imagen. Revisa las reglas de Storage.",

    "storage/unauthenticated":
      "Firebase Storage no permite la subida porque el usuario no está autenticado.",

    "storage/quota-exceeded":
      "Se ha superado la cuota de almacenamiento.",

    "not-found":
      "No se encontró el documento.",

    "failed-precondition":
      "Firebase necesita una configuración adicional."
  };

  return messages[code] ||
    error?.message ||
    "Ha ocurrido un error.";
}

function sortByMoney(a, b) {
  return Number(b?.money || 0) -
         Number(a?.money || 0);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(
    "es-ES",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ) + " €";
}

function displayGroupName(name) {
  return name === "6_8"
    ? "6 / 8"
    : name;
}


/* =========================================================
   ELEMENTOS HTML EXISTENTES
   ========================================================= */

const els = {
  loginHotspot: $("loginHotspot"),

  authDialog: $("authDialog"),
  authForm: $("authForm"),
  closeAuth: $("closeAuth"),
  authSubmit: $("authSubmit"),
  authMessage: $("authMessage"),
  username: $("username"),
  password: $("password"),

  sessionArea: $("sessionArea"),
  carlosResetBtn: $("carlosResetBtn"),
  statusPill: $("statusPill"),

  addPersonDialog: $("addPersonDialog"),
  addPersonForm: $("addPersonForm"),
  closeAddPerson: $("closeAddPerson"),
  personName: $("personName"),
  initialMoney: $("initialMoney"),
  personPhoto: $("personPhoto"),
  addPersonMessage: $("addPersonMessage"),

  moneyDialog: $("moneyDialog"),
  moneyForm: $("moneyForm"),
  closeMoney: $("closeMoney"),
  moneyTitle: $("moneyTitle"),
  moneyAmount: $("moneyAmount"),
  moneyMessage: $("moneyMessage"),

  rowTemplate: $("rowTemplate")
};


/* =========================================================
   CUERPOS DE LOS RANKINGS
   ========================================================= */

const rankingBodies = [
  $("rankingBody0"),
  $("rankingBody1"),
  $("rankingBody2"),
  $("rankingBody68")
];

const rankingPeople = [
  [],
  [],
  [],
  []
];


/* =========================================================
   CREAR BOTÓN "DINERO"
   ========================================================= */

function createMoneyButton() {

  if ($("moneyOverviewBtn")) {
    return;
  }

  const button = document.createElement("button");

  button.id = "moneyOverviewBtn";
  button.type = "button";
  button.className = "secondary-btn hidden";
  button.textContent = "Dinero";

  const actions =
    document.querySelector(".top-actions");

  if (actions) {
    actions.insertBefore(
      button,
      actions.firstChild
    );
  }

  button.addEventListener(
    "click",
    openMoneyOverview
  );
}


/* =========================================================
   CREAR VENTANA EDITAR
   ========================================================= */

function createEditDialog() {

  if ($("editPersonDialog")) {
    return;
  }

  const dialog = document.createElement("dialog");

  dialog.id = "editPersonDialog";
  dialog.className = "dialog";

  dialog.innerHTML = `

    <form id="editPersonForm" class="auth-card">

      <button
        type="button"
        id="closeEditPerson"
        class="close-btn"
        aria-label="Cerrar">
        ×
      </button>

      <span class="eyebrow">
        EDITAR PERSONA
      </span>

      <h2>Editar persona</h2>

      <label for="editPersonName">
        Nombre
      </label>

      <input
        id="editPersonName"
        type="text"
        maxlength="40"
        required
        placeholder="Nombre">

      <label for="editPersonPhoto">
        Cambiar foto
      </label>

      <input
        id="editPersonPhoto"
        type="file"
        accept="image/*">

      <p class="helper">
        Si no eliges una foto nueva,
        se conservará la actual.
      </p>

      <button
        id="saveEditPerson"
        class="primary-btn"
        type="submit">
        Guardar cambios
      </button>

      <p
        id="editPersonMessage"
        class="form-message">
      </p>

    </form>
  `;

  document.body.appendChild(dialog);

  $("closeEditPerson").addEventListener(
    "click",
    () => dialog.close()
  );

  $("editPersonForm").addEventListener(
    "submit",
    saveEditedPerson
  );
}


/* =========================================================
   CREAR VENTANA DINERO DE TODOS
   ========================================================= */

function createMoneyOverviewDialog() {

  if ($("moneyOverviewDialog")) {
    return;
  }

  const dialog = document.createElement("dialog");

  dialog.id = "moneyOverviewDialog";
  dialog.className =
    "dialog money-overview-dialog";

  dialog.innerHTML = `

    <div class="auth-card money-overview-card">

      <button
        type="button"
        id="closeMoneyOverview"
        class="close-btn"
        aria-label="Cerrar">
        ×
      </button>

      <span class="eyebrow">
        ADMINISTRACIÓN
      </span>

      <h2>Dinero de todos</h2>

      <p class="helper">
        Todas las personas de todos los grupos.
      </p>

      <div class="money-total-box">

        <span>
          Total
        </span>

        <strong id="moneyOverviewTotal">
          0,00 €
        </strong>

      </div>

      <div class="money-overview-wrap">

        <table class="money-overview-table">

          <thead>

            <tr>
              <th>Pos.</th>
              <th>Nombre</th>
              <th>Grupo</th>
              <th>Dinero</th>
            </tr>

          </thead>

          <tbody id="moneyOverviewBody">

            <tr>
              <td
                colspan="4"
                class="empty">
                Cargando…
              </td>
            </tr>

          </tbody>

        </table>

      </div>

      <p
        id="moneyOverviewMessage"
        class="form-message">
      </p>

    </div>
  `;

  document.body.appendChild(dialog);

  $("closeMoneyOverview").addEventListener(
    "click",
    () => dialog.close()
  );
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginAdmin(
  username,
  password
) {

  const cleanUsername =
    username.trim().toLowerCase();

  const adminCollection =
    collection(
      db,
      "admin"
    );

  const q = query(
    adminCollection,

    where(
      "usuario",
      "==",
      cleanUsername
    ),

    where(
      "contraseña",
      "==",
      password
    )
  );

  const snapshot =
    await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const adminDoc =
    snapshot.docs[0];

  const data =
    adminDoc.data();

  if (data.activo === false) {
    return null;
  }

  return {
    id: adminDoc.id,

    usuario:
      data.usuario ||
      cleanUsername,

    nombre:
      data.nombre ||
      data.usuario ||
      cleanUsername,

    canReset:
      data.canReset === true
  };
}


/* =========================================================
   SESIÓN
   ========================================================= */

function isAdmin() {
  return currentAdmin !== null;
}

function canResetMoney() {

  if (!currentAdmin) {
    return false;
  }

  const name =
    String(
      currentAdmin.nombre || ""
    )
      .trim()
      .toLowerCase();

  return (
    name === "carlos" ||
    currentAdmin.canReset === true
  );
}

function saveSession() {

  if (!currentAdmin) {

    localStorage.removeItem(
      "rankingAdmin"
    );

    return;
  }

  localStorage.setItem(
    "rankingAdmin",
    JSON.stringify(
      currentAdmin
    )
  );
}

function loadSession() {

  try {

    const saved =
      localStorage.getItem(
        "rankingAdmin"
      );

    if (!saved) {
      return;
    }

    const admin =
      JSON.parse(saved);

    if (
      admin &&
      admin.usuario
    ) {

      currentAdmin =
        admin;
    }

  } catch (error) {

    console.error(
      "Error cargando sesión:",
      error
    );

    currentAdmin = null;
  }
}


/* =========================================================
   INTERFAZ DE SESIÓN
   ========================================================= */

function updateSessionUI() {

  if (!els.sessionArea) {
    return;
  }

  const moneyButton =
    $("moneyOverviewBtn");

  if (!currentAdmin) {

    els.sessionArea.innerHTML =
      "";

    if (els.carlosResetBtn) {

      els.carlosResetBtn
        .classList
        .add("hidden");
    }

    if (moneyButton) {

      moneyButton
        .classList
        .add("hidden");
    }

    if (els.statusPill) {

      els.statusPill.textContent =
        "Solo lectura";
    }

    return;
  }

  const name =
    currentAdmin.nombre ||
    currentAdmin.usuario;

  els.sessionArea.innerHTML = `

    <div class="session-chip">

      <span>
        ${escapeHtml(name)}
      </span>

      <button
        id="logoutBtn"
        type="button">
        Salir
      </button>

    </div>
  `;

  const logoutBtn =
    $("logoutBtn");

  if (logoutBtn) {

    logoutBtn.addEventListener(
      "click",
      logout
    );
  }

  if (els.carlosResetBtn) {

    els.carlosResetBtn
      .classList
      .toggle(
        "hidden",
        !canResetMoney()
      );
  }

  if (moneyButton) {

    moneyButton
      .classList
      .remove("hidden");
  }

  if (els.statusPill) {

    els.statusPill.textContent =
      "Administrador";
  }
}

function logout() {

  currentAdmin = null;

  localStorage.removeItem(
    "rankingAdmin"
  );

  updateSessionUI();

  renderAllRankings();
}


/* =========================================================
   RANKINGS
   ========================================================= */

function subscribeAllRankings() {

  unsubscribeRankings
    .forEach(
      unsubscribe => {

        try {
          unsubscribe();
        } catch (_) {}

      }
    );

  unsubscribeRankings = [];

  subscribeNormalRanking(
    "20 Bolsas",
    0
  );

  subscribeNormalRanking(
    "16 Bolsas",
    1
  );

  subscribeNormalRanking(
    "12 Bolsas",
    2
  );

  subscribe68Ranking();
}


function subscribeNormalRanking(
  tableName,
  tableIndex
) {

  const body =
    rankingBodies[tableIndex];

  if (!body) {
    return;
  }

  body.innerHTML = `

    <tr>
      <td
        colspan="2"
        class="empty">
        Cargando…
      </td>
    </tr>
  `;

  const peopleRef =
    collection(
      db,
      "tables",
      tableName,
      "people"
    );

  const unsubscribe =
    onSnapshot(

      peopleRef,

      snapshot => {

        rankingPeople[tableIndex] =
          snapshot.docs.map(
            document => ({

              id: document.id,

              tableName,

              ...document.data()

            })
          );

        rankingPeople[tableIndex]
          .sort(sortByMoney);

        renderRanking(
          tableIndex
        );
      },

      error => {

        console.error(
          `Error en ${tableName}:`,
          error
        );

        body.innerHTML = `

          <tr>
            <td
              colspan="2"
              class="empty">
              No se pudo cargar.
            </td>
          </tr>
        `;
      }
    );

  unsubscribeRankings.push(
    unsubscribe
  );
}


/* =========================================================
   GRUPO 6 / 8
   ========================================================= */

function subscribe68Ranking() {

  const body =
    $("rankingBody68");

  if (!body) {
    return;
  }

  body.innerHTML = `

    <tr>
      <td
        colspan="2"
        class="empty">
        Cargando…
      </td>
    </tr>
  `;

  const sources = [
    "6_8",
    "6 Bolsas",
    "8 Bolsas"
  ];

  const sourceData = {
    "6_8": [],
    "6 Bolsas": [],
    "8 Bolsas": []
  };

  sources.forEach(
    sourceName => {

      const peopleRef =
        collection(
          db,
          "tables",
          sourceName,
          "people"
        );

      const unsubscribe =
        onSnapshot(

          peopleRef,

          snapshot => {

            sourceData[sourceName] =
              snapshot.docs.map(
                document => ({

                  id:
                    document.id,

                  tableName:
                    sourceName,

                  ...document.data()

                })
              );

            const merged = [

              ...sourceData["6_8"],

              ...sourceData["6 Bolsas"],

              ...sourceData["8 Bolsas"]

            ];

            merged.sort(
              sortByMoney
            );

            rankingPeople[3] =
              merged;

            renderRanking(3);
          },

          error => {

            console.error(
              `Error en grupo 6 / 8 (${sourceName}):`,
              error
            );
          }
        );

      unsubscribeRankings.push(
        unsubscribe
      );
    }
  );
}


/* =========================================================
   RENDER RANKING
   ========================================================= */

function renderRanking(
  tableIndex
) {

  const body =
    rankingBodies[tableIndex];

  if (!body) {
    return;
  }

  const people =
    rankingPeople[tableIndex] || [];

  body.innerHTML = "";

  if (!people.length) {

    body.innerHTML = `

      <tr>
        <td
          colspan="2"
          class="empty">
          Todavía no hay personas.
        </td>
      </tr>
    `;

  } else {

    people.forEach(
      (
        person,
        index
      ) => {

        if (!els.rowTemplate) {
          return;
        }

        const fragment =
          document.importNode(
            els.rowTemplate.content,
            true
          );

        const positionCell =
          fragment.querySelector(
            ".position-cell"
          );

        const nameElement =
          fragment.querySelector(
            ".person-name"
          );

        const image =
          fragment.querySelector(
            ".avatar"
          );

        const fallback =
          fragment.querySelector(
            ".avatar-fallback"
          );

        const addButton =
          fragment.querySelector(
            ".add-money-btn"
          );

        if (positionCell) {

          positionCell.textContent =
            `#${index + 1}`;
        }

        if (nameElement) {

          nameElement.textContent =
            person.name ||
            "Sin nombre";
        }

        if (
          image &&
          fallback
        ) {

          if (person.photoURL) {

            image.src =
              person.photoURL;

            image.alt =
              person.name ||
              "Foto";

            image.hidden =
              false;

            fallback.hidden =
              true;

          } else {

            image.hidden =
              true;

            fallback.hidden =
              false;
          }
        }

        if (addButton) {

          addButton.classList.toggle(
            "hidden",
            !isAdmin()
          );

          addButton.addEventListener(
            "click",
            () => {

              openMoneyDialog(
                person,
                tableIndex
              );
            }
          );
        }

        body.appendChild(
          fragment
        );
      }
    );
  }

  if (isAdmin()) {

    const addRow =
      document.createElement(
        "tr"
      );

    addRow.innerHTML = `

      <td colspan="2">

        <button
          class="primary-btn"
          type="button">
          + Añadir persona
        </button>

      </td>
    `;

    const button =
      addRow.querySelector(
        "button"
      );

    button.addEventListener(
      "click",
      () => {

        openAddPersonDialog(
          tableIndex
        );
      }
    );

    body.appendChild(
      addRow
    );
  }
}

function renderAllRankings() {

  renderRanking(0);
  renderRanking(1);
  renderRanking(2);
  renderRanking(3);
}


/* =========================================================
   AÑADIR PERSONA
   ========================================================= */

function openAddPersonDialog(
  tableIndex
) {

  if (!isAdmin()) {
    return;
  }

  currentAddPersonTable =
    tableIndex;

  showError(
    els.addPersonMessage,
    ""
  );

  if (els.personName) {
    els.personName.value = "";
  }

  if (els.initialMoney) {
    els.initialMoney.value = "0";
  }

  if (els.personPhoto) {
    els.personPhoto.value = "";
  }

  if (
    els.addPersonDialog &&
    typeof els.addPersonDialog.showModal ===
      "function"
  ) {

    els.addPersonDialog.showModal();
  }
}


/* =========================================================
   SUBIR FOTO
   ========================================================= */

async function uploadPersonPhoto(
  collectionName,
  personId,
  file
) {

  if (!file) {
    return "";
  }

  if (
    file.size >
    5 * 1024 * 1024
  ) {

    throw new Error(
      "La foto no puede superar 5 MB."
    );
  }

  if (
    !file.type ||
    !file.type.startsWith("image/")
  ) {

    throw new Error(
      "El archivo seleccionado no es una imagen."
    );
  }

  const safeName =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

  const photoRef =
    ref(
      storage,
      `people/${collectionName}/${personId}/${Date.now()}_${safeName}`
    );

  await uploadBytes(
    photoRef,
    file
  );

  return await getDownloadURL(
    photoRef
  );
}


/* =========================================================
   AÑADIR PERSONA
   ========================================================= */

if (els.addPersonForm) {

  els.addPersonForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      showError(
        els.addPersonMessage,
        ""
      );

      if (!isAdmin()) {

        showError(
          els.addPersonMessage,
          "No tienes permisos de administrador."
        );

        return;
      }

      if (
        currentAddPersonTable === null
      ) {

        showError(
          els.addPersonMessage,
          "No se ha seleccionado un ranking."
        );

        return;
      }

      const name =
        els.personName?.value.trim() ||
        "";

      const money =
        Number(
          els.initialMoney?.value
        );

      const file =
        els.personPhoto
          ?.files?.[0];

      if (!name) {

        showError(
          els.addPersonMessage,
          "Escribe un nombre."
        );

        return;
      }

      if (
        !Number.isFinite(money) ||
        money < 0
      ) {

        showError(
          els.addPersonMessage,
          "El dinero no puede ser negativo."
        );

        return;
      }

      try {

        const collectionName =
          currentAddPersonTable === 3
            ? "6_8"
            : TABLES[
                currentAddPersonTable
              ];

        const peopleRef =
          collection(
            db,
            "tables",
            collectionName,
            "people"
          );

        const newPersonRef =
          doc(peopleRef);

        let photoURL = "";

        if (file) {

          photoURL =
            await uploadPersonPhoto(
              collectionName,
              newPersonRef.id,
              file
            );
        }

        await setDoc(
          newPersonRef,
          {
            name,
            money,
            photoURL,
            createdAt:
              serverTimestamp(),
            updatedAt:
              serverTimestamp()
          }
        );

        if (
          els.addPersonDialog &&
          els.addPersonDialog.open
        ) {

          els.addPersonDialog.close();
        }

        currentAddPersonTable =
          null;

      } catch (error) {

        console.error(
          "Error añadiendo persona:",
          error
        );

        showError(
          els.addPersonMessage,
          firebaseErrorMessage(error)
        );
      }
    }
  );
}


/* =========================================================
   AÑADIR DINERO
   ========================================================= */

function openMoneyDialog(
  person,
  tableIndex
) {

  if (!isAdmin()) {
    return;
  }

  currentMoneyPerson =
    person;

  currentMoneyTable =
    tableIndex;

  currentMoneyCollection =
    person.tableName ||
    (
      tableIndex === 3
        ? "6_8"
        : TABLES[tableIndex]
    );

  if (els.moneyTitle) {

    els.moneyTitle.textContent =
      `Añadir dinero a ${
        person.name || "esta persona"
      }`;
  }

  if (els.moneyAmount) {
    els.moneyAmount.value = "";
  }

  showError(
    els.moneyMessage,
    ""
  );

  addEditButtonToMoneyDialog();

  if (
    els.moneyDialog &&
    typeof els.moneyDialog.showModal ===
      "function"
  ) {

    els.moneyDialog.showModal();
  }
}


function addEditButtonToMoneyDialog() {

  if (!els.moneyForm) {
    return;
  }

  let button =
    $("editPersonFromMoneyBtn");

  if (button) {
    return;
  }

  button =
    document.createElement("button");

  button.id =
    "editPersonFromMoneyBtn";

  button.type =
    "button";

  button.className =
    "secondary-btn";

  button.textContent =
    "Editar persona";

  els.moneyForm.insertBefore(
    button,
    els.moneyMessage
  );

  button.addEventListener(
    "click",
    () => {

      openEditPersonDialog();

    }
  );
}


/* =========================================================
   EDITAR PERSONA
   ========================================================= */

function openEditPersonDialog() {

  if (
    !isAdmin() ||
    !currentMoneyPerson
  ) {

    return;
  }

  createEditDialog();

  currentEditPerson =
    currentMoneyPerson;

  currentEditCollection =
    currentMoneyCollection;

  $("editPersonName").value =
    currentEditPerson.name || "";

  $("editPersonPhoto").value =
    "";

  showError(
    $("editPersonMessage"),
    ""
  );

  $("editPersonDialog").showModal();
}


async function saveEditedPerson(
  event
) {

  event.preventDefault();

  if (
    !isAdmin() ||
    !currentEditPerson ||
    !currentEditCollection
  ) {

    return;
  }

  const name =
    $("editPersonName")
      .value
      .trim();

  const file =
    $("editPersonPhoto")
      .files?.[0];

  const message =
    $("editPersonMessage");

  const saveButton =
    $("saveEditPerson");

  if (!name) {

    showError(
      message,
      "Escribe un nombre."
    );

    return;
  }

  saveButton.disabled =
    true;

  saveButton.textContent =
    "Guardando…";

  try {

    let photoURL =
      currentEditPerson.photoURL ||
      "";

    if (file) {

      photoURL =
        await uploadPersonPhoto(
          currentEditCollection,
          currentEditPerson.id,
          file
        );
    }

    await updateDoc(

      doc(
        db,
        "tables",
        currentEditCollection,
        "people",
        currentEditPerson.id
      ),

      {
        name,
        photoURL,
        updatedAt:
          serverTimestamp()
      }
    );

    currentEditPerson.name =
      name;

    currentEditPerson.photoURL =
      photoURL;

    $("editPersonDialog").close();

  } catch (error) {

    console.error(
      "Error editando persona:",
      error
    );

    showError(
      message,
      firebaseErrorMessage(error)
    );

  } finally {

    saveButton.disabled =
      false;

    saveButton.textContent =
      "Guardar cambios";
  }
}


/* =========================================================
   DINERO DE TODO EL MUNDO
   ========================================================= */

async function openMoneyOverview() {

  if (!isAdmin()) {
    return;
  }

  createMoneyOverviewDialog();

  const dialog =
    $("moneyOverviewDialog");

  dialog.showModal();

  const body =
    $("moneyOverviewBody");

  const totalElement =
    $("moneyOverviewTotal");

  const message =
    $("moneyOverviewMessage");

  body.innerHTML = `

    <tr>
      <td
        colspan="4"
        class="empty">
        Cargando…
      </td>
    </tr>
  `;

  showError(
    message,
    ""
  );

  try {

    const results =
      await Promise.all(

        ALL_COLLECTIONS.map(
          async collectionName => {

            const peopleRef =
              collection(
                db,
                "tables",
                collectionName,
                "people"
              );

            const snapshot =
              await getDocs(
                peopleRef
              );

            return snapshot.docs.map(
              personDoc => ({

                id:
                  personDoc.id,

                collectionName,

                ...personDoc.data()

              })
            );
          }
        )
      );

    const everyone =
      results
        .flat()
        .sort(sortByMoney);

    const total =
      everyone.reduce(
        (sum, person) =>
          sum +
          Number(
            person.money || 0
          ),
        0
      );

    totalElement.textContent =
      formatMoney(total);

    body.innerHTML = "";

    if (!everyone.length) {

      body.innerHTML = `

        <tr>
          <td
            colspan="4"
            class="empty">
            No hay personas.
          </td>
        </tr>
      `;

      return;
    }

    everyone.forEach(
      (
        person,
        index
      ) => {

        const row =
          document.createElement(
            "tr"
          );

        row.innerHTML = `

          <td>
            #${index + 1}
          </td>

          <td>
            ${escapeHtml(
              person.name ||
              "Sin nombre"
            )}
          </td>

          <td>
            ${escapeHtml(
              displayGroupName(
                person.collectionName
              )
            )}
          </td>

          <td class="money-value">
            ${formatMoney(
              person.money
            )}
          </td>
        `;

        body.appendChild(
          row
        );
      }
    );

  } catch (error) {

    console.error(
      "Error mostrando dinero:",
      error
    );

    body.innerHTML = `

      <tr>
        <td
          colspan="4"
          class="empty">
          No se pudo cargar el dinero.
        </td>
      </tr>
    `;

    showError(
      message,
      firebaseErrorMessage(error)
    );
  }
}


/* =========================================================
   LOGIN HOTSPOT
   ========================================================= */

if (els.loginHotspot) {

  els.loginHotspot.addEventListener(
    "click",
    () => {

      if (isAdmin()) {
        return;
      }

      showError(
        els.authMessage,
        ""
      );

      if (els.username) {
        els.username.value = "";
      }

      if (els.password) {
        els.password.value = "";
      }

      if (
        els.authDialog &&
        typeof els.authDialog.showModal ===
          "function"
      ) {

        els.authDialog.showModal();
      }
    }
  );
}


/* =========================================================
   CERRAR LOGIN
   ========================================================= */

if (els.closeAuth) {

  els.closeAuth.addEventListener(
    "click",
    () => {

      if (
        els.authDialog &&
        els.authDialog.open
      ) {

        els.authDialog.close();
      }
    }
  );
}


/* =========================================================
   CERRAR AÑADIR PERSONA
   ========================================================= */

if (els.closeAddPerson) {

  els.closeAddPerson.addEventListener(
    "click",
    () => {

      if (
        els.addPersonDialog &&
        els.addPersonDialog.open
      ) {

        els.addPersonDialog.close();
      }
    }
  );
}


/* =========================================================
   CERRAR DINERO
   ========================================================= */

if (els.closeMoney) {

  els.closeMoney.addEventListener(
    "click",
    () => {

      if (
        els.moneyDialog &&
        els.moneyDialog.open
      ) {

        els.moneyDialog.close();
      }

      currentMoneyPerson = null;
      currentMoneyTable = null;
      currentMoneyCollection = null;
    }
  );
}


/* =========================================================
   FORMULARIO LOGIN
   ========================================================= */

if (els.authForm) {

  els.authForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      showError(
        els.authMessage,
        ""
      );

      const username =
        els.username?.value.trim() ||
        "";

      const password =
        els.password?.value ||
        "";

      if (!username) {

        showError(
          els.authMessage,
          "Introduce el usuario."
        );

        return;
      }

      if (!password) {

        showError(
          els.authMessage,
          "Introduce la contraseña."
        );

        return;
      }

      els.authSubmit.disabled =
        true;

      els.authSubmit.textContent =
        "Comprobando…";

      try {

        const admin =
          await loginAdmin(
            username,
            password
          );

        if (!admin) {

          throw new Error(
            "Usuario o contraseña incorrectos, o la cuenta no está autorizada."
          );
        }

        currentAdmin =
          admin;

        saveSession();

        updateSessionUI();

        renderAllRankings();

        if (
          els.authDialog &&
          els.authDialog.open
        ) {

          els.authDialog.close();
        }

        els.authForm.reset();

      } catch (error) {

        console.error(
          error
        );

        showError(
          els.authMessage,
          error.message ||
          "No se pudo iniciar sesión."
        );

      } finally {

        els.authSubmit.disabled =
          false;

        els.authSubmit.textContent =
          "Entrar";
      }
    }
  );
}


/* =========================================================
   FORMULARIO DINERO
   ========================================================= */

if (els.moneyForm) {

  els.moneyForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      showError(
        els.moneyMessage,
        ""
      );

      if (
        !isAdmin() ||
        !currentMoneyPerson ||
        currentMoneyTable === null
      ) {

        showError(
          els.moneyMessage,
          "No tienes permisos de administrador."
        );

        return;
      }

      const amount =
        Number(
          els.moneyAmount?.value
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        showError(
          els.moneyMessage,
          "Introduce una cantidad mayor que 0."
        );

        return;
      }

      try {

        await updateDoc(

          doc(
            db,
            "tables",
            currentMoneyCollection,
            "people",
            currentMoneyPerson.id
          ),

          {
            money:
              increment(amount),

            updatedAt:
              serverTimestamp()
          }
        );

        if (
          els.moneyDialog &&
          els.moneyDialog.open
        ) {

          els.moneyDialog.close();
        }

        currentMoneyPerson = null;
        currentMoneyTable = null;
        currentMoneyCollection = null;

      } catch (error) {

        console.error(
          error
        );

        showError(
          els.moneyMessage,
          firebaseErrorMessage(error)
        );
      }
    }
  );
}


/* =========================================================
   RESET DINERO
   ========================================================= */

if (els.carlosResetBtn) {

  els.carlosResetBtn.addEventListener(
    "click",
    async () => {

      if (
        !isAdmin() ||
        !canResetMoney()
      ) {

        return;
      }

      const ok =
        confirm(
          "Esto pondrá el dinero de TODAS las personas de TODOS los grupos a 0. Los nombres y fotos se conservarán. ¿Continuar?"
        );

      if (!ok) {
        return;
      }

      try {

        for (
          const collectionName
          of ALL_COLLECTIONS
        ) {

          const peopleRef =
            collection(
              db,
              "tables",
              collectionName,
              "people"
            );

          const snapshot =
            await getDocs(
              peopleRef
            );

          if (snapshot.empty) {
            continue;
          }

          const batch =
            writeBatch(db);

          snapshot.forEach(
            personDoc => {

              batch.update(
                personDoc.ref,
                {
                  money: 0,
                  updatedAt:
                    serverTimestamp()
                }
              );
            }
          );

          await batch.commit();
        }

        alert(
          "Dinero reseteado correctamente."
        );

      } catch (error) {

        console.error(
          error
        );

        alert(
          firebaseErrorMessage(error)
        );
      }
    }
  );
}


/* =========================================================
   INICIO
   ========================================================= */

createMoneyButton();

createEditDialog();

createMoneyOverviewDialog();

loadSession();

updateSessionUI();

subscribeAllRankings();