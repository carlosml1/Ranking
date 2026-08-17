console.log("Ranking de Bolsas - app.js v7");

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

  apiKey:
    "AIzaSyBJ2NFzLfXVlRbz8mL2bPNXyVMc4wZl_mk",

  authDomain:
    "fdsffsdf-a5398.firebaseapp.com",

  projectId:
    "fdsffsdf-a5398",

  storageBucket:
    "fdsffsdf-a5398.firebasestorage.app",

  messagingSenderId:
    "660514705234",

  appId:
    "1:660514705234:web:ebe445396a603a3c32f48b",

  measurementId:
    "G-DDW6LX4KFF"

};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const storage = getStorage(app);


/* =========================================================
   GRUPOS
   ========================================================= */

const TABLES = [
  "20 Bolsas",
  "16 Bolsas",
  "12 Bolsas",
  "6 / 8"
];


/*
  Conservamos las colecciones antiguas para que
  las personas que ya existían en 6 y 8 no desaparezcan.
*/

const LEGACY_68_TABLES = [
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

let unsubscribeRankings = [];


/* =========================================================
   ELEMENTOS HTML
   ========================================================= */

const $ = id =>
  document.getElementById(id);


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
    $("moneyMessage"),

  rowTemplate:
    $("rowTemplate")

};


/* =========================================================
   TABLAS
   =========================================================

   0 = 20
   1 = 16
   2 = 12
   3 = 6 / 8

   El orden visual del HTML es:

   6 / 8
   12
   16
   20

   Pero internamente mantenemos los índices originales
   para no romper los datos de Firebase.
   ========================================================= */

const rankingBodies = [

  $("rankingBody0"),   // 20

  $("rankingBody1"),   // 16

  $("rankingBody2"),   // 12

  $("rankingBody68")   // 6 / 8

];


const rankingPeople = [

  [],

  [],

  [],

  []

];


/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      character => {

        const map = {

          "&": "&amp;",

          "<": "&lt;",

          ">": "&gt;",

          '"': "&quot;",

          "'": "&#039;"

        };

        return map[character];

      }
    );

}


/* =========================================================
   MENSAJES
   ========================================================= */

function showError(
  element,
  message
) {

  if (!element) {
    return;
  }

  element.textContent =
    message || "";

}


/* =========================================================
   ERRORES FIREBASE
   ========================================================= */

function firebaseErrorMessage(error) {

  const code =
    error?.code || "";


  const messages = {

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
    messages[code] ||
    error?.message ||
    "Ha ocurrido un error."
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
    username
      .trim()
      .toLowerCase();


  const adminCollection =
    collection(
      db,
      "admin"
    );


  const q =
    query(

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


  if (
    data.activo === false
  ) {

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

    currentAdmin =
      null;

  }

}


/* =========================================================
   ACTUALIZAR SESIÓN
   ========================================================= */

function updateSessionUI() {

  if (!els.sessionArea) {
    return;
  }


  if (!currentAdmin) {

    els.sessionArea.innerHTML =
      "";


    if (els.carlosResetBtn) {

      els.carlosResetBtn
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


  if (els.statusPill) {

    els.statusPill.textContent =
      "Administrador";

  }

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  currentAdmin =
    null;


  localStorage.removeItem(
    "rankingAdmin"
  );


  updateSessionUI();

  renderAllRankings();

}


/* =========================================================
   SUSCRIBIR TODOS LOS RANKINGS
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


/* =========================================================
   RANKING NORMAL
   ========================================================= */

function subscribeNormalRanking(
  tableName,
  tableIndex
) {

  const body =
    rankingBodies[
      tableIndex
    ];


  if (!body) {

    console.warn(
      `No existe el cuerpo del ranking ${tableName}`
    );

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

        rankingPeople[
          tableIndex
        ] =
          snapshot.docs.map(
            document => ({

              id:
                document.id,

              tableName,

              ...document.data()

            })
          );


        rankingPeople[
          tableIndex
        ].sort(
          sortByMoney
        );


        renderRanking(
          tableIndex
        );

      },


      error => {

        console.error(
          `Error en ${tableName}:`,
          error
        );


        if (!body) {
          return;
        }


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

    console.error(
      "No existe #rankingBody68 en index.html"
    );

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


  /*
    El grupo 6 / 8 junta:

    - 6 / 8
    - 6 Bolsas
    - 8 Bolsas

    Todo aparece en UNA SOLA tabla.
  */

  const sources = [

    "6 / 8",

    "6 Bolsas",

    "8 Bolsas"

  ];


  const sourceData = {

    "6 / 8": [],

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

            sourceData[
              sourceName
            ] =
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

              ...sourceData["6 / 8"],

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
   ORDENAR POR DINERO
   ========================================================= */

function sortByMoney(
  a,
  b
) {

  const moneyA =
    Number(
      a?.money || 0
    );


  const moneyB =
    Number(
      b?.money || 0
    );


  return moneyB - moneyA;

}


/* =========================================================
   RENDER RANKING
   ========================================================= */

function renderRanking(
  tableIndex
) {

  const body =
    rankingBodies[
      tableIndex
    ];


  if (!body) {

    console.warn(
      "No existe el cuerpo del ranking:",
      tableIndex
    );

    return;

  }


  const people =
    rankingPeople[
      tableIndex
    ] || [];


  body.innerHTML =
    "";


  if (
    people.length === 0
  ) {

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


  /*
    Solo el administrador ve el botón.
  */

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


    if (button) {

      button.addEventListener(
        "click",
        () => {

          openAddPersonDialog(
            tableIndex
          );

        }
      );

    }


    body.appendChild(
      addRow
    );

  }

}


/* =========================================================
   RENDER TODO
   ========================================================= */

function renderAllRankings() {

  renderRanking(0);

  renderRanking(1);

  renderRanking(2);

  renderRanking(3);

}


/* =========================================================
   AÑADIR PERSONA - ABRIR
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

    els.personName.value =
      "";

  }


  if (els.initialMoney) {

    els.initialMoney.value =
      "0";

  }


  if (els.personPhoto) {

    els.personPhoto.value =
      "";

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
   AÑADIR DINERO - ABRIR
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


  /*
    Si la persona antigua viene de 6 u 8,
    actualizamos su colección original.

    Si es nueva, usamos 6 / 8.
  */

  currentMoneyCollection =
    person.tableName ||
    (
      tableIndex === 3
        ? "6 / 8"
        : TABLES[tableIndex]
    );


  if (els.moneyTitle) {

    els.moneyTitle.textContent =
      `Añadir dinero a ${
        person.name || "esta persona"
      }`;

  }


  if (els.moneyAmount) {

    els.moneyAmount.value =
      "";

  }


  showError(
    els.moneyMessage,
    ""
  );


  if (
    els.moneyDialog &&
    typeof els.moneyDialog.showModal ===
      "function"
  ) {

    els.moneyDialog.showModal();

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

        els.username.value =
          "";

      }


      if (els.password) {

        els.password.value =
          "";

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

    }
  );

}


/* =========================================================
   LOGIN
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


      if (els.authSubmit) {

        els.authSubmit.disabled =
          true;

        els.authSubmit.textContent =
          "Comprobando…";

      }


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

        if (els.authSubmit) {

          els.authSubmit.disabled =
            false;

          els.authSubmit.textContent =
            "Entrar";

        }

      }

    }
  );

}


/* =========================================================
   SUMAR DINERO
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

        const collectionName =
          currentMoneyCollection ||
          (
            currentMoneyTable === 3
              ? "6 / 8"
              : TABLES[currentMoneyTable]
          );


        await updateDoc(

          doc(
            db,
            "tables",
            collectionName,
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


        currentMoneyPerson =
          null;

        currentMoneyTable =
          null;

        currentMoneyCollection =
          null;


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

        /*
          Las personas nuevas del cuarto grupo
          se guardan en "6 / 8".
        */

        const collectionName =
          currentAddPersonTable === 3
            ? "6 / 8"
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


        let photoURL =
          "";


        const file =
          els.personPhoto
            ?.files?.[0];


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

              `people/${collectionName}/${newPersonRef.id}/${Date.now()}_${safeName}`

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

        const allCollections = [

          "20 Bolsas",

          "16 Bolsas",

          "12 Bolsas",

          "6 / 8",

          "6 Bolsas",

          "8 Bolsas"

        ];


        for (
          const tableName
          of allCollections
        ) {

          const peopleRef =
            collection(
              db,
              "tables",
              tableName,
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
   INICIAR
   ========================================================= */

loadSession();

updateSessionUI();

subscribeAllRankings();