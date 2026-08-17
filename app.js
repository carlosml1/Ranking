import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
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
   CONFIGURACIÓN
========================================================= */

const TABLES = [
  "20 Bolsas",
  "16 Bolsas",
  "12 Bolsas",
  "8 Bolsas",
  "6 Bolsas"
];

let currentTable = 0;

let currentPeople = [];

let currentMoneyPerson = null;

let unsubscribeRanking = null;

/*
  Administrador actualmente conectado.
*/
let currentAdmin = null;


/* =========================================================
   ELEMENTOS HTML
========================================================= */

const $ = id => document.getElementById(id);

const els = {

  loginHotspot:
    $("loginHotspot"),

  authDialog:
    $("authDialog"),

  authForm:
    $("authForm"),

  closeAuth:
    $("closeAuth"),

  authSubmit:
    $("authSubmit"),

  authMessage:
    $("authMessage"),

  username:
    $("username"),

  password:
    $("password"),

  sessionArea:
    $("sessionArea"),

  carlosResetBtn:
    $("carlosResetBtn"),

  tableTitle:
    $("tableTitle"),

  tableIndicator:
    $("tableIndicator"),

  rankingBody:
    $("rankingBody"),

  prevTable:
    $("prevTable"),

  nextTable:
    $("nextTable"),

  prevTableMobile:
    $("prevTableMobile"),

  nextTableMobile:
    $("nextTableMobile"),

  statusPill:
    $("statusPill"),

  addPersonDialog:
    $("addPersonDialog"),

  addPersonForm:
    $("addPersonForm"),

  closeAddPerson:
    $("closeAddPerson"),

  personName:
    $("personName"),

  initialMoney:
    $("initialMoney"),

  personPhoto:
    $("personPhoto"),

  addPersonMessage:
    $("addPersonMessage"),

  moneyDialog:
    $("moneyDialog"),

  moneyForm:
    $("moneyForm"),

  closeMoney:
    $("closeMoney"),

  moneyTitle:
    $("moneyTitle"),

  moneyAmount:
    $("moneyAmount"),

  moneyMessage:
    $("moneyMessage")
};

/* =========================================================
   MENSAJES
========================================================= */

function showError(element, message) {

  if (element) {
    element.textContent = message || "";
  }

}


/* =========================================================
   ADMINISTRADORES
========================================================= */

/*
  Busca el usuario en:

  Firestore
  └── admin
      └── documento
          ├── usuario
          └── contraseña

  NO utiliza Firebase Authentication.
*/

async function loginAdmin(username, password) {

  const cleanUsername =
    username.trim().toLowerCase();

  const adminCollection =
    collection(db, "admin");

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

  /*
    Cogemos el primer administrador
    que coincida.
  */

  const adminDoc =
    snapshot.docs[0];

  const data =
    adminDoc.data();

  /*
    Si existe el campo activo
    y está puesto en false,
    no permitimos entrar.
  */

  if (data.activo === false) {

    return null;

  }

  return {

    id:
      adminDoc.id,

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
   COMPROBAR ADMIN
========================================================= */

function isAdmin() {

  return currentAdmin !== null;

}


/*
  Carlos puede resetear el dinero si:

  - Su nombre es Carlos

  O

  - Tiene canReset: true
*/

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


/* =========================================================
   SESIÓN LOCAL
========================================================= */

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

    localStorage.removeItem(
      "rankingAdmin"
    );

  }

}


/* =========================================================
   CERRAR SESIÓN
========================================================= */

function logout() {

  currentAdmin = null;

  localStorage.removeItem(
    "rankingAdmin"
  );

  updateSessionUI();

  renderRanking();

}


/* =========================================================
   INTERFAZ DE SESIÓN
========================================================= */

function updateSessionUI() {

  if (!currentAdmin) {

    els.sessionArea.innerHTML = "";

    els.carlosResetBtn
      .classList
      .add("hidden");

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

  els.carlosResetBtn
    .classList
    .toggle(
      "hidden",
      !canResetMoney()
    );

  if (els.statusPill) {
    els.statusPill.textContent =
      "Administrador";
  }

}

/* =========================================================
   CAMBIAR DE TABLA
========================================================= */

function setTable(index) {

  currentTable =
    (index + TABLES.length) %
    TABLES.length;

  els.tableTitle.textContent =
    TABLES[currentTable];

  els.tableIndicator.textContent =
    `${currentTable + 1} / ${TABLES.length}`;

  subscribeRanking();

}


/* =========================================================
   CARGAR RANKING
========================================================= */

function subscribeRanking() {

  if (unsubscribeRanking) {

    unsubscribeRanking();

    unsubscribeRanking = null;

  }

  els.rankingBody.innerHTML = `

    <tr>

      <td
        colspan="2"
        class="empty">

        Cargando ranking…

      </td>

    </tr>

  `;

  const peopleRef =
    collection(
      db,
      "tables",
      TABLES[currentTable],
      "people"
    );

  const q =
    query(
      peopleRef,
      orderBy(
        "money",
        "desc"
      )
    );

  unsubscribeRanking =
    onSnapshot(

      q,

      snapshot => {

        currentPeople =
          snapshot.docs.map(
            document => ({

              id:
                document.id,

              ...document.data()

            })
          );

        renderRanking();

      },

      error => {

        console.error(
          "Error Firestore:",
          error
        );

        if (els.statusPill) {
          els.statusPill.textContent =
            "Error de conexión";
        }

        els.rankingBody.innerHTML = `

          <tr>

            <td
              colspan="2"
              class="empty">

              No se pudo cargar esta tabla.
              Revisa Firestore y sus reglas.

            </td>

          </tr>

        `;

      }

    );

}


/* =========================================================
   MOSTRAR RANKING
========================================================= */

function renderRanking() {

  els.rankingBody.innerHTML = "";

  if (!currentPeople.length) {

    els.rankingBody.innerHTML = `

      <tr>

        <td
          colspan="2"
          class="empty">

          Todavía no hay personas
          en esta tabla.

        </td>

      </tr>

    `;

  } else {

    currentPeople.forEach(
      (person, index) => {

        const tr =
          document.importNode(
            $("rowTemplate")
              .content,
            true
          );

        /*
          POSICIÓN
        */

        tr.querySelector(
          ".position-cell"
        ).textContent =
          `#${index + 1}`;

        /*
          NOMBRE
        */

        tr.querySelector(
          ".person-name"
        ).textContent =
          person.name ||
          "Sin nombre";

        /*
          FOTO
        */

        const img =
          tr.querySelector(
            ".avatar"
          );

        const fallback =
          tr.querySelector(
            ".avatar-fallback"
          );

        if (person.photoURL) {

          img.src =
            person.photoURL;

          img.hidden =
            false;

          fallback.hidden =
            true;

        }

        /*
          BOTÓN +
        */

        const addBtn =
          tr.querySelector(
            ".add-money-btn"
          );

        addBtn.classList.toggle(
          "hidden",
          !isAdmin()
        );

        addBtn.addEventListener(
          "click",
          () => {

            openMoneyDialog(
              person
            );

          }
        );

        els.rankingBody.appendChild(
          tr
        );

      }
    );

  }


  /*
    BOTÓN AÑADIR PERSONA
  */

  if (isAdmin()) {

    const addRow =
      document.createElement(
        "tr"
      );

    addRow.innerHTML = `

      <td colspan="2">

        <button
          id="addPersonBtn"
          class="primary-btn"
          type="button">

          + Añadir persona

        </button>

      </td>

    `;

    addRow
      .querySelector(
        "button"
      )
      .addEventListener(
        "click",
        openAddPersonDialog
      );

    els.rankingBody.appendChild(
      addRow
    );

  }

  els.statusPill.textContent =
    isAdmin()
      ? "Administrador"
      : "Solo lectura";

}


/* =========================================================
   AÑADIR PERSONA
========================================================= */

function openAddPersonDialog() {

  if (!isAdmin()) {

    return;

  }

  showError(
    els.addPersonMessage,
    ""
  );

  els.personName.value =
    "";

  els.initialMoney.value =
    "0";

  els.personPhoto.value =
    "";

  els.addPersonDialog.showModal();

}


/* =========================================================
   AÑADIR DINERO
========================================================= */

function openMoneyDialog(person) {

  if (!isAdmin()) {

    return;

  }

  currentMoneyPerson =
    person;

  els.moneyTitle.textContent =
    `Añadir dinero a ${person.name}`;

  els.moneyAmount.value =
    "";

  els.moneyMessage.textContent =
    "";

  els.moneyDialog.showModal();

}


/* =========================================================
   ABRIR LOGIN
========================================================= */

els.loginHotspot.addEventListener(
  "click",
  () => {

    if (isAdmin()) {

      return;

    }

    els.authMessage.textContent =
      "";

    els.username.value =
      "";

    els.password.value =
      "";

    els.authDialog.showModal();

  }
);


/* =========================================================
   CERRAR LOGIN
========================================================= */

els.closeAuth.addEventListener(
  "click",
  () => {

    els.authDialog.close();

  }
);


/* =========================================================
   CERRAR AÑADIR PERSONA
========================================================= */

els.closeAddPerson.addEventListener(
  "click",
  () => {

    els.addPersonDialog.close();

  }
);


/* =========================================================
   CERRAR DINERO
========================================================= */

els.closeMoney.addEventListener(
  "click",
  () => {

    els.moneyDialog.close();

  }
);


/* =========================================================
   LOGIN
========================================================= */

els.authForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    showError(
      els.authMessage,
      ""
    );

    const username =
      els.username.value.trim();

    const password =
      els.password.value;

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

      renderRanking();

      els.authDialog.close();

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


/* =========================================================
   AÑADIR DINERO
========================================================= */

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
      !currentMoneyPerson
    ) {

      showError(
        els.moneyMessage,
        "No tienes permisos de administrador."
      );

      return;

    }

    const amount =
      Number(
        els.moneyAmount.value
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
          TABLES[currentTable],
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

      els.moneyDialog.close();

      currentMoneyPerson =
        null;

    } catch (error) {

      console.error(
        error
      );

      showError(
        els.moneyMessage,
        firebaseErrorMessage(
          error
        )
      );

    }

  }
);


/* =========================================================
   AÑADIR PERSONA
========================================================= */

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

    const name =
      els.personName.value.trim();

    const money =
      Number(
        els.initialMoney.value
      );

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

      let photoURL =
        "";

      const file =
        els.personPhoto
          .files?.[0];

      const peopleRef =
        collection(
          db,
          "tables",
          TABLES[currentTable],
          "people"
        );

      /*
        Generamos un documento para tener
        un ID único para la foto.
      */

      const newPersonRef =
        doc(peopleRef);

      /*
        SUBIR FOTO
      */

      if (file) {

        if (
          file.size >
          5 * 1024 * 1024
        ) {

          throw new Error(
            "La foto no puede superar 5 MB."
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
            `people/${newPersonRef.id}/${Date.now()}_${safeName}`
          );

        await uploadBytes(
          photoRef,
          file
        );

        photoURL =
          await getDownloadURL(
            photoRef
          );

      }

      /*
        Guardar la persona usando
        el mismo ID utilizado para la foto.
      */

      await updateDoc(
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
      ).catch(async () => {

        /*
          Si el documento todavía no existe,
          utilizamos addDoc como respaldo.
        */

        await addDoc(
          peopleRef,
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

      });

      els.addPersonDialog.close();

    } catch (error) {

      console.error(
        error
      );

      showError(
        els.addPersonMessage,
        firebaseErrorMessage(
          error
        )
      );

    }

  }
);


/* =========================================================
   RESET DE DINERO
========================================================= */

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
        "Esto pondrá el dinero de TODAS las personas de TODAS las tablas a 0. Los nombres y fotos se conservarán. ¿Continuar?"
      );

    if (!ok) {

      return;

    }

    try {

      for (
        const table
        of TABLES
      ) {

        const peopleRef =
          collection(
            db,
            "tables",
            table,
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
        "Dinero reseteado correctamente. Los nombres y fotos no se han modificado."
      );

    } catch (error) {

      console.error(
        error
      );

      alert(
        firebaseErrorMessage(
          error
        )
      );

    }

  }
);


/* =========================================================
   NAVEGACIÓN ENTRE TABLAS
========================================================= */

els.prevTable.addEventListener(
  "click",
  () => {

    setTable(
      currentTable - 1
    );

  }
);


els.nextTable.addEventListener(
  "click",
  () => {

    setTable(
      currentTable + 1
    );

  }
);


els.prevTableMobile.addEventListener(
  "click",
  () => {

    setTable(
      currentTable - 1
    );

  }
);


els.nextTableMobile.addEventListener(
  "click",
  () => {

    setTable(
      currentTable + 1
    );

  }
);


/* =========================================================
   ERRORES FIREBASE
========================================================= */

function firebaseErrorMessage(error) {

  const code =
    error?.code || "";

  const map = {

    "permission-denied":
      "Firebase ha rechazado la operación por las reglas de Firestore.",

    "storage/unauthorized":
      "No tienes permisos para subir esta foto.",

    "storage/unauthenticated":
      "No tienes permiso para utilizar Storage.",

    "storage/quota-exceeded":
      "Se ha superado la cuota de almacenamiento."

  };

  return (
    map[code] ||
    error?.message ||
    "Ha ocurrido un error."
  );

}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHtml(value) {

  return String(value)
    .replace(
      /[&<>"']/g,

      character => ({

        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        '"':
          "&quot;",

        "'":
          "&#039;"

      }[character])

    );

}


/* =========================================================
   INICIO
========================================================= */

loadSession();

updateSessionUI();

setTable(0);